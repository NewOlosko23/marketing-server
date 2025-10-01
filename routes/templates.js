import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import EmailTemplate from '../models/EmailTemplate.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @route   POST /api/templates
// @desc    Create email template
// @access  Private
router.post('/', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Template name is required (1-100 characters)'),
  body('subject').trim().isLength({ min: 1, max: 200 }).withMessage('Subject is required (1-200 characters)'),
  body('content.html').isLength({ min: 1 }).withMessage('HTML content is required'),
  body('content.text').isLength({ min: 1 }).withMessage('Text content is required'),
  body('category').optional().isIn(['welcome', 'newsletter', 'promotion', 'transactional', 'custom']),
  body('tags').optional().isArray(),
  body('variables').optional().isArray(),
  body('isPublic').optional().isBoolean()
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

    const { name, subject, content, category = 'custom', tags = [], variables = [], isPublic = false } = req.body;

    const template = new EmailTemplate({
      name,
      subject,
      content,
      category,
      tags,
      variables,
      isPublic,
      userId: req.user.id
    });

    await template.save();

    logger.info(`Email template created: ${name} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: { template }
    });

  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/templates
// @desc    Get email templates
// @access  Private
router.get('/', protect, [
  query('category').optional().isIn(['welcome', 'newsletter', 'promotion', 'transactional', 'custom']),
  query('search').optional().isString(),
  query('includePublic').optional().isBoolean()
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

    const { category, search, includePublic = true } = req.query;

    let query = { userId: req.user.id };
    
    if (includePublic) {
      query = { $or: [{ userId: req.user.id }, { isPublic: true }] };
    }
    
    if (category) {
      query.category = category;
    }

    let templates = await EmailTemplate.find(query).sort({ lastUsed: -1, createdAt: -1 });

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      templates = templates.filter(template => 
        template.name.match(searchRegex) || 
        template.subject.match(searchRegex) ||
        template.tags.some(tag => tag.match(searchRegex))
      );
    }

    res.json({
      success: true,
      data: { templates }
    });

  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/templates/:id
// @desc    Get template details
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid template ID')
], async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      $or: [{ userId: req.user.id }, { isPublic: true }]
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: { template }
    });

  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/templates/:id
// @desc    Update template
// @access  Private
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid template ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('subject').optional().trim().isLength({ min: 1, max: 200 }),
  body('content.html').optional().isLength({ min: 1 }),
  body('content.text').optional().isLength({ min: 1 }),
  body('category').optional().isIn(['welcome', 'newsletter', 'promotion', 'transactional', 'custom']),
  body('tags').optional().isArray(),
  body('variables').optional().isArray(),
  body('isPublic').optional().isBoolean()
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

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or not owned by user'
      });
    }

    Object.assign(template, req.body);
    await template.save();

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: { template }
    });

  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete template
// @access  Private
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid template ID')
], async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or not owned by user'
      });
    }

    await EmailTemplate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/templates/:id/render
// @desc    Render template with variables
// @access  Private
router.post('/:id/render', protect, [
  param('id').isMongoId().withMessage('Invalid template ID'),
  body('variables').isObject().withMessage('Variables must be an object')
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

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      $or: [{ userId: req.user.id }, { isPublic: true }]
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const rendered = template.render(req.body.variables || {});

    res.json({
      success: true,
      data: { rendered }
    });

  } catch (error) {
    logger.error('Render template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/templates/categories
// @desc    Get template categories
// @access  Private
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await EmailTemplate.aggregate([
      { $match: { $or: [{ userId: req.user.id }, { isPublic: true }] } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    logger.error('Get template categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
