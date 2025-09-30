import express from 'express';
import { query, validationResult } from 'express-validator';
import Quota from '../models/Quota.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/quotas
// @desc    Get user's quota information
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let quota = await Quota.findOne({ userId: req.user.id });
    
    // Create quota if doesn't exist
    if (!quota) {
      quota = await Quota.createForUser(req.user.id, req.user.plan);
    }

    res.json({
      success: true,
      data: {
        quota: quota.getSummary()
      }
    });
  } catch (error) {
    logger.error('Get quota error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/quotas/usage
// @desc    Get detailed usage information
// @access  Private
router.get('/usage', protect, [
  query('type').optional().isIn(['email', 'sms', 'api']).withMessage('Type must be email, sms, or api'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date')
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

    const { type, startDate, endDate } = req.query;
    
    // Get quota information
    const quota = await Quota.findOne({ userId: req.user.id });
    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota not found'
      });
    }

    // Get usage details based on type
    let usageDetails = {};
    
    if (type === 'email' || !type) {
      const { default: Email } = await import('../models/Email.js');
      const emailStats = await Email.getUserStats(req.user.id, startDate, endDate);
      usageDetails.email = emailStats[0] || {
        total: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0
      };
    }
    
    if (type === 'sms' || !type) {
      const { default: SMS } = await import('../models/SMS.js');
      const smsStats = await SMS.getUserStats(req.user.id, startDate, endDate);
      usageDetails.sms = smsStats[0] || {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        undelivered: 0,
        totalCost: 0,
        averageCost: 0
      };
    }
    
    if (type === 'api' || !type) {
      const { default: ApiKey } = await import('../models/ApiKey.js');
      const apiKeys = await ApiKey.find({ userId: req.user.id });
      usageDetails.api = {
        totalKeys: apiKeys.length,
        activeKeys: apiKeys.filter(key => key.isActive).length,
        totalRequests: apiKeys.reduce((sum, key) => sum + key.usage.requests, 0),
        averageUsage: apiKeys.length > 0 ? apiKeys.reduce((sum, key) => sum + key.usage.requests, 0) / apiKeys.length : 0
      };
    }

    res.json({
      success: true,
      data: {
        quota: quota.getSummary(),
        usage: usageDetails
      }
    });
  } catch (error) {
    logger.error('Get quota usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/quotas/reset
// @desc    Reset user's quota (admin only)
// @access  Private/Admin
router.post('/reset', protect, requireAdmin, async (req, res) => {
  try {
    const { userId, type } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const quota = await Quota.findOne({ userId });
    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota not found'
      });
    }

    if (type) {
      await quota.resetQuota(type);
    } else {
      await quota.resetAllQuotas();
    }

    logger.info(`Quota reset for user: ${userId}, type: ${type || 'all'}`);

    res.json({
      success: true,
      message: `Quota reset successfully for ${type || 'all'}`
    });
  } catch (error) {
    logger.error('Reset quota error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/quotas/alerts
// @desc    Get quota alerts (admin only)
// @access  Private/Admin
router.get('/alerts', protect, requireAdmin, async (req, res) => {
  try {
    const alerts = await Quota.getQuotaAlerts();
    
    const alertDetails = await Promise.all(
      alerts.map(async (quota) => {
        const { default: User } = await import('../models/User.js');
        const user = await User.findById(quota.userId);
        return {
          userId: quota.userId,
          userName: user.name,
          userEmail: user.email,
          plan: quota.plan,
          emailStatus: quota.getQuotaStatus('email'),
          smsStatus: quota.getQuotaStatus('sms'),
          apiStatus: quota.getQuotaStatus('api'),
          overallStatus: quota.overallStatus,
          quota: quota.getSummary()
        };
      })
    );

    res.json({
      success: true,
      data: {
        alerts: alertDetails
      }
    });
  } catch (error) {
    logger.error('Get quota alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/quotas/system
// @desc    Get system-wide quota statistics (admin only)
// @access  Private/Admin
router.get('/system', protect, requireAdmin, async (req, res) => {
  try {
    const systemStats = await Quota.getSystemStats();
    
    // Get plan distribution
    const planDistribution = await Quota.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          totalEmailUsed: { $sum: '$email.used' },
          totalEmailLimit: { $sum: '$email.limit' },
          totalSmsUsed: { $sum: '$sms.used' },
          totalSmsLimit: { $sum: '$sms.limit' },
          totalApiUsed: { $sum: '$api.used' },
          totalApiLimit: { $sum: '$api.limit' }
        }
      }
    ]);

    // Get status distribution
    const statusDistribution = await Quota.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        system: systemStats[0] || {
          totalUsers: 0,
          totalEmailUsed: 0,
          totalEmailLimit: 0,
          totalSmsUsed: 0,
          totalSmsLimit: 0,
          totalApiUsed: 0,
          totalApiLimit: 0
        },
        planDistribution,
        statusDistribution
      }
    });
  } catch (error) {
    logger.error('Get system quota stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/quotas/:userId/plan
// @desc    Update user's plan and quotas (admin only)
// @access  Private/Admin
router.put('/:userId/plan', protect, requireAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!plan || !['free', 'starter', 'professional'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Valid plan is required (free, starter, professional)'
      });
    }

    const quota = await Quota.findOne({ userId: req.params.userId });
    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota not found'
      });
    }

    const planLimits = {
      free: { email: 2000, sms: 0, api: 10000 },
      starter: { email: 5000, sms: 1000, api: 50000 },
      professional: { email: 25000, sms: 5000, api: 200000 }
    };

    await quota.updatePlan(plan, planLimits[plan]);

    // Update user's plan
    const { default: User } = await import('../models/User.js');
    await User.findByIdAndUpdate(req.params.userId, { plan });

    logger.info(`Plan updated for user: ${req.params.userId} to ${plan}`);

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: {
        quota: quota.getSummary()
      }
    });
  } catch (error) {
    logger.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/quotas/check
// @desc    Check if user has quota available
// @access  Private
router.get('/check', protect, async (req, res) => {
  try {
    const { type, amount = 1 } = req.query;
    
    if (!type || !['email', 'sms', 'api'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be email, sms, or api'
      });
    }

    const quota = await Quota.findOne({ userId: req.user.id });
    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota not found'
      });
    }

    const hasQuota = quota.hasQuotaAvailable(type, parseInt(amount));
    const status = quota.getQuotaStatus(type);
    const percentage = quota[`${type}UsagePercentage`];

    res.json({
      success: true,
      data: {
        hasQuota,
        status,
        percentage,
        used: quota[type].used,
        limit: quota[type].limit,
        remaining: quota[type].limit - quota[type].used
      }
    });
  } catch (error) {
    logger.error('Check quota error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
