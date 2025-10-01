import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Contact from '../models/Contact.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   GET /api/contacts
// @desc    Get user's contacts
// @access  Private
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('search').optional().trim().isLength({ min: 1, max: 100 }),
  query('tags').optional().isString(),
  query('company').optional().trim().isLength({ max: 100 })
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

    const { page = 1, limit = 20, search, tags, company } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = { userId: req.user.id, status: 'active' };

    // Add search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Add tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Add company filter
    if (company) {
      query.company = new RegExp(company, 'i');
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    logger.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/contacts/:id
// @desc    Get contact by ID
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid contact ID')
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

    const contact = await Contact.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('userId', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    logger.info(`Contact retrieved: ${contact.name} (${contact.email}) by user: ${req.user.email}`);

    res.json({
      success: true,
      data: contact
    });

  } catch (error) {
    logger.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/contacts
// @desc    Create new contact
// @access  Private
router.post('/', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 characters)'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('company').optional().trim().isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('tags').optional().isArray(),
  body('customFields').optional().isObject()
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

    const { name, email, phone, company, position, tags = [], customFields = {} } = req.body;

    // Check if contact with email already exists for this user
    const existingContact = await Contact.findOne({
      email: email.toLowerCase(),
      userId: req.user.id
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'Contact with this email already exists'
      });
    }

    const contact = new Contact({
      name,
      email: email.toLowerCase(),
      phone,
      company,
      position,
      tags,
      customFields,
      userId: req.user.id,
      source: 'manual'
    });

    await contact.save();

    logger.info(`Contact created: ${name} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact
    });

  } catch (error) {
    logger.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/contacts/:id
// @desc    Update contact
// @access  Private
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid contact ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail(),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('company').optional().trim().isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('tags').optional().isArray(),
  body('customFields').optional().isObject()
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

    const contact = await Contact.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (req.body.email && req.body.email !== contact.email) {
      const existingContact = await Contact.findOne({
        email: req.body.email.toLowerCase(),
        userId: req.user.id,
        _id: { $ne: req.params.id }
      });

      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: 'Contact with this email already exists'
        });
      }
    }

    // Update contact
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        if (key === 'email') {
          contact[key] = req.body[key].toLowerCase();
        } else {
          contact[key] = req.body[key];
        }
      }
    });

    await contact.save();

    logger.info(`Contact updated: ${contact.name} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });

  } catch (error) {
    logger.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/contacts/:id
// @desc    Delete contact
// @access  Private
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid contact ID')
], async (req, res) => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    logger.info(`Contact deleted: ${contact.name} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    logger.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/contacts/bulk
// @desc    Create multiple contacts
// @access  Private
router.post('/bulk', protect, [
  body('contacts').isArray().withMessage('Contacts must be an array'),
  body('contacts.*.name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
  body('contacts.*.email').isEmail().withMessage('Valid email is required')
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

    const { contacts } = req.body;
    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    for (let i = 0; i < contacts.length; i++) {
      const contactData = contacts[i];
      
      try {
        // Check if contact already exists
        const existingContact = await Contact.findOne({
          email: contactData.email.toLowerCase(),
          userId: req.user.id
        });

        if (existingContact) {
          results.skipped.push({
            index: i,
            email: contactData.email,
            reason: 'Contact already exists'
          });
          continue;
        }

        const contact = new Contact({
          ...contactData,
          email: contactData.email.toLowerCase(),
          userId: req.user.id,
          source: 'bulk_import'
        });

        await contact.save();
        results.created.push(contact);

      } catch (error) {
        results.errors.push({
          index: i,
          email: contactData.email,
          error: error.message
        });
      }
    }

    logger.info(`Bulk contact creation: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Bulk contact creation completed',
      data: results
    });

  } catch (error) {
    logger.error('Bulk create contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
