import express from 'express';
import { body, query, validationResult } from 'express-validator';
import ApiKey from '../models/ApiKey.js';
import { protect, authenticateApiKey, requirePermission } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/api-keys
// @desc    Get user's API keys
// @access  Private
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const apiKeys = await ApiKey.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ApiKey.countDocuments({ userId: req.user.id });

    // Mask keys for security
    const maskedKeys = apiKeys.map(key => ({
      ...key.toObject(),
      key: key.getMaskedKey()
    }));

    res.json({
      success: true,
      data: {
        apiKeys: maskedKeys,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/api-keys
// @desc    Create new API key
// @access  Private
router.post('/', protect, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters'),
  body('permissions')
    .isArray({ min: 1 })
    .withMessage('At least one permission is required'),
  body('permissions.*')
    .isIn(['read', 'write', 'admin'])
    .withMessage('Invalid permission'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date'),
  body('ipWhitelist')
    .optional()
    .isArray()
    .withMessage('IP whitelist must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, permissions, expiresAt, ipWhitelist } = req.body;

    // Check if user has reached API key limit
    const existingKeys = await ApiKey.countDocuments({ userId: req.user.id });
    const maxKeys = req.user.plan === 'free' ? 2 : req.user.plan === 'starter' ? 5 : 10;
    
    if (existingKeys >= maxKeys) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum number of API keys (${maxKeys}) for your plan`
      });
    }

    const apiKey = await ApiKey.create({
      name,
      userId: req.user.id,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      ipWhitelist: ipWhitelist || []
    });

    logger.info(`API key created: ${name} for user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          key: apiKey.key, // Only show full key on creation
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt,
          ipWhitelist: apiKey.ipWhitelist,
          usage: apiKey.usage,
          createdAt: apiKey.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/api-keys/:id
// @desc    Get API key by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    res.json({
      success: true,
      data: {
        apiKey: {
          ...apiKey.toObject(),
          key: apiKey.getMaskedKey() // Always mask the key
        }
      }
    });
  } catch (error) {
    logger.error('Get API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/api-keys/:id
// @desc    Update API key
// @access  Private
router.put('/:id', protect, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters'),
  body('permissions')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one permission is required'),
  body('permissions.*')
    .optional()
    .isIn(['read', 'write', 'admin'])
    .withMessage('Invalid permission'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('ipWhitelist')
    .optional()
    .isArray()
    .withMessage('IP whitelist must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, permissions, isActive, ipWhitelist } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (permissions) updateData.permissions = permissions;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (ipWhitelist) updateData.ipWhitelist = ipWhitelist;

    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    logger.info(`API key updated: ${apiKey.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'API key updated successfully',
      data: {
        apiKey: {
          ...apiKey.toObject(),
          key: apiKey.getMaskedKey()
        }
      }
    });
  } catch (error) {
    logger.error('Update API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/api-keys/:id
// @desc    Delete API key
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    logger.info(`API key deleted: ${apiKey.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    logger.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/api-keys/:id/regenerate
// @desc    Regenerate API key
// @access  Private
router.post('/:id/regenerate', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Generate new key
    const { v4: uuidv4 } = await import('uuid');
    const newKey = `sk_${uuidv4().replace(/-/g, '')}`;
    
    apiKey.key = newKey;
    apiKey.usage.requests = 0; // Reset usage
    apiKey.lastUsed = null;
    await apiKey.save();

    logger.info(`API key regenerated: ${apiKey.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'API key regenerated successfully',
      data: {
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          key: newKey, // Show full key only on regeneration
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          expiresAt: apiKey.expiresAt,
          ipWhitelist: apiKey.ipWhitelist,
          usage: apiKey.usage
        }
      }
    });
  } catch (error) {
    logger.error('Regenerate API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/api-keys/:id/reset-usage
// @desc    Reset API key usage
// @access  Private
router.post('/:id/reset-usage', protect, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    await apiKey.resetUsage();

    logger.info(`API key usage reset: ${apiKey.name} for user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'API key usage reset successfully',
      data: {
        apiKey: {
          ...apiKey.toObject(),
          key: apiKey.getMaskedKey()
        }
      }
    });
  } catch (error) {
    logger.error('Reset API key usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/api-keys/stats/overview
// @desc    Get API keys overview stats
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const stats = await ApiKey.getUsageStats();
    const userKeys = await ApiKey.find({ userId: req.user.id });
    
    const userStats = {
      totalKeys: userKeys.length,
      activeKeys: userKeys.filter(key => key.isActive).length,
      totalRequests: userKeys.reduce((sum, key) => sum + key.usage.requests, 0),
      averageUsage: userKeys.length > 0 ? userKeys.reduce((sum, key) => sum + key.usage.requests, 0) / userKeys.length : 0
    };

    res.json({
      success: true,
      data: {
        system: stats[0] || {
          totalKeys: 0,
          activeKeys: 0,
          totalRequests: 0,
          averageUsage: 0
        },
        user: userStats
      }
    });
  } catch (error) {
    logger.error('Get API keys stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/api-keys/validate
// @desc    Validate API key (for testing)
// @access  Public
router.get('/validate', authenticateApiKey, (req, res) => {
  res.json({
    success: true,
    message: 'API key is valid',
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        plan: req.user.plan
      },
      apiKey: {
        id: req.apiKey._id,
        name: req.apiKey.name,
        permissions: req.apiKey.permissions,
        usage: req.apiKey.usage
      }
    }
  });
});

export default router;
