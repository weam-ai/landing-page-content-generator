const express = require('express');
const { body, validationResult } = require('express-validator');
// const { protect, authorize } = require('../middleware/auth');
const LandingPage = require('../models/LandingPage');
const logger = require('../utils/logger');

// Helper functions to extract components from content
function extractButtonsFromContent(content) {
  const buttonPatterns = [
    /(?:button|btn|cta|call to action)[\s\w]*:?\s*([^.!?\n]+)/gi,
    /(?:click|tap|press)\s+([^.!?\n]+)/gi,
    /(?:get started|learn more|view|explore|discover|try|start|begin)[\s\w]*/gi,
    /(?:sign up|sign in|login|register|subscribe|download|buy|purchase)[\s\w]*/gi
  ];
  
  const buttons = [];
  buttonPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.replace(/(?:button|btn|cta|call to action|click|tap|press)[\s\w]*:?\s*/gi, '').trim();
        if (cleanMatch && cleanMatch.length > 2 && cleanMatch.length < 50) {
          buttons.push(cleanMatch);
        }
      });
    }
  });
  
  return [...new Set(buttons)]; // Remove duplicates
}

function extractImagesFromContent(content) {
  const imagePatterns = [
    /([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|gif|svg|webp))/gi,
    /([a-zA-Z0-9_-]+_icon\.(?:jpg|jpeg|png|gif|svg|webp))/gi,
    /([a-zA-Z0-9_-]+_image\.(?:jpg|jpeg|png|gif|svg|webp))/gi,
    /([a-zA-Z0-9_-]+_logo\.(?:jpg|jpeg|png|gif|svg|webp))/gi,
    /([a-zA-Z0-9_-]+_bg\.(?:jpg|jpeg|png|gif|svg|webp))/gi,
    /([a-zA-Z0-9_-]+_thumbnail\.(?:jpg|jpeg|png|gif|svg|webp))/gi
  ];
  
  const images = [];
  imagePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (match && match.length > 3) {
          images.push(match);
        }
      });
    }
  });
  
  return [...new Set(images)]; // Remove duplicates
}

function extractLinksFromContent(content) {
  const linkPatterns = [
    /(?:link|url|href)[\s\w]*:?\s*([^.!?\n]+)/gi,
    /(?:navigate|go to|visit|check out)[\s\w]*:?\s*([^.!?\n]+)/gi,
    /(?:home|products|solutions|pricing|about|contact|support|help|documentation|blog|news)[\s\w]*/gi,
    /(?:facebook|twitter|linkedin|instagram|youtube|github|discord)[\s\w]*/gi
  ];
  
  const links = [];
  linkPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.replace(/(?:link|url|href|navigate|go to|visit|check out)[\s\w]*:?\s*/gi, '').trim();
        if (cleanMatch && cleanMatch.length > 2 && cleanMatch.length < 50) {
          links.push(cleanMatch);
        }
      });
    }
  });
  
  return [...new Set(links)]; // Remove duplicates
}

function extractMessagesFromContent(content) {
  const messagePatterns = [
    /(?:message|notification|alert|banner)[\s\w]*:?\s*([^.!?\n]+)/gi,
    /(?:welcome|hello|hi|greeting)[\s\w]*:?\s*([^.!?\n]+)/gi,
    /(?:success|error|warning|info)[\s\w]*:?\s*([^.!?\n]+)/gi
  ];
  
  const messages = [];
  messagePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.replace(/(?:message|notification|alert|banner|welcome|hello|hi|greeting|success|error|warning|info)[\s\w]*:?\s*/gi, '').trim();
        if (cleanMatch && cleanMatch.length > 2 && cleanMatch.length < 100) {
          messages.push(cleanMatch);
        }
      });
    }
  });
  
  return [...new Set(messages)]; // Remove duplicates
}

