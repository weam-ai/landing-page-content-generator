const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');
const config = require('../config/credencial_config');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1
  },
  fileFilter: fileFilter
});

// Define routes after middleware configuration
// Public upload route for PDF processing (no authentication required)
router.post('/public', upload.single('pdf'), async (req, res) => {
  try {
    logger.info('Public PDF upload attempt', {
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file'
    });
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // File information
    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date()
    };

    logger.info('Public PDF file uploaded successfully', {
      filename: req.file.filename,
      fileSize: req.file.size
    });

    
    const response = {
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        filePath: req.file.path, // Return the full file path for processing
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: fileInfo.uploadedAt
      }
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Public PDF upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during PDF upload'
    });
  }
});

// Apply authentication to all other routes
router.use(protect);

// @desc    Upload PDF file
// @route   POST /api/upload/pdf
// @access  Private
router.post('/pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // File information
    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.id,
      uploadedAt: new Date()
    };

    logger.info('PDF file uploaded successfully', {
      filename: req.file.filename,
      userId: req.user.id,
      fileSize: req.file.size
    });

    res.json({
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        fileId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: fileInfo.uploadedAt
      }
    });
  } catch (error) {
    logger.error('PDF upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during PDF upload'
    });
  }
});

// @desc    Process Figma URL
// @route   POST /api/upload/figma
// @access  Private
router.post('/figma', async (req, res) => {
  try {
    const { figmaUrl } = req.body;

    if (!figmaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Figma URL is required'
      });
    }

    // Validate Figma URL format
    const figmaUrlRegex = /^https:\/\/www\.figma\.com\/file\/[a-zA-Z0-9]+\/[^\/]+/;
    if (!figmaUrlRegex.test(figmaUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Figma URL format'
      });
    }

    // Extract file key from URL
    const fileKey = figmaUrl.split('/file/')[1]?.split('/')[0];
    
    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract file key from Figma URL'
      });
    }

    logger.info('Figma URL processed successfully', {
      figmaUrl,
      fileKey,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Figma URL processed successfully',
      data: {
        figmaUrl,
        fileKey,
        processedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Figma URL processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during Figma URL processing'
    });
  }
});

// @desc    Get upload status
// @route   GET /api/upload/status/:fileId
// @access  Private
router.get('/status/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join(__dirname, '../../uploads', fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);
    const fileInfo = {
      fileId,
      size: stats.size,
      uploadedAt: stats.birthtime,
      lastModified: stats.mtime
    };

    res.json({
      success: true,
      data: fileInfo
    });
  } catch (error) {
    logger.error('Get upload status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Delete uploaded file
// @route   DELETE /api/upload/:fileId
// @access  Private
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join(__dirname, '../../uploads', fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    logger.info('Uploaded file deleted', {
      fileId,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Delete uploaded file failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during file deletion'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Only one file allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field.'
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  logger.error('Upload error:', error);
  res.status(500).json({
    success: false,
    error: 'Server error during file upload'
  });
});

module.exports = router;
