import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Campaign from '../models/Campaign.js';
import EmailTemplate from '../models/EmailTemplate.js';
import ContactGroup from '../models/ContactGroup.js';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/campaigns
// @desc    Create a new email campaign
// @access  Private
router.post('/', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Campaign name is required (1-100 characters)'),
  body('subject').trim().isLength({ min: 1, max: 200 }).withMessage('Subject is required (1-200 characters)'),
  body('content.html').isLength({ min: 1 }).withMessage('HTML content is required'),
  body('content.text').isLength({ min: 1 }).withMessage('Text content is required'),
  body('templateId').optional().isMongoId().withMessage('Template ID must be valid'),
  body('contactGroupIds').optional().isArray().withMessage('Contact group IDs must be an array'),
  body('contactIds').optional().isArray().withMessage('Contact IDs must be an array'),
  body('scheduledAt').optional().isISO8601().withMessage('Scheduled date must be valid ISO 8601')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      name, 
      subject, 
      content, 
      templateId, 
      contactGroupIds = [], 
      contactIds = [],
      scheduledAt 
    } = req.body;

    // Get recipients from contact groups and direct contacts
    let recipients = [];
    
    if (contactGroupIds.length > 0) {
      const groups = await ContactGroup.find({ 
        _id: { $in: contactGroupIds }, 
        userId: req.user.id 
      }).populate('contacts');
      
      for (const group of groups) {
        recipients.push(...group.contacts.map(contact => contact._id));
      }
    }
    
    if (contactIds.length > 0) {
      const directContacts = await Contact.find({ 
        _id: { $in: contactIds }, 
        userId: req.user.id,
        status: 'active'
      });
      recipients.push(...directContacts.map(contact => contact._id));
    }

    // Remove duplicates
    recipients = [...new Set(recipients.map(id => id.toString()))];

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid recipients found'
      });
    }

    // Create campaign
    const campaign = new Campaign({
      name,
      subject,
      content,
      template: templateId,
      recipients,
      contactGroups: contactGroupIds,
      userId: req.user.id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      stats: {
        totalRecipients: recipients.length
      }
    });

    await campaign.save();

    // Update template usage if template is used
    if (templateId) {
      await EmailTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: 1 },
        lastUsed: new Date()
      });
    }

    logger.info(`Campaign created: ${name} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          totalRecipients: campaign.stats.totalRecipients,
          scheduledAt: campaign.scheduledAt,
          createdAt: campaign.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/campaigns
// @desc    Get user's campaigns
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id };
    if (status) {
      query.status = status;
    }

    const campaigns = await Campaign.find(query)
      .populate('template', 'name category')
      .populate('contactGroups', 'name contactCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Campaign.countDocuments(query);

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/campaigns/:id
// @desc    Get campaign details
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid campaign ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const campaign = await Campaign.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    })
    .populate('template')
    .populate('contactGroups', 'name contactCount')
    .populate('recipients', 'name email company status');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: { campaign }
    });

  } catch (error) {
    logger.error('Get campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/campaigns/:id
// @desc    Update campaign
// @access  Private
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid campaign ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('subject').optional().trim().isLength({ min: 1, max: 200 }),
  body('content.html').optional().isLength({ min: 1 }),
  body('content.text').optional().isLength({ min: 1 }),
  body('scheduledAt').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const campaign = await Campaign.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update sent campaign'
      });
    }

    const updates = req.body;
    if (updates.scheduledAt) {
      updates.scheduledAt = new Date(updates.scheduledAt);
    }

    Object.assign(campaign, updates);
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: { campaign }
    });

  } catch (error) {
    logger.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/campaigns/:id
// @desc    Delete campaign
// @access  Private
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid campaign ID')
], async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status === 'sending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign that is currently sending'
      });
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    logger.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/campaigns/:id/send
// @desc    Send campaign
// @access  Private
router.post('/:id/send', protect, [
  param('id').isMongoId().withMessage('Invalid campaign ID')
], async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    }).populate('recipients');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Campaign cannot be sent in current status'
      });
    }

    // Update campaign status
    campaign.status = 'sending';
    await campaign.save();

    // TODO: Implement actual email sending logic here
    // For now, we'll simulate sending
    logger.info(`Campaign ${campaign.name} marked for sending`);

    res.json({
      success: true,
      message: 'Campaign is being sent',
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          totalRecipients: campaign.stats.totalRecipients
        }
      }
    });

  } catch (error) {
    logger.error('Send campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/campaigns/:id/stats
// @desc    Get campaign statistics
// @access  Private
router.get('/:id/stats', protect, [
  param('id').isMongoId().withMessage('Invalid campaign ID')
], async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: {
        stats: campaign.stats,
        openRate: campaign.openRate,
        clickRate: campaign.clickRate,
        deliveryRate: campaign.deliveryRate
      }
    });

  } catch (error) {
    logger.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
