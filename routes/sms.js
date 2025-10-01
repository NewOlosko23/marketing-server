import express from 'express';
import { body, query, validationResult } from 'express-validator';
import SMS from '../models/SMS.js';
import Quota from '../models/Quota.js';
import { protect, authenticateApiKey, requirePermission } from '../middleware/auth.js';
import smsService from '../services/smsService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/sms/send
// @desc    Send SMS
// @access  Private
router.post('/send', protect, [
  body('to')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1600 })
    .withMessage('Message must be between 1 and 1600 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('Priority must be low, normal, or high'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date')
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

    const { to, message, priority = 'normal', scheduledAt, metadata } = req.body;

    // Check quota
    const quota = await Quota.findOne({ userId: req.user.id });
    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota not found'
      });
    }

    if (!quota.hasQuotaAvailable('sms')) {
      return res.status(429).json({
        success: false,
        message: 'SMS quota exceeded'
      });
    }

    // Create SMS record
    const sms = await SMS.create({
      userId: req.user.id,
      to,
      message,
      priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      metadata: metadata || {}
    });

    // Consume quota
    await quota.consumeQuota('sms');

    // Send SMS immediately if not scheduled
    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      try {
        const result = await smsService.sendSMS(sms);
        await sms.markAsSent(result.messageId, result.sid);
      } catch (error) {
        await sms.markAsFailed(error.message, error.code);
        logger.error('SMS send error:', error);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send SMS',
          error: error.message
        });
      }
    }

    logger.info(`SMS sent to: ${to} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'SMS sent successfully',
      data: {
        sms: {
          id: sms._id,
          to: sms.to,
          message: sms.message,
          status: sms.status,
          scheduledAt: sms.scheduledAt,
          sentAt: sms.sentAt,
          cost: sms.cost
        }
      }
    });
  } catch (error) {
    logger.error('Send SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sms
// @desc    Get user's SMS messages
// @access  Private
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed', 'undelivered']).withMessage('Invalid status'),
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { userId: req.user.id };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const smsMessages = await SMS.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SMS.countDocuments(filter);

    res.json({
      success: true,
      data: {
        sms: smsMessages,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Get SMS messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sms/:id
// @desc    Get SMS by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const sms = await SMS.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!sms) {
      return res.status(404).json({
        success: false,
        message: 'SMS not found'
      });
    }

    res.json({
      success: true,
      data: { sms }
    });
  } catch (error) {
    logger.error('Get SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sms/stats/overview
// @desc    Get SMS statistics
// @access  Private
router.get('/stats/overview', protect, [
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

    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const stats = await SMS.getUserStats(req.user.id, startDate, endDate);
    const dailyStats = await SMS.getDailyStats(startDate, endDate);
    const costAnalysis = await SMS.getCostAnalysis(startDate, endDate);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
          undelivered: 0,
          totalCost: 0,
          averageCost: 0
        },
        daily: dailyStats,
        costAnalysis: costAnalysis[0] || {
          totalCost: 0,
          averageCost: 0,
          minCost: 0,
          maxCost: 0,
          totalMessages: 0
        }
      }
    });
  } catch (error) {
    logger.error('Get SMS stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/sms/webhook/delivery
// @desc    SMS delivery webhook (Twilio)
// @access  Public
router.post('/webhook/delivery', async (req, res) => {
  try {
    const { MessageSid, MessageStatus } = req.body;
    
    if (!MessageSid) {
      return res.status(400).json({
        success: false,
        message: 'MessageSid is required'
      });
    }

    const sms = await SMS.findOne({ 'tracking.sid': MessageSid });
    
    if (!sms) {
      return res.status(404).json({
        success: false,
        message: 'SMS not found'
      });
    }

    // Update status based on Twilio status
    switch (MessageStatus) {
      case 'delivered':
        await sms.markAsDelivered();
        break;
      case 'failed':
        await sms.markAsFailed('Delivery failed', MessageStatus);
        break;
      case 'undelivered':
        await sms.markAsUndelivered();
        break;
    }

    logger.info(`SMS webhook received: ${MessageSid} - ${MessageStatus}`);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('SMS webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/sms/:id
// @desc    Delete SMS
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const sms = await SMS.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!sms) {
      return res.status(404).json({
        success: false,
        message: 'SMS not found'
      });
    }

    logger.info(`SMS deleted: ${sms._id} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'SMS deleted successfully'
    });
  } catch (error) {
    logger.error('Delete SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sms/templates
// @desc    Get SMS templates (placeholder)
// @access  Private
router.get('/templates', protect, async (req, res) => {
  try {
    // Placeholder for SMS templates
    const templates = [
      {
        id: 'welcome',
        name: 'Welcome SMS',
        message: 'Welcome to Marketing Firm! Get started with your first campaign.',
        description: 'Welcome new users to the platform'
      },
      {
        id: 'reminder',
        name: 'Reminder SMS',
        message: 'Don\'t forget about your upcoming appointment.',
        description: 'Appointment reminder template'
      },
      {
        id: 'promotion',
        name: 'Promotion SMS',
        message: 'Special offer: 50% off your next purchase! Use code SAVE50',
        description: 'Promotional SMS template'
      }
    ];

    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    logger.error('Get SMS templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/sms/validate
// @desc    Validate phone number
// @access  Private
router.get('/validate', protect, [
  query('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required')
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

    const { phone } = req.query;

    // Basic phone number validation
    const isValid = /^\+?[1-9]\d{1,14}$/.test(phone);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // TODO: Add more sophisticated validation (e.g., using Twilio Lookup API)
    
    res.json({
      success: true,
      message: 'Phone number is valid',
      data: {
        phone,
        isValid: true,
        formatted: phone.startsWith('+') ? phone : `+${phone}`
      }
    });
  } catch (error) {
    logger.error('Validate phone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
