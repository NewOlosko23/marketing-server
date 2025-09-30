import express from 'express';
import { body, query, validationResult } from 'express-validator';
import User from '../models/User.js';
import Email from '../models/Email.js';
import SMS from '../models/SMS.js';
import ApiKey from '../models/ApiKey.js';
import Quota from '../models/Quota.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private/Admin
router.get('/dashboard', protect, requireAdmin, async (req, res) => {
  try {
    // Get system overview stats
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          freeUsers: { $sum: { $cond: [{ $eq: ['$plan', 'free'] }, 1, 0] } },
          starterUsers: { $sum: { $cond: [{ $eq: ['$plan', 'starter'] }, 1, 0] } },
          professionalUsers: { $sum: { $cond: [{ $eq: ['$plan', 'professional'] }, 1, 0] } }
        }
      }
    ]);

    const emailStats = await Email.getSystemStats();
    const smsStats = await SMS.getSystemStats();
    const apiKeyStats = await ApiKey.getUsageStats();
    const quotaStats = await Quota.getSystemStats();

    // Get recent activity
    const recentUsers = await User.find()
      .select('name email plan createdAt lastLogin')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEmails = await Email.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentSMS = await SMS.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get quota alerts
    const quotaAlerts = await Quota.getQuotaAlerts();

    res.json({
      success: true,
      data: {
        overview: {
          users: userStats[0] || {
            totalUsers: 0,
            activeUsers: 0,
            adminUsers: 0,
            freeUsers: 0,
            starterUsers: 0,
            professionalUsers: 0
          },
          emails: emailStats[0] || {
            total: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0
          },
          sms: smsStats[0] || {
            total: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
            undelivered: 0,
            totalCost: 0,
            averageCost: 0
          },
          apiKeys: apiKeyStats[0] || {
            totalKeys: 0,
            activeKeys: 0,
            totalRequests: 0,
            averageUsage: 0
          },
          quotas: quotaStats[0] || {
            totalUsers: 0,
            totalEmailUsed: 0,
            totalEmailLimit: 0,
            totalSmsUsed: 0,
            totalSmsLimit: 0,
            totalApiUsed: 0,
            totalApiLimit: 0
          }
        },
        recentActivity: {
          users: recentUsers,
          emails: recentEmails,
          sms: recentSMS
        },
        alerts: quotaAlerts.map(quota => ({
          userId: quota.userId,
          userName: quota.userId.name,
          userEmail: quota.userId.email,
          plan: quota.plan,
          status: quota.overallStatus,
          quota: quota.getSummary()
        }))
      }
    });
  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with admin details
