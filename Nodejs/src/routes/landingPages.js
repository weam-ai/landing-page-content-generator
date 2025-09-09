const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const LandingPage = require('../models/LandingPage');
const logger = require('../utils/logger');

const router = express.Router();

// Public routes - no authentication required

// @desc    Get all landing pages
// @route   GET /api/landing-pages
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 18; // Changed default from 10 to 18
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // Build query filter based on companyId parameter
    let queryFilter = {};
    if (req.query.companyId) {
      queryFilter = { 'user.companyId': req.query.companyId };
    }
    
    const total = await LandingPage.countDocuments(queryFilter);

    const landingPages = await LandingPage.find(queryFilter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .select('-sections.content') // Don't include full content in list
      .populate('user', 'name email');

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    logger.info('Landing pages retrieved', { count: landingPages.length });

    res.json({
      success: true,
      count: total, // Return total count of all documents, not just current page
      pagination,
      data: landingPages
    });
  } catch (error) {
    logger.error('Get landing pages failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get single landing page
// @route   GET /api/landing-pages/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id)
      .populate('user', 'name email');

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        error: 'Landing page not found'
      });
    }

    logger.info('Landing page retrieved', { landingPageId: req.params.id });

    res.json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    logger.error('Get landing page failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Create new landing page
// @route   POST /api/landing-pages
// @access  Public
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title is required and must be less than 100 characters'),
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Business name is required'),
  body('businessOverview')
    .trim()
    .notEmpty()
    .withMessage('Business overview is required'),
  body('targetAudience')
    .trim()
    .notEmpty()
    .withMessage('Target audience is required'),
  body('brandTone')
    .optional()
    .isIn(['professional', 'friendly', 'playful', 'authoritative', 'casual'])
    .withMessage('Invalid brand tone'),
  body('websiteUrl')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty/null/undefined values
      }
      // If value exists, validate it's a proper URL
      const urlRegex = /^https?:\/\/.+/;
      return urlRegex.test(value) || 'Invalid website URL format';
    }),
  body('designSource.type')
    .optional()
    .isIn(['figma', 'pdf', 'manual'])
    .withMessage('Invalid design source type')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Validate and clean sections before saving
    if (req.body.sections && Array.isArray(req.body.sections)) {
      
      // Filter out sections with no content and ensure all required fields
      req.body.sections = req.body.sections
        .filter(section => {
          const hasContent = section && section.content && section.content.trim().length > 0
          if (!hasContent) {
          }
          return hasContent
        })
        .map((section, index) => ({
          id: section.id || `section-${index + 1}`,
          title: section.title || `Section ${index + 1}`,
          type: section.type || 'content',
          content: section.content.trim(),
          order: section.order || index + 1,
          pageNumber: section.pageNumber || 1,
          boundingBox: section.boundingBox || {
            x: 0,
            y: index * 120,
            width: 800,
            height: 200
          }
        }))
      
      
      // Ensure we have at least one section
      if (req.body.sections.length === 0) {
        req.body.sections = [{
          id: 'section-1',
          type: 'content',
          title: 'Welcome Section',
          content: '[Welcome Content - Customize as needed]',
          order: 1,
          pageNumber: 1,
          boundingBox: {
            x: 0,
            y: 0,
            width: 800,
            height: 200
          }
        }]
      }
    }

    // No user required for public access
    // req.body.user = req.user.id;

    const landingPage = await LandingPage.create(req.body);

    logger.info('Landing page created', { landingPageId: landingPage._id });

    res.status(201).json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    logger.error('Create landing page failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during creation'
    });
  }
});

