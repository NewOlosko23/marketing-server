import express from 'express';
import { query, validationResult } from 'express-validator';
import User from '../models/User.js';
import Email from '../models/Email.js';
import SMS from '../models/SMS.js';
import ApiKey from '../models/ApiKey.js';
import Quota from '../models/Quota.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/analytics
// @desc    Get analytics with timeframe parameter
// @access  Private
router.get('/', protect, [
  query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Timeframe must be 7d, 30d, 90d, or 1y')
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

    const timeframe = req.query.timeframe || '30d';
    
    // Calculate date range based on timeframe
    let startDate, endDate;
    const now = new Date();
    endDate = now;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user stats
    const userStats = await req.user.getStats();
    
    // Get email stats
    const emailStats = await Email.getUserStats(req.user.id, startDate, endDate);
    
    // Get SMS stats
    const smsStats = await SMS.getUserStats(req.user.id, startDate, endDate);
    
    // Get API key stats
    const apiKeys = await ApiKey.find({ userId: req.user.id });
    const apiStats = {
      totalKeys: apiKeys.length,
      activeKeys: apiKeys.filter(key => key.isActive).length,
      totalRequests: apiKeys.reduce((sum, key) => sum + key.usage.requests, 0)
    };

    // Get quota info
    const quota = await Quota.findOne({ userId: req.user.id });
    const quotaInfo = quota ? quota.getSummary() : null;

    // Calculate rates
    const emailData = emailStats[0] || {};
    const smsData = smsStats[0] || {};
    
    const deliveryRate = emailData.sent > 0 ? (emailData.delivered / emailData.sent) * 100 : 0;
    const openRate = emailData.delivered > 0 ? (emailData.opened / emailData.delivered) * 100 : 0;
    const clickRate = emailData.delivered > 0 ? (emailData.clicked / emailData.delivered) * 100 : 0;

    res.json({
      success: true,
      data: {
        timeframe,
        period: { startDate, endDate },
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          plan: req.user.plan,
          lastLogin: req.user.lastLogin
        },
        stats: {
          totalClients: userStats.totalClients || 0,
          activeCampaigns: userStats.activeCampaigns || 0,
          tasksDueToday: userStats.tasksDueToday || 0,
          emailsSent: emailData.sent || 0,
          smsSent: smsData.sent || 0,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          deliveryRate: Math.round(deliveryRate * 100) / 100
        },
        emails: {
          total: emailData.total || 0,
          sent: emailData.sent || 0,
          delivered: emailData.delivered || 0,
          opened: emailData.opened || 0,
          clicked: emailData.clicked || 0,
          bounced: emailData.bounced || 0,
          failed: emailData.failed || 0
        },
        sms: {
          total: smsData.total || 0,
          sent: smsData.sent || 0,
          delivered: smsData.delivered || 0,
          failed: smsData.failed || 0,
          undelivered: smsData.undelivered || 0,
          totalCost: smsData.totalCost || 0,
          averageCost: smsData.averageCost || 0
        },
        api: apiStats,
        quota: quotaInfo
      }
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/overview
// @desc    Get analytics overview
// @access  Private
router.get('/overview', protect, [
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

    // Get user stats
    const userStats = await req.user.getStats();
    
    // Get email stats
    const emailStats = await Email.getUserStats(req.user.id, startDate, endDate);
    
    // Get SMS stats
    const smsStats = await SMS.getUserStats(req.user.id, startDate, endDate);
    
    // Get API key stats
    const apiKeys = await ApiKey.find({ userId: req.user.id });
    const apiStats = {
      totalKeys: apiKeys.length,
      activeKeys: apiKeys.filter(key => key.isActive).length,
      totalRequests: apiKeys.reduce((sum, key) => sum + key.usage.requests, 0)
    };

    // Get quota info
    const quota = await Quota.findOne({ userId: req.user.id });
    const quotaInfo = quota ? quota.getSummary() : null;

    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          plan: req.user.plan,
          lastLogin: req.user.lastLogin
        },
        stats: {
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
          api: apiStats
        },
        quota: quotaInfo
      }
    });
  } catch (error) {
    logger.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/emails
// @desc    Get email analytics
// @access  Private
router.get('/emails', protect, [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Group by must be day, week, or month')
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
    const groupBy = req.query.groupBy || 'day';

    // Get email stats
    const emailStats = await Email.getUserStats(req.user.id, startDate, endDate);
    const dailyStats = await Email.getDailyStats(startDate, endDate);

    // Calculate rates
    const stats = emailStats[0] || {};
    const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
    const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
    const clickRate = stats.delivered > 0 ? (stats.clicked / stats.delivered) * 100 : 0;
    const bounceRate = stats.sent > 0 ? (stats.bounced / stats.sent) * 100 : 0;

    res.json({
      success: true,
      data: {
        overview: {
          total: stats.total || 0,
          sent: stats.sent || 0,
          delivered: stats.delivered || 0,
          opened: stats.opened || 0,
          clicked: stats.clicked || 0,
          bounced: stats.bounced || 0,
          failed: stats.failed || 0,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          bounceRate: Math.round(bounceRate * 100) / 100
        },
        daily: dailyStats,
        period: {
          startDate,
          endDate,
          groupBy
        }
      }
    });
  } catch (error) {
    logger.error('Get email analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/sms
// @desc    Get SMS analytics
// @access  Private
router.get('/sms', protect, [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Group by must be day, week, or month')
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
    const groupBy = req.query.groupBy || 'day';

    // Get SMS stats
    const smsStats = await SMS.getUserStats(req.user.id, startDate, endDate);
    const dailyStats = await SMS.getDailyStats(startDate, endDate);
    const costAnalysis = await SMS.getCostAnalysis(startDate, endDate);

    // Calculate rates
    const stats = smsStats[0] || {};
    const deliveryRate = stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 0;
    const failureRate = stats.sent > 0 ? (stats.failed / stats.sent) * 100 : 0;

    res.json({
      success: true,
      data: {
        overview: {
          total: stats.total || 0,
          sent: stats.sent || 0,
          delivered: stats.delivered || 0,
          failed: stats.failed || 0,
          undelivered: stats.undelivered || 0,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          failureRate: Math.round(failureRate * 100) / 100,
          totalCost: stats.totalCost || 0,
          averageCost: stats.averageCost || 0
        },
        daily: dailyStats,
        costAnalysis: costAnalysis[0] || {
          totalCost: 0,
          averageCost: 0,
          minCost: 0,
          maxCost: 0,
          totalMessages: 0
        },
        period: {
          startDate,
          endDate,
          groupBy
        }
      }
    });
  } catch (error) {
    logger.error('Get SMS analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/api-keys
// @desc    Get API key analytics
// @access  Private
router.get('/api-keys', protect, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    const stats = {
      totalKeys: apiKeys.length,
      activeKeys: apiKeys.filter(key => key.isActive).length,
      expiredKeys: apiKeys.filter(key => key.isExpired()).length,
      totalRequests: apiKeys.reduce((sum, key) => sum + key.usage.requests, 0),
      averageUsage: apiKeys.length > 0 ? apiKeys.reduce((sum, key) => sum + key.usage.requests, 0) / apiKeys.length : 0
    };

    const keyDetails = apiKeys.map(key => ({
      id: key._id,
      name: key.name,
      isActive: key.isActive,
      isExpired: key.isExpired(),
      usage: key.usage,
      usagePercentage: key.usagePercentage,
      remainingRequests: key.remainingRequests,
      lastUsed: key.lastUsed,
      createdAt: key.createdAt
    }));

    res.json({
      success: true,
      data: {
        stats,
        keys: keyDetails
      }
    });
  } catch (error) {
    logger.error('Get API key analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/system
// @desc    Get system analytics (admin only)
// @access  Private/Admin
router.get('/system', protect, requireAdmin, [
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

    // Get system-wide stats
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          newUsers: { $sum: { $cond: [{ $gte: ['$createdAt', startDate] }, 1, 0] } }
        }
      }
    ]);

    const emailStats = await Email.getSystemStats(startDate, endDate);
    const smsStats = await SMS.getSystemStats(startDate, endDate);
    const quotaStats = await Quota.getSystemStats();

    // Get recent activity
    const recentEmails = await Email.find({ createdAt: { $gte: startDate } })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentSMS = await SMS.find({ createdAt: { $gte: startDate } })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        users: userStats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          newUsers: 0
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
        },
        recentActivity: {
          emails: recentEmails,
          sms: recentSMS
        },
        period: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    logger.error('Get system analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data
// @access  Private
router.get('/export', protect, [
  query('type').isIn(['emails', 'sms', 'api-keys', 'overview']).withMessage('Type must be emails, sms, api-keys, or overview'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
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

    const { type, format = 'json', startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let data = {};

    switch (type) {
      case 'emails':
        const emailStats = await Email.getUserStats(req.user.id, start, end);
        const emailDaily = await Email.getDailyStats(start, end);
        data = {
          overview: emailStats[0] || {},
          daily: emailDaily
        };
        break;
      
      case 'sms':
        const smsStats = await SMS.getUserStats(req.user.id, start, end);
        const smsDaily = await SMS.getDailyStats(start, end);
        const smsCost = await SMS.getCostAnalysis(start, end);
        data = {
          overview: smsStats[0] || {},
          daily: smsDaily,
          costAnalysis: smsCost[0] || {}
        };
        break;
      
      case 'api-keys':
        const apiKeys = await ApiKey.find({ userId: req.user.id });
        data = {
          keys: apiKeys.map(key => ({
            name: key.name,
            isActive: key.isActive,
            usage: key.usage,
            lastUsed: key.lastUsed,
            createdAt: key.createdAt
          }))
        };
        break;
      
      case 'overview':
        const userStats = await req.user.getStats();
        const quota = await Quota.findOne({ userId: req.user.id });
        data = {
          user: {
            name: req.user.name,
            email: req.user.email,
            plan: req.user.plan,
            lastLogin: req.user.lastLogin
          },
          stats: userStats,
          quota: quota ? quota.getSummary() : null
        };
        break;
    }

    if (format === 'csv') {
      // TODO: Implement CSV export
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics.csv"`);
      res.send('CSV export not implemented yet');
    } else {
      res.json({
        success: true,
        data: {
          type,
          period: { startDate: start, endDate: end },
          data
        }
      });
    }
  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