// @access  Private/Admin
router.get('/users', protect, requireAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  query('plan').optional().isIn(['free', 'starter', 'professional']).withMessage('Plan must be free, starter, or professional'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
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

    // Build filter object
    const filter = {};
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.plan) {
      filter.plan = req.query.plan;
    }
    
    if (req.query.status) {
      filter.isActive = req.query.status === 'active';
    }

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    // Get user stats and quotas
    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const stats = await user.getStats();
        const quota = await Quota.findOne({ userId: user._id });
        
        return {
          ...user.toObject(),
          stats,
          quota: quota ? quota.getSummary() : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithDetails,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/api-keys
// @desc    Get all API keys (admin view)
// @access  Private/Admin
router.get('/api-keys', protect, requireAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('userId').optional().isMongoId().withMessage('User ID must be a valid MongoDB ObjectId'),
  query('status').optional().isIn(['active', 'inactive', 'expired']).withMessage('Status must be active, inactive, or expired')
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
    const filter = {};
    
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    if (req.query.status) {
      if (req.query.status === 'expired') {
        filter.expiresAt = { $lt: new Date() };
      } else {
        filter.isActive = req.query.status === 'active';
      }
    }

    const apiKeys = await ApiKey.find(filter)
      .populate('userId', 'name email plan')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ApiKey.countDocuments(filter);

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
    logger.error('Get admin API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/quotas
// @desc    Get quota management data
// @access  Private/Admin
router.get('/quotas', protect, requireAdmin, [
  query('status').optional().isIn(['normal', 'warning', 'critical', 'exceeded']).withMessage('Status must be normal, warning, critical, or exceeded'),
  query('plan').optional().isIn(['free', 'starter', 'professional']).withMessage('Plan must be free, starter, or professional')
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

    // Build filter
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.plan) {
      filter.plan = req.query.plan;
    }

    const quotas = await Quota.find(filter)
      .populate('userId', 'name email plan')
      .sort({ lastUpdated: -1 });

    const quotaDetails = quotas.map(quota => ({
      userId: quota.userId,
      userName: quota.userId.name,
      userEmail: quota.userId.email,
      userPlan: quota.userId.plan,
      plan: quota.plan,
      email: {
        used: quota.email.used,
        limit: quota.email.limit,
        percentage: quota.emailUsagePercentage,
        status: quota.getQuotaStatus('email'),
        resetDate: quota.email.resetDate
      },
      sms: {
        used: quota.sms.used,
        limit: quota.sms.limit,
        percentage: quota.smsUsagePercentage,
        status: quota.getQuotaStatus('sms'),
        resetDate: quota.sms.resetDate
      },
      api: {
        used: quota.api.used,
        limit: quota.api.limit,
        percentage: quota.apiUsagePercentage,
        status: quota.getQuotaStatus('api'),
        resetDate: quota.api.resetDate
      },
      overallStatus: quota.overallStatus,
      lastUpdated: quota.lastUpdated
    }));

    // Get system stats
    const systemStats = await Quota.getSystemStats();
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

    res.json({
      success: true,
      data: {
        quotas: quotaDetails,
        systemStats: systemStats[0] || {
          totalUsers: 0,
          totalEmailUsed: 0,
          totalEmailLimit: 0,
          totalSmsUsed: 0,
          totalSmsLimit: 0,
          totalApiUsed: 0,
          totalApiLimit: 0
        },
        planDistribution
      }
    });
  } catch (error) {
    logger.error('Get admin quotas error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/quotas/:userId/reset
// @desc    Reset user's quota
// @access  Private/Admin
router.post('/quotas/:userId/reset', protect, requireAdmin, [
  body('type').optional().isIn(['email', 'sms', 'api', 'all']).withMessage('Type must be email, sms, api, or all')
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

    const { type = 'all' } = req.body;
    const { userId } = req.params;

    const quota = await Quota.findOne({ userId });
    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota not found'
      });
    }

    if (type === 'all') {
      await quota.resetAllQuotas();
    } else {
      await quota.resetQuota(type);
    }

    logger.info(`Admin reset quota for user: ${userId}, type: ${type}`);

    res.json({
      success: true,
      message: `Quota reset successfully for ${type}`,
      data: {
        quota: quota.getSummary()
      }
    });
  } catch (error) {
    logger.error('Reset quota error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/users/:userId/plan
// @desc    Update user's plan
// @access  Private/Admin
router.put('/users/:userId/plan', protect, requireAdmin, [
  body('plan').isIn(['free', 'starter', 'professional']).withMessage('Plan must be free, starter, or professional')
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

    const { plan } = req.body;
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user's plan
    user.plan = plan;
    await user.save();

    // Update quota
    const quota = await Quota.findOne({ userId });
    if (quota) {
      const planLimits = {
        free: { email: 2000, sms: 0, api: 10000 },
        starter: { email: 5000, sms: 1000, api: 50000 },
        professional: { email: 25000, sms: 5000, api: 200000 }
      };
      
      await quota.updatePlan(plan, planLimits[plan]);
    }

    logger.info(`Admin updated plan for user: ${user.email} to ${plan}`);

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          plan: user.plan
        },
        quota: quota ? quota.getSummary() : null
      }
    });
  } catch (error) {
    logger.error('Update user plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/users/:userId/suspend
// @desc    Suspend user
// @access  Private/Admin
router.post('/users/:userId/suspend', protect, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot suspend admin users'
      });
    }

    user.isActive = false;
    await user.save();

    logger.info(`Admin suspended user: ${user.email}`);

    res.json({
      success: true,
      message: 'User suspended successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    logger.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/users/:userId/activate
// @desc    Activate user
// @access  Private/Admin
router.post('/users/:userId/activate', protect, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save();

    logger.info(`Admin activated user: ${user.email}`);

    res.json({
      success: true,
      message: 'User activated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    logger.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get admin analytics
// @access  Private/Admin
router.get('/analytics', protect, requireAdmin, [
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

    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get comprehensive analytics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          newUsers: { $sum: { $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0] } },
          freeUsers: { $sum: { $cond: [{ $eq: ['$plan', 'free'] }, 1, 0] } },
          starterUsers: { $sum: { $cond: [{ $eq: ['$plan', 'starter'] }, 1, 0] } },
          professionalUsers: { $sum: { $cond: [{ $eq: ['$plan', 'professional'] }, 1, 0] } }
        }
      }
    ]);

    const emailStats = await Email.getSystemStats(startDate, endDate);
    const smsStats = await SMS.getSystemStats(startDate, endDate);
    const quotaStats = await Quota.getSystemStats();

    // Get daily stats
    const emailDaily = await Email.getDailyStats(startDate, endDate);
    const smsDaily = await SMS.getDailyStats(startDate, endDate);

    // Get top users
    const topUsers = await User.aggregate([
      {
        $lookup: {
          from: 'emails',
          localField: '_id',
          foreignField: 'userId',
          as: 'emails'
        }
      },
      {
        $lookup: {
          from: 'sms',
          localField: '_id',
          foreignField: 'userId',
          as: 'sms'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          plan: 1,
          emailCount: { $size: '$emails' },
          smsCount: { $size: '$sms' },
          totalEmails: { $sum: '$emails.status' },
          totalSms: { $sum: '$sms.status' }
        }
      },
      { $sort: { emailCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          users: userStats[0] || {
            totalUsers: 0,
            activeUsers: 0,
            newUsers: 0,
            freeUsers: 0,
            starterUsers: 0,
            professionalUsers: 0
          },
          emails: emailStats[0] || {
            total: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0
          },
          sms: smsStats[0] || {
            total: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
            undelivered: 0,
            totalCost: 0,
            averageCost: 0
          },
          quotas: quotaStats[0] || {
            totalUsers: 0,
            totalEmailUsed: 0,
            totalEmailLimit: 0,
            totalSmsUsed: 0,
            totalSmsLimit: 0,
            totalApiUsed: 0,
            totalApiLimit: 0
          }
        },
        daily: {
          emails: emailDaily,
          sms: smsDaily
        },
        topUsers,
        period: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    logger.error('Get admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/send-email
// @desc    Send email to users (admin only)
// @access  Private/Admin
router.post('/send-email', protect, requireAdmin, [
  body('to')
    .isArray({ min: 1 })
    .withMessage('Recipients list is required'),
  body('to.*')
    .isEmail()
    .withMessage('Each recipient must be a valid email'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and must be less than 200 characters'),
  body('content')
    .isObject()
    .withMessage('Content is required'),
  body('content.html')
    .trim()
    .isLength({ min: 1 })
    .withMessage('HTML content is required'),
  body('content.text')
    .optional()
    .trim()
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

    const { to, subject, content, from } = req.body;

    const results = [];
    const fromEmail = from || {
      email: process.env.MAILJET_FROM_EMAIL || 'noreply@marketingfirm.com',
      name: process.env.MAILJET_FROM_NAME || 'Marketing Firm'
    };

    // Send emails to each recipient
    for (const emailAddress of to) {
      try {
        const emailData = {
          to: emailAddress,
          subject,
          content,
          from: fromEmail,
          userId: req.user.id, // Admin user ID
          metadata: {
            sentBy: 'admin',
            adminId: req.user.id
          }
        };

        const result = await emailService.sendEmail(emailData);
        
        // Save email record
        const emailRecord = await Email.create({
          userId: req.user.id,
          to: emailAddress,
          subject,
          content,
          from: fromEmail,
          status: 'sent',
          tracking: {
            messageId: result.messageId,
            provider: result.provider
          },
          metadata: {
            sentBy: 'admin',
            adminId: req.user.id
          }
        });

        results.push({
          email: emailAddress,
          success: true,
          messageId: result.messageId,
          emailId: emailRecord._id
        });

        logger.info(`Admin email sent to: ${emailAddress}`);
      } catch (error) {
        logger.error(`Failed to send email to ${emailAddress}:`, error);
        results.push({
          email: emailAddress,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Email sending completed. ${successCount} sent, ${failureCount} failed.`,
      data: {
        results,
        summary: {
          total: to.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });
  } catch (error) {
    logger.error('Admin send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/send-bulk-email
// @desc    Send bulk email to all users (admin only)
// @access  Private/Admin
router.post('/send-bulk-email', protect, requireAdmin, [
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and must be less than 200 characters'),
  body('content')
    .isObject()
    .withMessage('Content is required'),
  body('content.html')
    .trim()
    .isLength({ min: 1 })
    .withMessage('HTML content is required'),
  body('content.text')
    .optional()
    .trim(),
  body('userFilter')
    .optional()
    .isObject()
    .withMessage('User filter must be an object')
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

    const { subject, content, from, userFilter = {} } = req.body;

    // Build user query based on filter
    const userQuery = {};
    if (userFilter.plan) {
      userQuery.plan = userFilter.plan;
    }
    if (userFilter.role) {
      userQuery.role = userFilter.role;
    }
    if (userFilter.isActive !== undefined) {
      userQuery.isActive = userFilter.isActive;
    }

    // Get users to send email to
    const users = await User.find(userQuery).select('email name');
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found matching the criteria'
      });
    }

    const fromEmail = from || {
      email: process.env.MAILJET_FROM_EMAIL || 'noreply@marketingfirm.com',
      name: process.env.MAILJET_FROM_NAME || 'Marketing Firm'
    };

    const results = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the email service

    // Process users in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          const emailData = {
            to: user.email,
            subject: subject.replace('{{name}}', user.name),
            content: {
              html: content.html.replace(/\{\{name\}\}/g, user.name),
              text: content.text ? content.text.replace(/\{\{name\}\}/g, user.name) : undefined
            },
            from: fromEmail,
            userId: req.user.id,
            metadata: {
              sentBy: 'admin',
              adminId: req.user.id,
              bulkEmail: true
            }
          };

          const result = await emailService.sendEmail(emailData);
          
          // Save email record
          const emailRecord = await Email.create({
            userId: req.user.id,
            to: user.email,
            subject: emailData.subject,
            content: emailData.content,
            from: fromEmail,
            status: 'sent',
            tracking: {
              messageId: result.messageId,
              provider: result.provider
            },
            metadata: {
              sentBy: 'admin',
              adminId: req.user.id,
              bulkEmail: true,
              recipientUserId: user._id
            }
          });

          return {
            email: user.email,
            success: true,
            messageId: result.messageId,
            emailId: emailRecord._id
          };
        } catch (error) {
          logger.error(`Failed to send bulk email to ${user.email}:`, error);
          return {
            email: user.email,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logger.info(`Bulk email sent by admin ${req.user.id}: ${successCount} successful, ${failureCount} failed`);

    res.json({
      success: true,
      message: `Bulk email sending completed. ${successCount} sent, ${failureCount} failed.`,
      data: {
        results,
        summary: {
          total: users.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });
  } catch (error) {
    logger.error('Admin bulk email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