// @desc    Update landing page
// @route   PUT /api/landing-pages/:id
// @access  Public
router.put('/:id', [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be less than 100 characters'),
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Business name must be less than 100 characters'),
  body('businessOverview')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Business overview must be less than 1000 characters'),
  body('targetAudience')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Target audience must be less than 500 characters'),
  body('brandTone')
    .optional()
    .isIn(['professional', 'friendly', 'playful', 'authoritative', 'casual'])
    .withMessage('Invalid brand tone'),
  body('websiteUrl')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty/null/undefined values
      }
      // If value exists, validate it's a proper URL
      const urlRegex = /^https?:\/\/.+/;
      return urlRegex.test(value) || 'Invalid website URL format';
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    let landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        error: 'Landing page not found'
      });
    }

    // No ownership check required for public access

    landingPage = await LandingPage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    logger.info('Landing page updated successfully', { 
      landingPageId: req.params.id,
      updatedFields: Object.keys(req.body)
    });

    res.json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    logger.error('Update landing page failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during update'
    });
  }
});

// @desc    Update landing page sections
// @route   PUT /api/landing-pages/:id/sections
// @access  Public
router.put('/:id/sections', [
  body('sections')
    .isArray()
    .withMessage('Sections must be an array'),
  body('sections.*.id')
    .trim()
    .notEmpty()
    .withMessage('Section ID is required'),
  body('sections.*.title')
    .trim()
    .notEmpty()
    .withMessage('Section title is required'),
  body('sections.*.content')
    .trim()
    .notEmpty()
    .withMessage('Section content is required'),
  body('sections.*.type')
    .trim()
    .notEmpty()
    .withMessage('Section type is required'),
  body('sections.*.order')
    .isInt({ min: 1 })
    .withMessage('Section order must be a positive integer')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    let landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        error: 'Landing page not found'
      });
    }

    // No ownership check required for public access

    // Validate and clean sections before updating
    if (req.body.sections && Array.isArray(req.body.sections)) {
      
      // Filter out sections with no content and ensure all required fields
      req.body.sections = req.body.sections
        .filter(section => {
          const hasContent = section && section.content && section.content.trim().length > 0
          if (!hasContent) {
          }
          return hasContent
        })
        .map((section, index) => ({
          id: section.id || `section-${index + 1}`,
          title: section.title || `Section ${index + 1}`,
          type: section.type || 'content',
          content: section.content.trim(),
          order: section.order || index + 1,
          pageNumber: section.pageNumber || 1,
          boundingBox: section.boundingBox || {
            x: 0,
            y: index * 120,
            width: 800,
            height: 200
          }
        }))
      
      
      // Ensure we have at least one section
      if (req.body.sections.length === 0) {
        req.body.sections = [{
          id: 'section-1',
          type: 'content',
          title: 'Welcome Section',
          content: '[Welcome Content - Customize as needed]',
          order: 1,
          pageNumber: 1,
          boundingBox: {
            x: 0,
            y: 0,
            width: 800,
            height: 200
          }
        }]
      }
    }

    // Update sections
    landingPage.sections = req.body.sections;
    await landingPage.save();

    logger.info('Landing page sections updated', { landingPageId: req.params.id });

    res.json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    logger.error('Update landing page sections failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during sections update'
    });
  }
});

// @desc    Delete landing page
// @route   DELETE /api/landing-pages/:id
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        error: 'Landing page not found'
      });
    }

    // No ownership check required for public access

    await landingPage.deleteOne();

    logger.info('Landing page deleted', { landingPageId: req.params.id });

    res.json({
      success: true,
      message: 'Landing page deleted successfully'
    });
  } catch (error) {
    logger.error('Delete landing page failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during deletion'
    });
  }
});

// @desc    Publish landing page
// @route   PUT /api/landing-pages/:id/publish
// @access  Public
router.put('/:id/publish', async (req, res) => {
  try {
    let landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        error: 'Landing page not found'
      });
    }

    // No ownership check required for public access

    // Check if landing page has sections
    if (!landingPage.sections || landingPage.sections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot publish landing page without sections'
      });
    }

    landingPage.status = 'published';
    landingPage.publishedAt = new Date();
    await landingPage.save();

    logger.info('Landing page published', { landingPageId: req.params.id });

    res.json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    logger.error('Publish landing page failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during publishing'
    });
  }
});

module.exports = router;
