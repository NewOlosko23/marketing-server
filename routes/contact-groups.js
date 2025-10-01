import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import ContactGroup from '../models/ContactGroup.js';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/contact-groups
// @desc    Create contact group
// @access  Private
router.post('/', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Group name is required (1-100 characters)'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('contactIds').optional().isArray(),
  body('filters').optional().isObject()
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

    const { name, description, contactIds = [], filters = {} } = req.body;

    // Check if group name already exists for user
    const existingGroup = await ContactGroup.findOne({ name, userId: req.user.id });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: 'Group name already exists'
      });
    }

    // Validate contact IDs if provided
    let validContacts = [];
    if (contactIds.length > 0) {
      const contacts = await Contact.find({
        _id: { $in: contactIds },
        userId: req.user.id,
        status: 'active'
      });
      validContacts = contacts.map(contact => contact._id);
    }

    const group = new ContactGroup({
      name,
      description,
      contacts: validContacts,
      filters,
      userId: req.user.id,
      contactCount: validContacts.length
    });

    await group.save();

    logger.info(`Contact group created: ${name} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Contact group created successfully',
      data: { group }
    });

  } catch (error) {
    logger.error('Create contact group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/contact-groups
// @desc    Get user's contact groups
// @access  Private
router.get('/', protect, [
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

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const groups = await ContactGroup.find({ userId: req.user.id })
      .populate('contacts', 'name email phone company status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactGroup.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    logger.error('Get contact groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/contact-groups/:id
// @desc    Get contact group details
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid group ID')
], async (req, res) => {
  try {
    const group = await ContactGroup.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('contacts', 'name email phone company status tags');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Contact group not found'
      });
    }

    res.json({
      success: true,
      data: { group }
    });

  } catch (error) {
    logger.error('Get contact group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/contact-groups/:id
// @desc    Update contact group
// @access  Private
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid group ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('contactIds').optional().isArray(),
  body('filters').optional().isObject()
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

    const group = await ContactGroup.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Contact group not found'
      });
    }

    const { name, description, contactIds, filters } = req.body;

    // Check name uniqueness if name is being updated
    if (name && name !== group.name) {
      const existingGroup = await ContactGroup.findOne({ 
        name, 
        userId: req.user.id,
        _id: { $ne: req.params.id }
      });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: 'Group name already exists'
        });
      }
    }

    // Update contacts if provided
    if (contactIds !== undefined) {
      const validContacts = await Contact.find({
        _id: { $in: contactIds },
        userId: req.user.id,
        status: 'active'
      });
      group.contacts = validContacts.map(contact => contact._id);
      group.contactCount = group.contacts.length;
    }

    // Update other fields
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (filters) group.filters = { ...group.filters, ...filters };

    await group.save();

    res.json({
      success: true,
      message: 'Contact group updated successfully',
      data: { group }
    });

  } catch (error) {
    logger.error('Update contact group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/contact-groups/:id
// @desc    Delete contact group
// @access  Private
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid group ID')
], async (req, res) => {
  try {
    const group = await ContactGroup.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Contact group not found'
      });
    }

    await ContactGroup.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Contact group deleted successfully'
    });

  } catch (error) {
    logger.error('Delete contact group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/contact-groups/:id/contacts
// @desc    Add contacts to group
// @access  Private
router.post('/:id/contacts', protect, [
  param('id').isMongoId().withMessage('Invalid group ID'),
  body('contactIds').isArray().withMessage('Contact IDs must be an array')
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

    const group = await ContactGroup.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Contact group not found'
      });
    }

    const { contactIds } = req.body;

    // Validate contact IDs
    const validContacts = await Contact.find({
      _id: { $in: contactIds },
      userId: req.user.id,
      status: 'active'
    });

    const newContactIds = validContacts.map(contact => contact._id);
    await group.addContacts(newContactIds);

    res.json({
      success: true,
      message: 'Contacts added to group successfully',
      data: {
        addedCount: newContactIds.length,
        totalContacts: group.contactCount
      }
    });

  } catch (error) {
    logger.error('Add contacts to group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/contact-groups/:id/contacts/:contactId
// @desc    Remove contact from group
// @access  Private
router.delete('/:id/contacts/:contactId', protect, [
  param('id').isMongoId().withMessage('Invalid group ID'),
  param('contactId').isMongoId().withMessage('Invalid contact ID')
], async (req, res) => {
  try {
    const group = await ContactGroup.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Contact group not found'
      });
    }

    await group.removeContact(req.params.contactId);

    res.json({
      success: true,
      message: 'Contact removed from group successfully',
      data: {
        totalContacts: group.contactCount
      }
    });

  } catch (error) {
    logger.error('Remove contact from group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/contact-groups/:id/contacts
// @desc    Get contacts in group
// @access  Private
router.get('/:id/contacts', protect, [
  param('id').isMongoId().withMessage('Invalid group ID'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const group = await ContactGroup.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('contacts', 'name email phone company status tags');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Contact group not found'
      });
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const contacts = group.contacts.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        contacts,
        totalContacts: group.contactCount,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(group.contactCount / limit),
          total: group.contactCount
        }
      }
    });

  } catch (error) {
    logger.error('Get group contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
