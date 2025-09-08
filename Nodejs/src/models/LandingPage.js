const mongoose = require('mongoose');

const LandingPageSectionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
    // Removed enum restriction to allow dynamic types from Figma
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: false,
    default: ''
  },
  order: {
    type: Number,
    required: true,
    min: 1
  },
  pageNumber: {
    type: Number,
    default: 1
  },
  boundingBox: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 800 },
    height: { type: Number, default: 600 }
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

const LandingPageSchema = new mongoose.Schema({
  user: {
    email: String,
    companyId: {
      type: mongoose.Schema.ObjectId,
      required: false,
      // ref: 'Company'
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      required: false,
      // ref: 'User'
    }
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  businessName: {
    type: String,
    required: [true, 'Please add a business name'],
    trim: true
  },
  businessOverview: {
    type: String,
    required: [true, 'Please add a business overview']
  },
  targetAudience: {
    type: String,
    required: [true, 'Please add target audience information']
  },
  brandTone: {
    type: String,
    enum: ['professional', 'friendly', 'playful', 'authoritative', 'casual'],
    required: false
  },
  websiteUrl: {
    type: String,
    match: [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      'Please add a valid URL'
    ]
  },
  designSource: {
    type: {
      type: String,
      enum: ['figma', 'pdf', 'manual'],
      required: false
    },
    url: String,
    fileName: String,
    fileSize: Number,
    processedAt: Date
  },
  sections: [LandingPageSectionSchema],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    customCSS: String,
    customJS: String
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  model: {
    type: String,
    default: 'gemini-pro'
  },
  meta: {
    title: String,
    description: String,
    keywords: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String
  },
  processSteps: {
    validation: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      data: {
        businessInfoValid: Boolean,
        extractedDataValid: Boolean,
        preferencesValid: Boolean,
        errors: [String]
      }
    },
    contentPlanning: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      data: {
        targetSections: [String],
        contentStrategy: String,
        toneAnalysis: String,
        audienceInsights: String
      }
    },
    designAnalysis: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      data: {
        layoutStructure: String,
        colorScheme: String,
        typography: String,
        responsiveDesign: String,
        accessibilityNotes: String
      }
    },
    contentGeneration: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      data: {
        sectionsGenerated: Number,
        contentQuality: String,
        seoOptimized: Boolean,
        conversionFocused: Boolean
      }
    },
    generateLandingPage: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      data: {
        htmlGenerated: Boolean,
        cssGenerated: Boolean,
        jsGenerated: Boolean,
        responsiveTested: Boolean,
        sectionsGenerated: Number,
        totalSections: Number,
        generationTime: Number,
        qualityScore: Number
      }
    },
    previewLandingPage: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      data: {
        previewGenerated: Boolean,
        previewUrl: String,
        sectionsPreviewed: Number,
        previewTime: Number,
        previewQuality: Number
      }
    },
    downloadLandingPage: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      data: {
        downloadPrepared: Boolean,
        downloadUrl: String,
        fileSize: Number,
        downloadFormat: String,
        downloadTime: Number
      }
    }
  },
  currentStep: {
    type: String,
    enum: ['validation', 'contentPlanning', 'designAnalysis', 'contentGeneration', 'generateLandingPage', 'previewLandingPage', 'downloadLandingPage', 'completed'],
    default: 'validation'
  }
}, {
  timestamps: true
});

// Index for better query performance
LandingPageSchema.index({ user: 1, createdAt: -1 });
LandingPageSchema.index({ status: 1, isPublic: 1 });
LandingPageSchema.index({ tags: 1 });

// Virtual for section count
LandingPageSchema.virtual('sectionCount').get(function() {
  return this.sections.length;
});

// Ensure virtual fields are serialized
LandingPageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('LandingPage', LandingPageSchema, 'solution_landing_page');
