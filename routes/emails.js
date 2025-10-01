import express from 'express';
import { body, query, validationResult } from 'express-validator';
import Email from '../models/Email.js';
import Quota from '../models/Quota.js';
import { protect, authenticateApiKey, requirePermission } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/emails/send
// @desc    Send email
// @access  Private
router.post('/send', protect, [
  body('to')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid recipient email is required'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters'),
  body('content.html')
    .notEmpty()
    .withMessage('HTML content is required'),
  body('content.text')
    .optional()
    .isString()
    .withMessage('Text content must be a string'),
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

    const { to, subject, content, priority = 'normal', scheduledAt, metadata } = req.body;

    // Check quota
    const quota = await Quota.findOne({ userId: req.user.id });
    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota not found'
      });
    }

    if (!quota.hasQuotaAvailable('email')) {
      return res.status(429).json({
        success: false,
        message: 'Email quota exceeded'
      });
    }

    // Create email record
    const email = await Email.create({
      userId: req.user.id,
      to,
      subject,
      content,
      priority,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      metadata: metadata || {}
    });

    // Consume quota
    await quota.consumeQuota('email');

    // Send email immediately if not scheduled
    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      try {
        await emailService.sendEmail(email);
        await email.markAsSent();
      } catch (error) {
        await email.markAsFailed(error.message);
        logger.error('Email send error:', error);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send email',
          error: error.message
        });
      }
    }

    logger.info(`Email sent to: ${to} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Email sent successfully',
      data: {
        email: {
          id: email._id,
          to: email.to,
          subject: email.subject,
          status: email.status,
          scheduledAt: email.scheduledAt,
          sentAt: email.sentAt
        }
      }
    });
  } catch (error) {
    logger.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/emails
// @desc    Get user's emails
// @access  Private
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']).withMessage('Invalid status'),
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

    const emails = await Email.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Email.countDocuments(filter);

    res.json({
      success: true,
      data: {
        emails,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Get emails error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/emails/:id
// @desc    Get email by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const email = await Email.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    res.json({
      success: true,
      data: { email }
    });
  } catch (error) {
    logger.error('Get email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/emails/stats/overview
// @desc    Get email statistics
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

    const stats = await Email.getUserStats(req.user.id, startDate, endDate);
    const dailyStats = await Email.getDailyStats(startDate, endDate);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          failed: 0,
          totalOpens: 0,
          totalClicks: 0
        },
        daily: dailyStats
      }
    });
  } catch (error) {
    logger.error('Get email stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/emails/:id/track/open
// @desc    Track email open
// @access  Public (for tracking pixels)
router.post('/:id/track/open', async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    await email.markAsOpened();

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(pixel);
  } catch (error) {
    logger.error('Track email open error:', error);
    res.status(500).send();
  }
});

// @route   POST /api/emails/:id/track/click
// @desc    Track email click
// @access  Public (for click tracking)
router.post('/:id/track/click', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    await email.markAsClicked();

    // Redirect to the original URL
    res.redirect(url);
  } catch (error) {
    logger.error('Track email click error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/emails/:id
// @desc    Delete email
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const email = await Email.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    logger.info(`Email deleted: ${email._id} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Email deleted successfully'
    });
  } catch (error) {
    logger.error('Delete email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/emails/templates
// @desc    Get email templates (placeholder)
// @access  Private
router.get('/templates', protect, async (req, res) => {
  try {
    // Placeholder for email templates
    const templates = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to Marketing Firm!',
        description: 'Welcome new users to the platform'
      },
      {
        id: 'newsletter',
        name: 'Newsletter',
        subject: 'Weekly Newsletter',
        description: 'Weekly newsletter template'
      },
      {
        id: 'promotion',
        name: 'Promotion',
        subject: 'Special Offer Inside!',
        description: 'Promotional email template'
      }
    ];

    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    logger.error('Get email templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