function extractItemsFromContent(content) {
  const itemPatterns = [
    /(?:item|feature|benefit|advantage|point)[\s\w]*:?\s*([^.!?\n]+)/gi,
    /(?:list|bullet|checklist)[\s\w]*:?\s*([^.!?\n]+)/gi,
    /(?:step|phase|stage)[\s\w]*:?\s*([^.!?\n]+)/gi
  ];
  
  const items = [];
  itemPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.replace(/(?:item|feature|benefit|advantage|point|list|bullet|checklist|step|phase|stage)[\s\w]*:?\s*/gi, '').trim();
        if (cleanMatch && cleanMatch.length > 2 && cleanMatch.length < 100) {
          items.push(cleanMatch);
        }
      });
    }
  });
  
  return [...new Set(items)]; // Remove duplicates
}

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
      
      // Process sections to handle both old and new formats
      req.body.sections = req.body.sections
        .filter(section => {
          // Check if section has content or components
          const hasContent = section && (
            (section.content && section.content.trim().length > 0) ||
            (section.components && Object.keys(section.components).length > 0)
          )
          if (!hasContent) {
            logger.warn('Filtering out section with no content or components:', section.id || 'unknown')
          }
          return hasContent
        })
        .map((section, index) => {
          // Handle new format with components
          if (section.components) {
            // Extract content from components for the main content field
            const mainContent = section.components.content || 
                               section.components.title || 
                               section.components.subtitle || 
                               'Generated content';
            
            return {
              id: section.id || `section-${index + 1}`,
              name: section.name,
              type: section.name?.toLowerCase().replace(/\s+/g, '-') || 'content',
              title: section.name || 'Section',
              content: mainContent,
              components: section.components,
              order: section.order || index + 1,
              pageNumber: section.pageNumber || 1,
              boundingBox: section.boundingBox || {
                x: 0,
                y: index * 200,
                width: 800,
                height: 200
              },
              extractedAt: new Date().toISOString()
            };
          } else {
            // Handle old format - create components from content
            const content = section.content ? section.content.trim() : `Content for ${section.title || section.type}`;
            return {
              id: section.id || `section-${index + 1}`,
              name: section.name || section.title || `Section ${index + 1}`,
              type: section.type || 'content',
              title: section.title || `Section ${index + 1}`,
              content: content,
              components: new Map(Object.entries({
                title: section.title || `Section ${index + 1}`,
                content: content,
                buttons: extractButtonsFromContent(content),
                images: extractImagesFromContent(content),
                links: extractLinksFromContent(content),
                messages: extractMessagesFromContent(content),
                items: extractItemsFromContent(content)
              })),
              order: section.order || index + 1,
              pageNumber: section.pageNumber || 1,
              boundingBox: section.boundingBox || {
                x: 0,
                y: index * 200,
                width: 800,
                height: 200
              },
              extractedAt: new Date().toISOString()
            };
          }
        })
      
      
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
  // Custom validation to handle both array directly or wrapped in sections property
  body().custom((value, { req }) => {
    const sections = req.body.sections || req.body;
    if (!Array.isArray(sections)) {
      throw new Error('Sections must be an array');
    }
    if (sections.length === 0) {
      throw new Error('At least one section is required');
    }
    return true;
  }),
  // Validate individual section properties
  body().custom((value, { req }) => {
    const sections = req.body.sections || req.body;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section.id || typeof section.id !== 'string' || section.id.trim() === '') {
        throw new Error(`Section ${i + 1}: ID is required`);
      }
      if (!section.name && !section.title) {
        throw new Error(`Section ${i + 1}: Name or title is required`);
      }
      // Content validation is more flexible - can be in content field or components
      const hasContent = section.content && section.content.trim().length > 0;
      const hasComponents = section.components && Object.keys(section.components).length > 0;
      if (!hasContent && !hasComponents) {
        throw new Error(`Section ${i + 1}: Content or components are required`);
      }
      if (section.order && (!Number.isInteger(section.order) || section.order < 1)) {
        throw new Error(`Section ${i + 1}: Order must be a positive integer`);
      }
    }
    return true;
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

    // Validate and clean sections before updating
    const sectionsToProcess = req.body.sections || req.body;
    if (sectionsToProcess && Array.isArray(sectionsToProcess)) {
      
      // Filter out sections with no content and ensure all required fields
      req.body.sections = sectionsToProcess
        .filter(section => {
          // Check for content in either content field or components
          const hasContent = section && (
            (section.content && section.content.trim().length > 0) ||
            (section.components && Object.keys(section.components).length > 0)
          )
          if (!hasContent) {
            console.log('Filtering out section with no content:', section);
          }
          return hasContent
        })
        .map((section, index) => {
          // Extract content from components if content field is empty
          let sectionContent = section.content || ''
          if (!sectionContent && section.components) {
            // Combine all component content into a single content string
            const componentContent = Object.values(section.components)
              .filter(component => component && String(component).trim())
              .map(component => {
                if (Array.isArray(component)) {
                  return component.filter(item => item && String(item).trim()).join(' ')
                }
                return String(component).trim()
              })
              .join(' ')
            sectionContent = componentContent
          }
          
          // Create components from content if they don't exist
          let components = new Map();
          if (section.components) {
            components = new Map(Object.entries(section.components));
          } else {
            // Extract components from content
            const content = sectionContent || `Content for ${section.title || `Section ${index + 1}`}`;
            components = new Map(Object.entries({
              title: section.title || `Section ${index + 1}`,
              content: content,
              buttons: extractButtonsFromContent(content),
              images: extractImagesFromContent(content),
              links: extractLinksFromContent(content),
              messages: extractMessagesFromContent(content),
              items: extractItemsFromContent(content)
            }));
          }
          
          return {
            id: section.id || `section-${index + 1}`,
            name: section.name || section.title || `Section ${index + 1}`,
            title: section.title || section.name || `Section ${index + 1}`,
            type: section.type || 'content',
            content: sectionContent || `Content for ${section.title || `Section ${index + 1}`}`,
            order: section.order || index + 1,
            pageNumber: section.pageNumber || 1,
            boundingBox: section.boundingBox || {
              x: 0,
              y: index * 120,
              width: 800,
              height: 200
            },
            // Store components properly in the components field
            components: components,
            extractedAt: new Date().toISOString()
          }
        })
      
      
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

    // Store both transformed sections (for database schema) and original sections (for frontend)
    landingPage.sections = req.body.sections;
    
    // Store original sections in a separate field for frontend compatibility
    if (req.body.originalSections) {
      landingPage.originalSections = req.body.originalSections;
    }
    
    await landingPage.save();

    logger.info('Landing page sections updated', { landingPageId: req.params.id });

    // Return the original sections if available, otherwise return transformed sections
    const responseData = {
      ...landingPage.toObject(),
      sections: landingPage.originalSections || landingPage.sections
    };

    res.json({
      success: true,
      data: responseData
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
