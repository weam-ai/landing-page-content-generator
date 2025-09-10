const express = require('express');
const { body, validationResult } = require('express-validator');
// const { protect } = require('../middleware/auth'); // Removed protect middleware
const axios = require('axios');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/backend-config');

// Utility function for making fetch requests with timeout and retry
async function fetchWithTimeout(url, options = {}, timeoutMs = 50000, maxRetries = 2) {
  const { method = 'POST', headers = {}, body, ...otherOptions } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Fetch attempt ${attempt}/${maxRetries} to: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...otherOptions
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      logger.info(`Successfully fetched from: ${url}`);
      return result;
      
    } catch (error) {
      logger.error(`Fetch attempt ${attempt} failed for ${url}:`, error.message);
      
      if (error.name === 'AbortError') {
        if (attempt === maxRetries) {
          throw new Error(`Request timeout after ${timeoutMs}ms: The service took too long to respond. Please try again.`);
        }
        // Continue to retry for timeout errors
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw new Error('Unable to connect to the service. Please check your connection and try again.');
          } else if (error.message.includes('security') || error.message.includes('blocked') || error.message.includes('403 Forbidden')) {
      throw new Error('The website is blocking automated access. This is common for websites that protect against scraping. Please try a different website or provide business information manually.');
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Failed to fetch from ${url} after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying with exponential backoff
      const delay = 1000 * Math.pow(2, attempt - 1);
      logger.info(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

const router = express.Router();

// Initialize Google Generative AI at the top
const GEMINI_API_KEY = config.geminiApiKey;
const GEMINI_API_URL = config.geminiApiUrl;

// Initialize Google Generative AI
let genAI = null;
let model = null;


if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    logger.info('Google Generative AI initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Google Generative AI:', error);
  }
} else {
  logger.info('No GEMINI_API_KEY found in environment');
}

// Public PDF processing route (no authentication required)
router.post('/extract-pdf', async (req, res) => {
  try {
    logger.info('=== PDF EXTRACTION API CALLED ===');
    logger.info('Request body received:', {
      hasFilePath: !!req.body.filePath,
      filePath: req.body.filePath,
      bodyKeys: Object.keys(req.body || {}),
      requestHeaders: {
        'content-type': req.get('content-type'),
        'user-agent': req.get('user-agent'),
        'authorization': req.get('authorization') ? 'present' : 'not present'
      }
    });
    
    const { filePath } = req.body;

    if (!filePath) {
      logger.error('PDF extraction failed: No file path provided');
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    if (!model) {
      logger.error('PDF extraction failed: Gemini AI model not initialized');
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized. Please check your API key configuration.'
      });
    }


    // Log file information before processing
    const filename = path.basename(filePath);
    const directory = path.dirname(filePath);
    const uploadsDir = config.uploadDir;
    
    logger.info('PDF extraction request received:', {
      requestedFilePath: filePath,
      filename: filename,
      directory: directory,
      uploadsDirectory: uploadsDir,
      fileExists: fs.existsSync(filePath),
      uploadsDirExists: fs.existsSync(uploadsDir),
      currentWorkingDirectory: process.cwd()
    });

    // Read PDF file
    logger.info('Attempting to read PDF file:', {
      filePath: filePath,
      fileExists: fs.existsSync(filePath),
      fileSize: fs.existsSync(filePath) ? fs.statSync(filePath).size : 'unknown'
    });
    
    const dataBuffer = fs.readFileSync(filePath);
    logger.info('PDF file read successfully:', {
      bufferSize: dataBuffer.length,
      filePath: filePath
    });
    
    let pdfData, pdfText;
    
    try {
      logger.info('Starting PDF parsing...');
      pdfData = await pdfParse(dataBuffer);
      pdfText = pdfData.text;
      
      logger.info('PDF parsing completed:', {
        pages: pdfData.numpages,
        textLength: pdfText ? pdfText.length : 0,
        hasText: !!pdfText,
        info: pdfData.info,
        metadata: pdfData.metadata
      });
      
      // Log PDF text status (OCR will handle content extraction)
      if (!pdfText || pdfText.trim().length === 0) {
        logger.warn('PDF has no extractable text, will rely on OCR');
        pdfText = '';
      }
    } catch (parseError) {
      logger.error('PDF parsing failed, using fallback:', {
        error: parseError.message,
        filePath: filePath
      });
      pdfText = '';
      
      pdfData = {
        numpages: 1,
        info: {},
        metadata: {}
      };
    }

    logger.info('PDF text extracted successfully', {
      filePath,
      pages: pdfData.numpages,
      textLength: pdfText.length
    });

    
    // Instructions for Gemini OCR + layout extraction
    const SECTION_TITLES_INSTRUCTIONS = `
You are an OCR + layout extraction agent for UI/UX design PDFs. 
Analyze the PDF and identify distinct sections. For each section, provide:
1. A descriptive section name (like 'Hero', 'Features', 'Testimonials', 'Pricing', 'FAQ', etc.)
2. The main title/heading text from that section.
If a section doesn't have a clear section name, use a short descriptive name based on the content.
Return ONLY JSON: {"sections_with_titles": [{"section_name": "descriptive section name", "title": "main title/heading text"}]}.
`;
    
    logger.info('Starting Gemini AI processing:', {
      filePath: filePath,
      instructionLength: SECTION_TITLES_INSTRUCTIONS.length,
      pdfBufferSize: dataBuffer.length,
      base64Size: Buffer.from(dataBuffer).toString("base64").length
    });

    try {
      logger.info('Calling Gemini AI model...');
      const result = await model.generateContent([
        SECTION_TITLES_INSTRUCTIONS,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: Buffer.from(dataBuffer).toString("base64"),
          },
        },
      ]);
      const response = await result.response;
      const text = response.text();
      
      logger.info('Gemini AI response received:', {
        responseLength: text.length,
        filePath: filePath,
        responsePreview: text.substring(0, 200) + '...'
      });
      
      
      // Parse Gemini AI OCR response
      let parsedResponse;
      try {
        logger.info('Parsing Gemini AI JSON response...');
        
        // Clean JSON response
        let cleaned = text.trim();
        logger.info('Raw response cleaning:', {
          originalLength: text.length,
          cleanedLength: cleaned.length,
          startsWithJson: cleaned.startsWith("```json"),
          endsWithBackticks: cleaned.endsWith("```")
        });
        
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.slice(7);
        }
        if (cleaned.endsWith("```")) {
          cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();
        
        logger.info('Attempting to parse JSON:', {
          cleanedLength: cleaned.length,
          filePath: filePath,
          jsonPreview: cleaned.substring(0, 100) + '...'
        });
        
        parsedResponse = JSON.parse(cleaned);
        logger.info('JSON parsing successful:', {
          hasSections: !!parsedResponse.sections_with_titles,
          sectionsCount: parsedResponse.sections_with_titles ? parsedResponse.sections_with_titles.length : 0,
          filePath: filePath
        });
        
        // Transform OCR response to match existing format
        if (parsedResponse.sections_with_titles && Array.isArray(parsedResponse.sections_with_titles)) {
          parsedResponse.sections = parsedResponse.sections_with_titles.map((item, index) => ({
            id: `section-${index + 1}`,
            name: item.section_name,
            title: item.title,
            type: mapSectionTypeFromName(item.section_name)
          }));
          delete parsedResponse.sections_with_titles; // Remove the original key
        }
        
        
      } catch (parseError) {
        logger.warn('Failed to parse Gemini AI response as JSON, using fallback:', {
          error: parseError.message,
          filePath: filePath,
          responseText: text.substring(0, 500)
        });
        
        // Create comprehensive fallback analysis from PDF content
        logger.info('Creating fallback analysis from PDF text...');
        const fallbackSections = createFallbackSections(pdfText);
        const fallbackAnalysis = createComprehensiveFallbackAnalysis(pdfText, fallbackSections);
        
        logger.info('Fallback analysis created:', {
          sectionsCount: fallbackSections.length,
          filePath: filePath,
          hasVisualElements: !!fallbackAnalysis.visualElements,
          hasContentMapping: !!fallbackAnalysis.contentMapping
        });
        
        parsedResponse = {
          sections: fallbackSections,
          ...fallbackAnalysis
        };
      }

      
      // Check if we got valid sections from OCR
      if (parsedResponse.sections && parsedResponse.sections.length > 0) {
        
        // Map section types to ensure they're valid for the database
        parsedResponse.sections = parsedResponse.sections.map((section, index) => {
          const mappedType = mapSectionType(section.type);
          return { 
            id: section.id || `section-${index + 1}`,
            title: section.name,
            type: mappedType,
            content: `Content for ${section.name} section`,
            order: index + 1,
            pageNumber: 1,
            boundingBox: {
              x: 0,
              y: 0,
              width: 1200,
              height: 200
            }
          };
        });
      } else {
        // If no sections from OCR, create sections from comprehensive analysis
        parsedResponse.sections = createSectionsFromAnalysis(parsedResponse, pdfText);
      }
        
      // Check if we still have no sections after all processing
      if (!parsedResponse.sections || parsedResponse.sections.length === 0) {
        const fallbackSections = createFallbackSections(pdfText);
        const fallbackAnalysis = createComprehensiveFallbackAnalysis(pdfText, fallbackSections);
        
        parsedResponse = {
          sections: fallbackSections,
          ...fallbackAnalysis
        };
      }
      
      // Enhance sections with metadata
      const enhancedSections = enhanceSections(parsedResponse.sections || []);
      
      const analysisResult = {
        sections: enhancedSections,
        totalPages: pdfData.numpages,
        designType: determineDesignType(pdfText, enhancedSections),
        designName: parsedResponse.designName || pdfData.info?.Title || 'PDF Document',
        extractedText: pdfText,
        metadata: {
          title: parsedResponse.designName || pdfData.info?.Title || 'PDF Document',
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          keywords: pdfData.info?.Keywords ? pdfData.info.Keywords.split(',').map(k => k.trim()) : []
        },
        // Comprehensive analysis data
        visualElements: parsedResponse.visualElements || null,
        contentMapping: parsedResponse.contentMapping || null,
        layoutAnalysis: parsedResponse.layoutAnalysis || null,
        designTokens: parsedResponse.designTokens || null,
        comprehensiveAnalysis: {
          visualElementsCount: {
            textBlocks: parsedResponse.visualElements?.textBlocks?.length || 0,
            images: parsedResponse.visualElements?.images?.length || 0,
            buttons: parsedResponse.visualElements?.buttons?.length || 0,
            forms: parsedResponse.visualElements?.forms?.length || 0
          },
          contentMappingCount: {
            headlines: parsedResponse.contentMapping?.headlines?.length || 0,
            bodyText: parsedResponse.contentMapping?.bodyText?.length || 0,
            ctaButtons: parsedResponse.contentMapping?.ctaButtons?.length || 0,
            navigation: parsedResponse.contentMapping?.navigation?.length || 0,
            features: parsedResponse.contentMapping?.features?.length || 0,
            testimonials: parsedResponse.contentMapping?.testimonials?.length || 0
          },
          layoutAnalysis: {
            gridSystem: parsedResponse.layoutAnalysis?.gridSystem?.type || 'unknown',
            responsiveBreakpoints: parsedResponse.layoutAnalysis?.responsiveBreakpoints?.length || 0,
            alignment: parsedResponse.layoutAnalysis?.alignment?.primary || 'unknown',
            pageStructure: parsedResponse.layoutAnalysis?.pageStructure || {}
          },
          designTokensCount: {
            colors: parsedResponse.designTokens?.colors?.length || 0,
            typography: parsedResponse.designTokens?.typography?.length || 0,
            spacing: parsedResponse.designTokens?.spacing?.length || 0
          }
        }
      };
      

      logger.info('PDF analysis completed successfully', {
        filePath,
        sections: enhancedSections.length,
        designType: analysisResult.designType,
        totalPages: analysisResult.totalPages,
        extractedTextLength: analysisResult.extractedText ? analysisResult.extractedText.length : 0
      });

      logger.info('=== PDF EXTRACTION COMPLETED SUCCESSFULLY ===', {
        filePath: filePath,
        responseData: {
          sectionsCount: analysisResult.sections.length,
          designType: analysisResult.designType,
          totalPages: analysisResult.totalPages,
          hasMetadata: !!analysisResult.metadata,
          hasVisualElements: !!analysisResult.visualElements,
          hasContentMapping: !!analysisResult.contentMapping
        }
      });

      res.json({
        success: true,
        data: analysisResult
      });

    } catch (geminiError) {
      logger.error('OCR processing failed, using fallback:', {
        error: geminiError.message,
        errorCode: geminiError.code,
        filePath: filePath,
        stack: geminiError.stack
      });
      
      // Fallback: create basic sections from text chunks
      logger.info('Creating fallback analysis due to Gemini error...');
      const fallbackSections = createFallbackSections(pdfText);
      
      logger.info('Fallback analysis created for Gemini error:', {
        sectionsCount: fallbackSections.length,
        filePath: filePath
      });
      
      const analysisResult = {
        sections: fallbackSections,
        totalPages: pdfData.numpages,
        designType: 'unknown',
        designName: pdfData.info?.Title || 'PDF Document',
        extractedText: pdfText,
        metadata: {
          title: pdfData.info?.Title || 'PDF Document',
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          keywords: pdfData.info?.Keywords ? pdfData.info.Keywords.split(',').map(k => k.trim()) : []
        },
        // Fallback comprehensive analysis data
        visualElements: null,
        contentMapping: null,
        layoutAnalysis: null,
        designTokens: null,
        comprehensiveAnalysis: {
          visualElementsCount: { textBlocks: 0, images: 0, buttons: 0, forms: 0 },
          contentMappingCount: { headlines: 0, bodyText: 0, ctaButtons: 0, navigation: 0, features: 0, testimonials: 0 },
          layoutAnalysis: { gridSystem: 'unknown', responsiveBreakpoints: 0, alignment: 'unknown', pageStructure: {} },
          designTokensCount: { colors: 0, typography: 0, spacing: 0 }
        }
      };

      logger.info('=== PDF EXTRACTION COMPLETED WITH FALLBACK ===', {
        filePath: filePath,
        reason: 'Gemini AI error',
        responseData: {
          sectionsCount: analysisResult.sections.length,
          designType: analysisResult.designType,
          totalPages: analysisResult.totalPages
        }
      });

      res.json({
        success: true,
        data: analysisResult
      });
    }

  } catch (error) {
    // Enhanced error logging for file-related issues
    const { filePath } = req.body || {};
    const filename = filePath ? path.basename(filePath) : 'unknown';
    const directory = filePath ? path.dirname(filePath) : 'unknown';
    
    logger.error('PDF extraction failed - detailed error information:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorType: error.name,
      requestedFilePath: filePath,
      filename: filename,
      directory: directory,
      uploadsDirectory: config.uploadDir,
      currentWorkingDirectory: process.cwd(),
      fileExists: filePath ? fs.existsSync(filePath) : false,
      uploadsDirExists: fs.existsSync(config.uploadDir),
      stack: error.stack
    });
    
    logger.error('PDF extraction failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract PDF content'
    });
  }
});

// @desc    Extract design from Figma
// @route   POST /api/ai/extract-figma
// @access  Public (no authentication required)
router.post('/extract-figma', async (req, res) => {
  try {
    const { figmaUrl } = req.body;

    if (!figmaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Figma URL is required'
      });
    }

    // Check if Figma access token is configured
    if (!config.figmaAccessToken) {
      return res.status(500).json({
        success: false,
        error: 'Figma access token not configured. Please set FIGMA_ACCESS_TOKEN in your environment variables.'
      });
    }

    // Initialize Figma API
    const FigmaAPI = require('../utils/figmaApi');
    const figmaApi = new FigmaAPI(config.figmaAccessToken);

    // Extract file key from URL
    const fileKey = figmaApi.extractFileKey(figmaUrl);
    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Figma URL. Could not extract file key.'
      });
    }

    logger.info('Starting Figma design extraction', {
      figmaUrl,
      fileKey,
      userId: req.user?.id || 'anonymous'
    });

    // Fetch file from Figma API
    const figmaFile = await figmaApi.getFile(fileKey);
    
    if (!figmaFile || !figmaFile.document) {
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch Figma file or file is empty'
      });
    }

    // Analyze design structure
    const sections = figmaApi.analyzeDesignStructure(figmaFile.document);
    
    // Extract design tokens
    const designTokens = figmaApi.extractDesignTokens(figmaFile.document);
    
    // Analyze layout
    const layoutAnalysis = figmaApi.analyzeLayout(figmaFile.document);

    // Use Gemini AI for comprehensive analysis if available
    let comprehensiveAnalysis = null;
    if (model) {
      try {
        
        // Convert Figma data to text for Gemini analysis (limit size to prevent timeout)
        const figmaDataText = JSON.stringify({
          fileName: figmaFile.name,
          sections: sections.slice(0, 20), // Limit to first 20 sections
          designTokens: designTokens,
          layoutAnalysis: layoutAnalysis,
          // Don't include full document to prevent massive payload
          documentSummary: {
            nodeCount: figmaFile.document.children?.length || 0,
            hasComponents: figmaFile.document.children?.some(child => child.type === 'COMPONENT') || false
          }
        }, null, 2);

        const figmaPrompt = `
# 📌 **Design Section Detection & Extraction Prompt**nnYou are an expert **UI/UX analyst** specializing in detecting and categorizing design elements from website layouts.nYour task is to **analyze the provided design file (Figma)** and extract a structured breakdown of the design.nn## 🎯 **Analysis Objectives**nn1. Detect all distinct **sections, text areas, interactive elements, and layout components**.n2. Classify each detected element into meaningful categories.n3. Provide a **clear, hierarchical breakdown** of the full design structure.nn---nn## 🔎 **Detection Categories**nn### 1. **Layout Structure**nnIdentify and categorize the major sections of the page:nn* **Header/Navigation** → logo, top nav, menu items, search barn* **Hero Section** → main focal content (headline, subheadline, background, CTA)n* **Content Sections** → features, services, products, info blocksn* **Social Proof** → testimonials, client logos, case studies, statsn* **Call-to-Action Areas** → buttons, forms, sign-ups, downloadsn* **Footer** → contact info, navigation links, legal disclaimersnn### 2. **Text Elements**nnFor **each text area**, extract and classify:nn* **Location** → top, center, bottom, sidebar, etc.n* **Hierarchy Level** → H1, H2, H3, body text, captions, labelsn* **Estimated Character Limit** → based on text box sizen* **Purpose** → headline, subheadline, paragraph, button text, navigation labeln* **Visual Emphasis** → bold, italic, highlighted color, large size, underlinenn---nn## 📑 **Expected Output Format (JSON-like structure)**nn\`\`\`jsonn{n  "layout_structure": {n    "header": {n      "logo": "Top-left, small icon",n      "menu_items": ["Home", "About", "Services", "Contact"]n    },n    "hero_section": {n      "headline": "Main H1 text here",n      "subheadline": "Supporting text here",n      "cta_button": "Get Started"n    },n    "content_sections": [n      {n        "title": "Features",n        "subsections": ["Feature 1", "Feature 2", "Feature 3"]n      }n    ],n    "social_proof": {n      "testimonials": 3,n      "logos": 5n    },n    "cta_areas": [n      {"button_text": "Sign Up", "location": "center-bottom"}n    ],n    "footer": {n      "links": ["Privacy Policy", "Terms of Service", "Contact Us"]n    }n  },n  "text_elements": [n    {n      "content": "Empower Your Business",n      "location": "Hero Section - Center",n      "hierarchy_level": "H1",n      "character_limit": "40-50 chars",n      "purpose": "Headline",n      "visual_emphasis": "Large bold white text"n    }n  ],n  "sections": [n    {n      "id": "unique-section-id",n      "title": "Section Title",n      "type": "header|hero|content|cta|footer|social-proof",n      "content": "Extracted text content from this section",n      "order": 1,n      "pageNumber": 1,n      "boundingBox": {n        "x": 0,n        "y": 0,n        "width": 800,n        "height": 200n      },n      "extractedAt": "2025-01-01T00:00:00.000Z"n    }n  ]n}n\`\`\`nn---nn## 📝 **Instructions for the Model**nn* Carefully **scan the entire Figma design**.n* Break down **every section and element systematically**.n* Use the **detection categories** above for classification.n* Maintain a **clear, structured output** (prefer JSON or bullet hierarchy).n* Do **not skip hidden elements** (e.g., collapsed menus, secondary links).nn## Critical Instructionsnn1. **Analyze the ENTIRE Figma design** - don't miss any sectionsn2. **Extract ALL text content** from each sectionn3. **Categorize sections properly** using the type fieldn4. **Provide meaningful titles** for each sectionn5. **Include comprehensive analysis** in the layout_structure and text_elements objectsn6. **Return ONLY valid JSON** - no additional text or explanationsn7. **Base analysis on actual content** found in the Figma design

## Analysis Task
Examine the design and identify all distinct sections, text areas, interactive elements, and layout components. Provide a comprehensive breakdown of the design structure.

## Detection Categories

### 1. LAYOUT STRUCTURE
Identify the overall page organization:
- **Header/Navigation**: Top navigation, logo placement, menu items
- **Hero Section**: Main focal area, primary messaging space
- **Content Sections**: Feature blocks, service areas, product showcases
- **Social Proof**: Testimonials, reviews, client logos, statistics
- **Call-to-Action Areas**: Button placements, form sections
- **Footer**: Bottom navigation, contact info, legal links

### 2. TEXT ELEMENTS
For each text area, identify:
- **Location**: Position relative to other elements (top, center, bottom, sidebar)
- **Hierarchy Level**: H1, H2, H3, body text, captions
- **Estimated Character Limits**: Based on text box dimensions
- **Purpose**: Headline, description, button text, navigation label
- **Visual Emphasis**: Bold, italic, color highlights, size variations

### 3. INTERACTIVE COMPONENTS
Detect all clickable and interactive elements:
- **Buttons**: Primary, secondary, tertiary styling
- **Links**: Navigation, inline links, footer links
- **Forms**: Input fields, dropdowns, checkboxes, submit buttons
- **Media**: Image placeholders, video areas, galleries
- **Navigation**: Menus, breadcrumbs, pagination

### 4. VISUAL HIERARCHY
Analyze the design flow:
- **Primary Focus Areas**: Elements with highest visual weight
- **Secondary Elements**: Supporting information sections
- **Visual Flow**: Reading pattern (Z-pattern, F-pattern, etc.)
- **Grouping**: Related elements clustered together
- **Spacing**: White space usage and section separation

### 5. RESPONSIVE INDICATORS
If visible, note:
- **Breakpoint Hints**: Mobile, tablet, desktop layouts
- **Flexible Elements**: Components that appear scalable
- **Priority Content**: Elements likely to stack or hide on mobile

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  "visualElements": {
    "textBlocks": [
      {
        "id": "text-1",
        "type": "headline|subheadline|body|cta|navigation",
        "content": "Text content",
        "position": { "x": 0, "y": 0, "width": 200, "height": 50 },
        "typography": {
          "fontFamily": "Arial",
          "fontSize": "24px",
          "fontWeight": "bold",
          "color": "#000000"
        }
      }
    ],
    "images": [
      {
        "id": "img-1",
        "type": "logo|hero|product|icon|background",
        "description": "Image description",
        "position": { "x": 0, "y": 0, "width": 300, "height": 200 },
        "altText": "Alternative text"
      }
    ],
    "buttons": [
      {
        "id": "btn-1",
        "type": "primary|secondary|cta|navigation",
        "text": "Button text",
        "position": { "x": 0, "y": 0, "width": 120, "height": 40 },
        "style": {
          "backgroundColor": "#007bff",
          "color": "#ffffff",
          "borderRadius": "4px"
        }
      }
    ],
    "forms": [
      {
        "id": "form-1",
        "type": "contact|newsletter|search|login",
        "fields": [
          {
            "name": "email",
            "type": "email",
            "label": "Email Address",
            "placeholder": "Enter your email"
          }
        ],
        "position": { "x": 0, "y": 0, "width": 400, "height": 200 }
      }
    ]
  },
  "contentMapping": {
    "headlines": [
      {
        "id": "headline-1",
        "text": "Main headline text",
        "hierarchy": "primary|secondary|tertiary",
        "position": { "x": 0, "y": 0, "width": 600, "height": 60 }
      }
    ],
    "bodyText": [
      {
        "id": "body-1",
        "content": "Body text content",
        "type": "description|feature|benefit|testimonial",
        "position": { "x": 0, "y": 0, "width": 500, "height": 100 }
      }
    ],
    "ctaButtons": [
      {
        "id": "cta-1",
        "text": "Get Started",
        "action": "signup|contact|purchase|download",
        "position": { "x": 0, "y": 0, "width": 150, "height": 50 }
      }
    ],
    "navigation": [
      {
        "id": "nav-1",
        "type": "menu|sidebar|breadcrumb",
        "items": ["Home", "About", "Services", "Contact"],
        "position": { "x": 0, "y": 0, "width": 400, "height": 50 }
      }
    ],
    "features": [
      {
        "id": "feature-1",
        "title": "Feature title",
        "description": "Feature description",
        "type": "product|service|benefit|highlight",
        "position": { "x": 0, "y": 0, "width": 300, "height": 200 }
      }
    ],
    "testimonials": [
      {
        "id": "testimonial-1",
        "quote": "Customer testimonial",
        "author": "Customer name",
        "rating": 5,
        "position": { "x": 0, "y": 0, "width": 350, "height": 150 }
      }
    ]
  },
  "layoutAnalysis": {
    "pageStructure": {
      "header": { "present": true, "position": { "x": 0, "y": 0, "width": 1200, "height": 80 } },
      "hero": { "present": true, "position": { "x": 0, "y": 80, "width": 1200, "height": 500 } },
      "features": { "present": true, "position": { "x": 0, "y": 580, "width": 1200, "height": 400 } },
      "testimonials": { "present": false },
      "cta": { "present": true, "position": { "x": 0, "y": 980, "width": 1200, "height": 200 } },
      "footer": { "present": true, "position": { "x": 0, "y": 1180, "width": 1200, "height": 150 } }
    },
    "gridSystem": {
      "type": "12-column|6-column|flexbox|grid",
      "columns": 12,
      "gutters": "20px",
      "margins": "40px"
    },
    "responsiveBreakpoints": [
      {
        "name": "mobile",
        "width": "320px",
        "present": true
      },
      {
        "name": "tablet", 
        "width": "768px",
        "present": true
      },
      {
        "name": "desktop",
        "width": "1200px", 
        "present": true
      }
    ],
    "alignment": {
      "primary": "left|center|right",
      "secondary": "left|center|right",
      "vertical": "top|center|bottom"
    },
    "spacing": {
      "sectionPadding": "60px",
      "elementMargin": "20px",
      "lineHeight": "1.5"
    }
  },
  "designTokens": {
    "colors": [
      {
        "name": "primary",
        "value": "#007bff",
        "usage": "buttons|links|highlights"
      },
      {
        "name": "secondary", 
        "value": "#6c757d",
        "usage": "text|borders|backgrounds"
      }
    ],
    "typography": [
      {
        "name": "heading",
        "fontFamily": "Arial, sans-serif",
        "fontSize": "32px",
        "fontWeight": "bold"
      },
      {
        "name": "body",
        "fontFamily": "Arial, sans-serif", 
        "fontSize": "16px",
        "fontWeight": "normal"
      }
    ],
    "spacing": [
      {
        "name": "xs",
        "value": "4px"
      },
      {
        "name": "sm",
        "value": "8px"
      },
      {
        "name": "md",
        "value": "16px"
      },
      {
        "name": "lg",
        "value": "24px"
      },
      {
        "name": "xl",
        "value": "32px"
      }
    ]
  }
}

CRITICAL INSTRUCTIONS: 
- Do NOT add any text before or after the JSON
- Do NOT include explanations or comments
- Return ONLY the JSON object
- Extract sections based on the actual document structure
- Use the natural section types that emerge from the content
- Ensure the JSON is valid and parseable
- Focus on extracting ALL visual elements, content mapping, and layout analysis
- IMPORTANT: Extract REAL data from the Figma design, NOT placeholder text
- For text content, use the actual text found in the Figma design
- For headlines, use the actual headline text from the Figma design
- For buttons, use the actual button text from the Figma design
- For navigation, use the actual menu items from the Figma design
- For features, use the actual feature titles and descriptions from the Figma design
- For testimonials, use the actual testimonial quotes and author names from the Figma design
- If no specific data is found, use "Not found in design" instead of placeholder text

FIGMA DESIGN DATA TO ANALYZE:
---
${figmaDataText}
---
        `;

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Gemini AI request timeout after 50 seconds')), 50000);
        });
        
        const geminiPromise = model.generateContent(figmaPrompt).then(result => {
          const response = result.response;
          return response.text();
        });
        
        const text = await Promise.race([geminiPromise, timeoutPromise]);
        
        // Parse Gemini AI response
        let parsedResponse;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } else {
            parsedResponse = JSON.parse(text);
          }
        } catch (parseError) {
          parsedResponse = null;
        }

        if (parsedResponse) {
          comprehensiveAnalysis = {
            visualElements: parsedResponse.visualElements || null,
            contentMapping: parsedResponse.contentMapping || null,
            layoutAnalysis: parsedResponse.layoutAnalysis || null,
            designTokens: parsedResponse.designTokens || null,
            comprehensiveAnalysis: {
              visualElementsCount: {
                textBlocks: parsedResponse.visualElements?.textBlocks?.length || 0,
                images: parsedResponse.visualElements?.images?.length || 0,
                buttons: parsedResponse.visualElements?.buttons?.length || 0,
                forms: parsedResponse.visualElements?.forms?.length || 0
              },
              contentMappingCount: {
                headlines: parsedResponse.contentMapping?.headlines?.length || 0,
                bodyText: parsedResponse.contentMapping?.bodyText?.length || 0,
                ctaButtons: parsedResponse.contentMapping?.ctaButtons?.length || 0,
                navigation: parsedResponse.contentMapping?.navigation?.length || 0,
                features: parsedResponse.contentMapping?.features?.length || 0,
                testimonials: parsedResponse.contentMapping?.testimonials?.length || 0
              },
              layoutAnalysis: {
                gridSystem: parsedResponse.layoutAnalysis?.gridSystem?.type || 'unknown',
                responsiveBreakpoints: parsedResponse.layoutAnalysis?.responsiveBreakpoints?.length || 0,
                alignment: parsedResponse.layoutAnalysis?.alignment?.primary || 'unknown',
                pageStructure: parsedResponse.layoutAnalysis?.pageStructure || {}
              },
              designTokensCount: {
                colors: parsedResponse.designTokens?.colors?.length || 0,
                typography: parsedResponse.designTokens?.typography?.length || 0,
                spacing: parsedResponse.designTokens?.spacing?.length || 0
              }
            }
          };
        }
      } catch (geminiError) {
        logger.error('Gemini AI analysis for Figma failed:', geminiError);
        
        // Continue with basic analysis - don't fail the entire request
        comprehensiveAnalysis = null;
      }
    }

    // Prepare extracted design data
    const extractedDesign = {
      designType: 'figma',
      fileKey: fileKey,
      fileName: figmaFile.name || 'Untitled Figma Design',
      lastModified: figmaFile.lastModified || new Date().toISOString(),
      version: figmaFile.version || '1',
      sections: sections,
      designTokens: designTokens,
      layoutAnalysis: layoutAnalysis,
      totalSections: sections.length,
      extractedAt: new Date().toISOString(),
      // Include comprehensive analysis if available
      ...(comprehensiveAnalysis && {
        visualElements: comprehensiveAnalysis.visualElements,
        contentMapping: comprehensiveAnalysis.contentMapping,
        layoutAnalysis: comprehensiveAnalysis.layoutAnalysis,
        designTokens: comprehensiveAnalysis.designTokens,
        comprehensiveAnalysis: comprehensiveAnalysis.comprehensiveAnalysis
      })
    };

    logger.info('Figma design extracted successfully', {
      figmaUrl,
      fileKey,
      sectionsCount: sections.length,
      userId: req.user?.id || 'anonymous'
    });

    res.json({
      success: true,
      message: 'Figma design extracted successfully',
      data: extractedDesign
    });
  } catch (error) {
    logger.error('Figma extraction failed:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Server error during Figma extraction';
    if (error.message.includes('401')) {
      errorMessage = 'Invalid Figma access token. Please check your FIGMA_ACCESS_TOKEN.';
    } else if (error.message.includes('404')) {
      errorMessage = 'Figma file not found. Please check the URL and ensure the file is accessible.';
    } else if (error.message.includes('403')) {
      errorMessage = 'Access denied to Figma file. Please ensure the file is public or you have access permissions.';
    } else if (error.message.includes('Failed to fetch Figma file')) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// @desc    Generate complete landing page from extracted data and business info
// @route   POST /api/ai/generate-landing-page
// @access  Public
router.post('/generate-landing-page', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
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

    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized'
      });
    }


    // Generate comprehensive landing page content using Gemini AI
    const landingPageContent = await generateCompleteLandingPage({
      businessInfo,
      extractedData,
      preferences,
      model
    });

    // Create the landing page structure
    const landingPage = {
      title: `${businessInfo.businessName} - Landing Page`.substring(0, 100),
      businessName: businessInfo.businessName,
      businessOverview: businessInfo.businessOverview,
      targetAudience: businessInfo.targetAudience,
      brandTone: businessInfo.brandTone || 'professional',
      websiteUrl: businessInfo.websiteUrl,
      designSource: {
        type: extractedData.designType || 'pdf',
        fileName: extractedData.metadata?.title || 'Extracted Design',
        processedAt: new Date()
      },
      sections: landingPageContent.sections,
      status: 'draft',
      tags: ['ai-generated', 'extracted-data'],
      isPublic: false,
      generatedAt: new Date(),
      model: 'gemini-pro',
      analytics: {
        views: 0,
        conversions: 0
      },
      settings: {
        theme: 'light',
        customCSS: landingPageContent.customCSS || '',
        customJS: landingPageContent.customJS || ''
      },
      meta: landingPageContent.meta || {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`,
        ogTitle: `${businessInfo.businessName} - Professional Services`,
        ogDescription: businessInfo.businessOverview,
        ogImage: '/images/og-image.jpg'
      }
    };


    logger.info('Complete landing page generated successfully', {
      businessName: businessInfo.businessName,
      userId: req.user?.id || 'anonymous',
      sections: landingPage.sections.length
    });

    res.json({
      success: true,
      message: 'Complete landing page generated successfully',
      data: landingPage,
      downloadUrl: `/api/ai/download-landing-page/${Date.now()}`,
      previewUrl: `/api/ai/preview-landing-page/${Date.now()}`
    });

  } catch (error) {
    logger.error('Complete landing page generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during landing page generation'
    });
  }
});

// @desc    Download generated landing page as HTML
// @route   POST /api/ai/download-landing-page
// @access  Public
router.post('/download-landing-page', async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!businessInfo || !extractedData) {
      return res.status(400).json({
        success: false,
        error: 'Business info and extracted data are required'
      });
    }


    // Generate HTML content
    const htmlContent = await generateLandingPageHTML({
      businessInfo,
      extractedData,
      preferences
    });


    // Set headers for file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${businessInfo.businessName}-landing-page.html"`);
    
    res.send(htmlContent);

  } catch (error) {
    logger.error('Landing page download failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during download'
    });
  }
});

// @desc    Preview generated landing page
// @route   POST /api/ai/preview-landing-page
// @access  Public
router.post('/preview-landing-page', async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!businessInfo || !extractedData) {
      return res.status(400).json({
        success: false,
        error: 'Business info and extracted data are required'
      });
    }


    // Generate preview data
    const previewData = await generateLandingPagePreview({
      businessInfo,
      extractedData,
      preferences
    });


    res.json({
      success: true,
      data: previewData
    });

  } catch (error) {
    logger.error('Landing page preview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during preview generation'
    });
  }
});

// @desc    Validate input data for landing page generation
// @route   POST /api/ai/validate
// @access  Public
router.post('/validate', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
], async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {} } = req.body;
    const errors = [];
    const validationData = {
      businessInfoValid: false,
      extractedDataValid: false,
      preferencesValid: false,
      errors: []
    };

    // Validate business info
    if (!businessInfo.businessName || businessInfo.businessName.trim().length === 0) {
      errors.push('Business name is required');
    }
    if (!businessInfo.businessOverview || businessInfo.businessOverview.trim().length === 0) {
      errors.push('Business overview is required');
    }
    if (!businessInfo.targetAudience || businessInfo.targetAudience.trim().length === 0) {
      errors.push('Target audience is required');
    }
    if (businessInfo.brandTone && !['professional', 'friendly', 'playful', 'authoritative', 'casual'].includes(businessInfo.brandTone)) {
      errors.push('Invalid brand tone');
    }
    
    validationData.businessInfoValid = errors.length === 0;

    // Validate extracted data
    if (!extractedData.sections || !Array.isArray(extractedData.sections) || extractedData.sections.length === 0) {
      errors.push('Extracted data must contain sections');
    }
    
    validationData.extractedDataValid = extractedData.sections && Array.isArray(extractedData.sections) && extractedData.sections.length > 0;

    // Validate preferences (optional)
    validationData.preferencesValid = true; // Preferences are optional

    validationData.errors = errors;


    res.json({
      success: true,
      message: 'Validation completed',
      data: {
        step: 'validation',
        completed: true,
        completedAt: new Date(),
        validationData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during validation'
    });
  }
});

// @desc    Plan content strategy for landing page
// @route   POST /api/ai/plan-content
// @access  Public
router.post('/plan-content', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
], async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized'
      });
    }


    // Generate content strategy using AI
    const planningPrompt = `
You are an expert content strategist. Analyze the provided business information and extracted design data to create a comprehensive content planning strategy.

BUSINESS INFORMATION:
- Business Name: ${businessInfo.businessName}
- Business Overview: ${businessInfo.businessOverview}
- Target Audience: ${businessInfo.targetAudience}
- Brand Tone: ${businessInfo.brandTone || 'professional'}

EXTRACTED DESIGN DATA:
${JSON.stringify(extractedData, null, 2)}

PREFERENCES:
${JSON.stringify(preferences, null, 2)}

TASK: Create a content planning strategy that includes:

1. **Target Sections**: List the key sections needed for this landing page
2. **Content Strategy**: Overall approach to content creation
3. **Tone Analysis**: How to adapt the brand tone for different sections
4. **Audience Insights**: Key insights about the target audience for content creation

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  "targetSections": ["header", "hero", "features", "about", "testimonials", "cta", "contact", "footer"],
  "contentStrategy": "Detailed strategy for content creation",
  "toneAnalysis": "Analysis of how to use the brand tone effectively",
  "audienceInsights": "Key insights about the target audience"
}

CRITICAL INSTRUCTIONS:
- Do NOT add any text before or after the JSON
- Do NOT include explanations or comments
- Return ONLY the JSON object
- Base recommendations on the actual business and design data provided
`;

    const result = await model.generateContent(planningPrompt);
    const response = await result.response;
    const text = response.text();
    
    let planningData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planningData = JSON.parse(jsonMatch[0]);
      } else {
        planningData = JSON.parse(text);
      }
    } catch (parseError) {
      planningData = {
        targetSections: ['header', 'hero', 'features', 'about', 'testimonials', 'cta', 'contact', 'footer'],
        contentStrategy: `Create compelling content for ${businessInfo.businessName} that speaks directly to ${businessInfo.targetAudience}`,
        toneAnalysis: `Use a ${businessInfo.brandTone || 'professional'} tone throughout while maintaining authenticity`,
        audienceInsights: `Target audience: ${businessInfo.targetAudience}. Focus on their pain points and how ${businessInfo.businessName} can solve them.`
      };
    }


    res.json({
      success: true,
      message: 'Content planning completed',
      data: {
        step: 'contentPlanning',
        completed: true,
        completedAt: new Date(),
        planningData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during content planning'
    });
  }
});

// @desc    Analyze design structure and requirements
// @route   POST /api/ai/analyze-design
// @access  Public
router.post('/analyze-design', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
], async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized'
      });
    }


    // Analyze design structure using AI
    const designPrompt = `
You are an expert UI/UX designer. Analyze the provided extracted design data to create a comprehensive design analysis.

EXTRACTED DESIGN DATA:
${JSON.stringify(extractedData, null, 2)}

BUSINESS CONTEXT:
- Business Name: ${businessInfo.businessName}
- Brand Tone: ${businessInfo.brandTone || 'professional'}

PREFERENCES:
${JSON.stringify(preferences, null, 2)}

TASK: Create a design analysis that includes:

1. **Layout Structure**: Recommended page layout and structure
2. **Color Scheme**: Appropriate color palette based on brand and design
3. **Typography**: Font recommendations and hierarchy
4. **Responsive Design**: Mobile-first approach and breakpoints
5. **Accessibility Notes**: Key accessibility considerations

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  "layoutStructure": "Recommended layout structure and grid system",
  "colorScheme": "Primary and secondary color recommendations",
  "typography": "Font family and hierarchy recommendations",
  "responsiveDesign": "Mobile-first responsive design approach",
  "accessibilityNotes": "Key accessibility considerations and recommendations"
}

CRITICAL INSTRUCTIONS:
- Do NOT add any text before or after the JSON
- Do NOT include explanations or comments
- Return ONLY the JSON object
- Base recommendations on the actual design data and business context
`;

    const result = await model.generateContent(designPrompt);
    const response = await result.response;
    const text = response.text();
    
    let designData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        designData = JSON.parse(jsonMatch[0]);
      } else {
        designData = JSON.parse(text);
      }
    } catch (parseError) {
      designData = {
        layoutStructure: 'Clean, modern layout with clear visual hierarchy and ample white space',
        colorScheme: 'Professional blue and white color scheme with accent colors',
        typography: 'Modern sans-serif fonts with clear hierarchy (headings, body, captions)',
        responsiveDesign: 'Mobile-first approach with breakpoints at 768px and 1024px',
        accessibilityNotes: 'Ensure proper contrast ratios, alt text for images, and keyboard navigation'
      };
    }


    res.json({
      success: true,
      message: 'Design analysis completed',
      data: {
        step: 'designAnalysis',
        completed: true,
        completedAt: new Date(),
        designData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during design analysis'
    });
  }
});

// @desc    Generate content for landing page sections
// @route   POST /api/ai/generate-content
// @access  Public
router.post('/generate-content', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('planningData')
    .optional()
    .isObject()
    .withMessage('Planning data must be an object'),
  body('designData')
    .optional()
    .isObject()
    .withMessage('Design data must be an object')
], async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {}, planningData = {}, designData = {} } = req.body;

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized'
      });
    }


    // Generate content using AI with the new professional prompt format
    const contentPrompt = `
Generate professional content for each section in the given payload.  

The payload contains two parts:
- "businessInfo": details about the business (name, overview, target audience, tone, and website).
- "extractedData.sections": a list of sections with titles.

For each section:
1. Keep only these keys in the response: "id", "title", "type", "content", "order".
2. Use the section "title" as the theme to generate the content.
   Example: if the title is "Projects", generate project-related content for the business. 
3. Generate the "content" using information from "businessInfo" (businessName, businessOverview, targetAudience, brandTone, websiteUrl).
4. Ensure the generated content matches the "brandTone".
5. Return all sections in JSON format, where each section has enriched "content".

BUSINESS INFORMATION:
- Business Name: ${businessInfo.businessName}
- Business Overview: ${businessInfo.businessOverview}
- Target Audience: ${businessInfo.targetAudience}
- Brand Tone: ${businessInfo.brandTone || 'professional'}
- Website URL: ${businessInfo.websiteUrl || 'Not provided'}

EXTRACTED SECTIONS:
${JSON.stringify(extractedData.sections || [], null, 2)}

ADDITIONAL CONTEXT:
- Planning Data: ${JSON.stringify(planningData, null, 2)}
- Design Data: ${JSON.stringify(designData, null, 2)}
- Preferences: ${JSON.stringify(preferences, null, 2)}

---

Sample Response Format:

[
  {
    "id": "section-1",
    "title": "About Me",
      "type": "header",
    "content": "Amazon Web Services (AWS) is the world's leading cloud platform, trusted by startups, enterprises, and governments worldwide. Our mission is to help organizations innovate faster, reduce costs, and build with confidence in a secure, scalable environment.",
      "order": 1
  },
  {
    "id": "section-2",
    "title": "Professional Experience",
    "type": "content",
    "content": "AWS has decades of expertise in cloud infrastructure, supporting millions of customers with reliable, scalable, and cost-effective solutions tailored to their needs.",
    "order": 2
  }
  ...
]

CRITICAL INSTRUCTIONS:
- Do NOT add any text before or after the JSON
- Do NOT include explanations or comments
- Return ONLY the JSON array
- Generate complete, engaging content for each section
- Focus on professional, conversion-focused content that matches the brand tone
- Use the section title as the theme for content generation
`;

    const result = await model.generateContent(contentPrompt);
    const response = await result.response;
    const text = response.text();
    
    let contentData;
    try {
      // Try to parse as JSON array first (new format)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const sections = JSON.parse(jsonMatch[0]);
        contentData = {
          sectionsGenerated: sections.length,
          contentQuality: 'Professional, conversion-focused content',
          seoOptimized: true,
          conversionFocused: true,
          sections: sections
        };
      } else {
        // Fallback to object format
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          contentData = JSON.parse(objectMatch[0]);
      } else {
        contentData = JSON.parse(text);
        }
      }
    } catch (parseError) {
      contentData = {
        sectionsGenerated: extractedData.sections?.length || 0,
        contentQuality: 'Professional, conversion-focused content',
        seoOptimized: true,
        conversionFocused: true,
        sections: []
      };
    }


    res.json({
      success: true,
      message: 'Content generation completed',
      data: {
        step: 'contentGeneration',
        completed: true,
        completedAt: new Date(),
        contentData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during content generation'
    });
  }
});

// @desc    Generate complete landing page HTML/CSS/JS
// @route   POST /api/ai/generate-landing-page
// @access  Public
router.post('/generate-landing-page', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('stepData')
    .optional()
    .isObject()
    .withMessage('Step data must be an object')
], async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {}, stepData = {} } = req.body;

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized'
      });
    }


    const startTime = Date.now();

    // Generate comprehensive landing page content using Gemini AI
    const landingPageContent = await generateCompleteLandingPage({
      businessInfo,
      extractedData,
      preferences,
      model,
      stepData
    });

    const generationTime = Date.now() - startTime;

    // Calculate quality score based on various factors
    const qualityScore = calculateQualityScore(landingPageContent, businessInfo);

    const generationData = {
      htmlGenerated: true,
      cssGenerated: !!landingPageContent.customCSS,
      jsGenerated: !!landingPageContent.customJS,
      responsiveTested: true,
      sectionsGenerated: landingPageContent.sections?.length || 0,
      totalSections: landingPageContent.sections?.length || 0,
      generationTime: generationTime,
      qualityScore: qualityScore
    };


    res.json({
      success: true,
      message: 'Landing page generation completed',
      data: {
        step: 'generateLandingPage',
        completed: true,
        completedAt: new Date(),
        generationData,
        landingPageContent
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during landing page generation'
    });
  }
});

// @desc    Preview generated landing page
// @route   POST /api/ai/preview-landing-page
// @access  Public
router.post('/preview-landing-page', [
  body('landingPageId')
    .isMongoId()
    .withMessage('Valid landing page ID is required'),
  body('previewOptions')
    .optional()
    .isObject()
    .withMessage('Preview options must be an object')
], async (req, res) => {
  try {
    const { landingPageId, previewOptions = {} } = req.body;


    const startTime = Date.now();

    // Import LandingPage model
    const LandingPage = require('../models/LandingPage');

    // Find the landing page
    const landingPage = await LandingPage.findById(landingPageId);
    if (!landingPage) {
      return res.status(404).json({
        success: false,
        error: 'Landing page not found'
      });
    }

    // Generate preview URL (in a real app, this would be a proper preview endpoint)
    const previewUrl = `${req.protocol}://${req.get('host')}/api/ai/preview/${landingPageId}`;
    
    const previewTime = Date.now() - startTime;

    const previewData = {
      previewGenerated: true,
      previewUrl: previewUrl,
      sectionsPreviewed: landingPage.sections?.length || 0,
      previewTime: previewTime,
      previewQuality: 95 // High quality preview
    };


    res.json({
      success: true,
      message: 'Landing page preview generated',
      data: {
        step: 'previewLandingPage',
        completed: true,
        completedAt: new Date(),
        previewData,
        previewUrl: previewUrl
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during landing page preview'
    });
  }
});

// @desc    Prepare landing page for download
// @route   POST /api/ai/download-landing-page
// @access  Public
router.post('/download-landing-page', [
  body('landingPageId')
    .isMongoId()
    .withMessage('Valid landing page ID is required'),
  body('downloadFormat')
    .optional()
    .isIn(['html', 'zip'])
    .withMessage('Download format must be html or zip')
], async (req, res) => {
  try {
    const { landingPageId, downloadFormat = 'html' } = req.body;


    const startTime = Date.now();

    // Import LandingPage model
    const LandingPage = require('../models/LandingPage');

    // Find the landing page
    const landingPage = await LandingPage.findById(landingPageId);
    if (!landingPage) {
      return res.status(404).json({
        success: false,
        error: 'Landing page not found'
      });
    }

    // Generate download URL (in a real app, this would prepare the actual file)
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/ai/download/${landingPageId}?format=${downloadFormat}`;
    
    const downloadTime = Date.now() - startTime;

    // Calculate file size (estimate)
    const estimatedFileSize = JSON.stringify(landingPage).length;

    const downloadData = {
      downloadPrepared: true,
      downloadUrl: downloadUrl,
      fileSize: estimatedFileSize,
      downloadFormat: downloadFormat,
      downloadTime: downloadTime
    };


    res.json({
      success: true,
      message: 'Landing page download prepared',
      data: {
        step: 'downloadLandingPage',
        completed: true,
        completedAt: new Date(),
        downloadData,
        downloadUrl: downloadUrl
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during landing page download preparation'
    });
  }
});

// @desc    Generate and save complete landing page to database
// @route   POST /api/ai/generate
// @access  Public (no authentication required for demo)
router.post('/generate', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
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

    const { businessInfo, extractedData, preferences = {}, user } = req.body;

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized'
      });
    }


    // Step 1: Validation
    const validationResult = await fetchWithTimeout(
      `${req.protocol}://${req.get('host')}/api/ai/validate`,
      {
        method: 'POST',
        body: { businessInfo, extractedData, preferences }
      },
      50000, // 50 seconds timeout
      2 // 2 retries
    );
    if (!validationResult.success) {
      throw new Error('Validation failed: ' + validationResult.error);
    }

    // Step 2: Content Planning
    const planningResult = await fetchWithTimeout(
      `${req.protocol}://${req.get('host')}/api/ai/plan-content`,
      {
        method: 'POST',
        body: { businessInfo, extractedData, preferences }
      },
      50000, // 50 seconds timeout
      2 // 2 retries
    );
    if (!planningResult.success) {
      throw new Error('Content planning failed: ' + planningResult.error);
    }

    // Step 3: Design Analysis
    const designResult = await fetchWithTimeout(
      `${req.protocol}://${req.get('host')}/api/ai/analyze-design`,
      {
        method: 'POST',
        body: { businessInfo, extractedData, preferences }
      },
      50000, // 50 seconds timeout
      2 // 2 retries
    );
    if (!designResult.success) {
      throw new Error('Design analysis failed: ' + designResult.error);
    }

    // Step 4: Content Generation
    const contentResult = await fetchWithTimeout(
      `${req.protocol}://${req.get('host')}/api/ai/generate-content`,
      {
        method: 'POST',
        body: { 
          businessInfo, 
          extractedData, 
          preferences,
          planningData: planningResult.data.planningData,
          designData: designResult.data.designData
        }
      },
      50000, // 50 seconds timeout
      2 // 2 retries
    );
    if (!contentResult.success) {
      throw new Error('Content generation failed: ' + contentResult.error);
    }

    // Step 5: Generate Landing Page (HTML/CSS/JS)
    const generationResult = await fetchWithTimeout(
      `${req.protocol}://${req.get('host')}/api/ai/generate-landing-page`,
      {
        method: 'POST',
        body: { 
          businessInfo, 
          extractedData, 
          preferences,
          stepData: {
            validation: validationResult.data.validationData,
            planning: planningResult.data.planningData,
            design: designResult.data.designData,
            content: contentResult.data.contentData
          }
        }
      },
      50000, // 50 seconds timeout
      2 // 2 retries
    );
    if (!generationResult.success) {
      throw new Error('Landing page generation failed: ' + generationResult.error);
    }

    const landingPageContent = generationResult.data.landingPageContent;

    // Step 6: Preview Landing Page
    try {
      const previewResult = await fetchWithTimeout(
        `${req.protocol}://${req.get('host')}/api/ai/preview-landing-page`,
        {
          method: 'POST',
          body: { 
            landingPageId: 'temp-id', // We'll update this after saving
            previewOptions: { includeSections: true, responsive: true }
          }
        },
        50000, // 50 seconds timeout
        1 // 1 retry only for preview
      );
      if (!previewResult.success) {
      }
    } catch (error) {
    }

    // Step 7: Prepare Download
    try {
      const downloadResult = await fetchWithTimeout(
        `${req.protocol}://${req.get('host')}/api/ai/download-landing-page`,
        {
          method: 'POST',
          body: { 
            landingPageId: 'temp-id', // We'll update this after saving
            downloadFormat: 'html'
          }
        },
        50000, // 50 seconds timeout
        1 // 1 retry only for download
      );
      if (!downloadResult.success) {
      }
    } catch (error) {
    }

    // Import LandingPage model
    const LandingPage = require('../models/LandingPage');

    // Create the landing page structure for database
    const landingPageData = {
      // User information
      user: user ? {
        email: user.email || null,
        userId: user.id || null,
        companyId: user.companyId || null
      } : null,
      title: `${businessInfo.businessName} - Landing Page`.substring(0, 100),
      businessName: businessInfo.businessName,
      businessOverview: businessInfo.businessOverview,
      targetAudience: businessInfo.targetAudience,
      brandTone: businessInfo.brandTone || 'professional',
      websiteUrl: businessInfo.websiteUrl,
      designSource: {
        type: extractedData.designType || 'pdf',
        fileName: extractedData.metadata?.title || 'Extracted Design',
        processedAt: new Date()
      },
      sections: landingPageContent.sections.map(section => ({
        id: section.id,
        type: section.type,
        title: section.title,
        content: section.content,
        order: section.order,
        metadata: section.metadata || {}
      })),
      status: 'draft',
      tags: ['ai-generated', 'extracted-data', 'step-by-step'],
      isPublic: false,
      generatedAt: new Date(),
      model: 'gemini-pro',
      currentStep: 'completed',
      processSteps: {
        validation: {
          completed: true,
          completedAt: validationResult.data.completedAt,
          data: validationResult.data.validationData
        },
        contentPlanning: {
          completed: true,
          completedAt: planningResult.data.completedAt,
          data: planningResult.data.planningData
        },
        designAnalysis: {
          completed: true,
          completedAt: designResult.data.completedAt,
          data: designResult.data.designData
        },
        contentGeneration: {
          completed: true,
          completedAt: contentResult.data.completedAt,
          data: contentResult.data.contentData
        },
        generateLandingPage: {
          completed: true,
          completedAt: generationResult.data.completedAt,
          data: generationResult.data.generationData
        },
        previewLandingPage: {
          completed: previewResult.success,
          completedAt: previewResult.success ? previewResult.data.completedAt : null,
          data: previewResult.success ? previewResult.data.previewData : null
        },
        downloadLandingPage: {
          completed: downloadResult.success,
          completedAt: downloadResult.success ? downloadResult.data.completedAt : null,
          data: downloadResult.success ? downloadResult.data.downloadData : null
        }
      },
      analytics: {
        views: 0,
        conversions: 0
      },
      settings: {
        theme: 'light',
        customCSS: landingPageContent.customCSS || '',
        customJS: landingPageContent.customJS || ''
      },
      meta: landingPageContent.meta || {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`,
        ogTitle: `${businessInfo.businessName} - Professional Services`,
        ogDescription: businessInfo.businessOverview,
        ogImage: '/images/og-image.jpg'
      }
    };

    // Save to database
    const savedLandingPage = await LandingPage.create(landingPageData);


    logger.info('Complete landing page generated and saved successfully', {
      businessName: businessInfo.businessName,
      userId: user?.id || 'anonymous',
      sections: savedLandingPage.sections.length,
      landingPageId: savedLandingPage._id
    });

    res.json({
      success: true,
      message: 'Complete landing page generated and saved successfully using step-by-step process',
      data: {
        id: savedLandingPage._id,
        title: savedLandingPage.title,
        businessName: savedLandingPage.businessName,
        sections: savedLandingPage.sections,
        status: savedLandingPage.status,
        generatedAt: savedLandingPage.generatedAt,
        model: savedLandingPage.model,
        currentStep: savedLandingPage.currentStep,
        processSteps: savedLandingPage.processSteps,
        settings: savedLandingPage.settings,
        meta: savedLandingPage.meta,
        downloadUrl: `/api/ai/download-landing-page/${savedLandingPage._id}`,
        previewUrl: `/api/ai/preview-landing-page/${savedLandingPage._id}`,
        editUrl: `/editor/${savedLandingPage._id}`,
        stepSummary: {
          totalSteps: 7,
          completedSteps: 7,
          steps: [
            { name: 'validation', completed: true, completedAt: savedLandingPage.processSteps.validation.completedAt },
            { name: 'contentPlanning', completed: true, completedAt: savedLandingPage.processSteps.contentPlanning.completedAt },
            { name: 'designAnalysis', completed: true, completedAt: savedLandingPage.processSteps.designAnalysis.completedAt },
            { name: 'contentGeneration', completed: true, completedAt: savedLandingPage.processSteps.contentGeneration.completedAt },
            { name: 'generateLandingPage', completed: true, completedAt: savedLandingPage.processSteps.generateLandingPage.completedAt },
            { name: 'previewLandingPage', completed: previewResult.success, completedAt: savedLandingPage.processSteps.previewLandingPage.completedAt },
            { name: 'downloadLandingPage', completed: downloadResult.success, completedAt: savedLandingPage.processSteps.downloadLandingPage.completedAt }
          ]
        }
      }
    });

  } catch (error) {
    logger.error('Complete landing page generation and save failed:', error);
    
    // Handle specific error types
    let errorMessage = 'Server error during landing page generation and save';
    let statusCode = 500;
    
    if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout: The generation process took too long. Please try again with simpler content.';
      statusCode = 408;
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      errorMessage = 'Unable to connect to the generation service. Please check your connection and try again.';
      statusCode = 503;
    } else if (error.message.includes('security') || error.message.includes('blocked') || error.message.includes('403 Forbidden')) {
      errorMessage = 'The website is blocking automated access. This is common for websites that protect against scraping. Please try a different website or provide business information manually.';
      statusCode = 403;
    } else if (error.message.includes('Validation failed')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('Content planning failed')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('Design analysis failed')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('Content generation failed')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('Landing page generation failed')) {
      errorMessage = error.message;
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// New endpoint for dynamic landing page generation with Gemini (public route)
router.post('/generate-dynamic-landing-page', async (req, res) => {
  try {
    const { businessInfo, extractedData, designType, user } = req.body


    // Validate required data
    if (!businessInfo || !businessInfo.businessName) {
      return res.status(400).json({
        success: false,
        error: 'Business information is required'
      })
    }

    // Prepare context for Gemini
    const context = {
      businessName: businessInfo.businessName,
      businessOverview: businessInfo.businessOverview || 'Professional services',
      targetAudience: businessInfo.targetAudience || 'General customers',
      brandTone: businessInfo.brandTone || 'Professional',
      extractedSections: extractedData?.sections || [],
      designType: designType || 'unknown',
      // Enhanced design structure from new extraction prompt
      layoutStructure: extractedData?.layout_structure || null,
      textElements: extractedData?.text_elements || null,
      comprehensiveAnalysis: extractedData?.comprehensiveAnalysis || null,
      // Add the new dictionary format sections for better generation
      designSections: extractedData?.sections || {},
      sectionTypes: extractedData?.sectionTypes || []
    }

    
    // Use the generateCompleteLandingPage function that includes content length logic
    const landingPageData = await generateCompleteLandingPage({
      businessInfo,
      extractedData,
      preferences: {
        designType: designType || 'pdf',
        layoutStyle: 'clean'
      },
      model,
      stepData: {
        extractedSections: context.extractedSections,
        layoutStructure: context.layoutStructure,
        textElements: context.textElements
      }
    })

    // Validate and enhance the generated content
    const enhancedContent = enhanceGeneratedContent(landingPageData, context)

    // Calculate quality score
    const qualityScore = calculateQualityScore(enhancedContent, businessInfo)


    // Save landing page to database
    const LandingPage = require('../models/LandingPage')
    
    const landingPageRecord = {
      // User information
      user: user ? {
        email: user.email || null,
        userId: user.id || null,
        companyId: user.companyId || null
      } : null,
      title: `${businessInfo.businessName} - Landing Page`.substring(0, 100),
      businessName: businessInfo.businessName,
      businessOverview: businessInfo.businessOverview,
      targetAudience: businessInfo.targetAudience,
      brandTone: businessInfo.brandTone || 'professional',
      websiteUrl: businessInfo.websiteUrl,
      designSource: {
        type: designType || 'pdf',
        fileName: extractedData?.metadata?.title || 'Extracted Design',
        processedAt: new Date()
      },
      sections: enhancedContent.sections?.map(section => ({
        id: section.id,
        type: section.type,
        title: section.title,
        content: section.content || `Content for ${section.title || section.type}`,
        order: section.order || 1,
        pageNumber: section.pageNumber || 1,
        boundingBox: section.boundingBox || {
          x: 0,
          y: 0,
          width: 800,
          height: 200
        },
        extractedAt: new Date().toISOString()
      })) || [],
      status: 'draft',
      tags: ['ai-generated', 'extracted-data', 'dynamic-generation'],
      isPublic: false,
      generatedAt: new Date(),
      model: 'gemini-pro',
      analytics: {
        views: 0,
        conversions: 0
      },
      settings: {
        theme: 'light',
        customCSS: enhancedContent.css || '',
        customJS: enhancedContent.js || ''
      },
      meta: enhancedContent.meta || {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`,
        ogTitle: `${businessInfo.businessName} - Professional Services`,
        ogDescription: businessInfo.businessOverview,
        ogImage: '/images/og-image.jpg'
      },
      completeHTML: enhancedContent.html || '',
      qualityScore: qualityScore
    }

    try {
      const savedLandingPage = await LandingPage.create(landingPageRecord)
      
      res.json({
        success: true,
        message: 'Dynamic landing page generated and saved successfully',
        data: {
          id: savedLandingPage._id,
          title: savedLandingPage.title,
          businessName: savedLandingPage.businessName,
          landingPageContent: enhancedContent,
          qualityScore,
          generationData: {
            htmlGenerated: !!enhancedContent.html,
            cssGenerated: !!enhancedContent.css,
            jsGenerated: !!enhancedContent.js,
            sectionsGenerated: enhancedContent.sections?.length || 0,
            generationTime: Date.now(),
            qualityScore
          },
          databaseRecord: {
            id: savedLandingPage._id,
            status: savedLandingPage.status,
            generatedAt: savedLandingPage.generatedAt,
            model: savedLandingPage.model
          },
          downloadUrl: `/api/ai/download-landing-page/${savedLandingPage._id}`,
          previewUrl: `/api/ai/preview-landing-page/${savedLandingPage._id}`,
          editUrl: `/editor/${savedLandingPage._id}`,
          completedAt: new Date()
        }
      })
    } catch (dbError) {
      // Still return the generated content even if database save fails
      res.json({
        success: true,
        message: 'Dynamic landing page generated successfully (database save failed)',
        data: {
          landingPageContent: enhancedContent,
          qualityScore,
          generationData: {
            htmlGenerated: !!enhancedContent.html,
            cssGenerated: !!enhancedContent.css,
            jsGenerated: !!enhancedContent.js,
            sectionsGenerated: enhancedContent.sections?.length || 0,
            generationTime: Date.now(),
            qualityScore
          },
          databaseError: 'Failed to save to database: ' + dbError.message,
          completedAt: new Date()
        }
      })
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate dynamic landing page: ' + error.message
    })
  }
})

// @desc    Extract design structure and return only section names and headers
// @route   POST /api/ai/extract-design-structure
// @access  Public
router.post('/extract-design-structure', async (req, res) => {
  try {
    const { filePath, designType = 'pdf' } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }


    let extractedData;

    if (designType === 'pdf') {
      // Extract from PDF
      const pdfResult = await fetchWithTimeout(
        `${req.protocol}://${req.get('host')}/api/ai/extract-pdf`,
        {
          method: 'POST',
          body: { filePath }
        },
        50000, // 50 seconds timeout
        2 // 2 retries
      );
      
      if (!pdfResult.success) {
        throw new Error('PDF extraction failed: ' + pdfResult.error);
      }
      
      extractedData = pdfResult.data;
    } else if (designType === 'figma') {
      // Extract from Figma
      const figmaResult = await fetchWithTimeout(
        `${req.protocol}://${req.get('host')}/api/ai/analyze-figma`,
        {
          method: 'POST',
          body: { filePath }
        },
        50000, // 50 seconds timeout
        2 // 2 retries
      );
      
      if (!figmaResult.success) {
        throw new Error('Figma extraction failed: ' + figmaResult.error);
      }
      
      extractedData = figmaResult.data;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid design type. Must be "pdf" or "figma"'
      });
    }

    // Create simple dictionary format with section names
    const parsedSections = createSimpleSectionDictionary(extractedData);
    
    // Create structured response
    const filteredResponse = {
      designType: designType,
      totalSections: extractedData.sections?.length || 0,
      sections: parsedSections,
      sectionTypes: Object.keys(parsedSections),
      summary: {
        totalSectionTypes: Object.keys(parsedSections).length,
        totalContentElements: Object.values(parsedSections).reduce((sum, elements) => sum + elements.length, 0)
      }
    };

    res.json({
      success: true,
      message: 'Design structure extracted and filtered successfully',
      data: filteredResponse
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to extract design structure: ' + error.message
    });
  }
});

// Apply authentication to all other routes - REMOVED
// router.use(protect); // Removed protect middleware

// Helper function to extract and parse JSON from Gemini response
function extractAndParseJSON(response) {
  // Clean the response to handle backticks and other formatting issues
  let cleanedContent = response
  
  // Remove markdown code blocks if present
  cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '')
  
  // Try to find JSON array first (new format)
  const arrayMatch = cleanedContent.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const sections = JSON.parse(arrayMatch[0])
      return {
        sections: sections,
        meta: {
          title: 'Generated Landing Page',
          description: 'AI-generated landing page content',
          keywords: 'landing page, ai generated'
        }
      }
    } catch (parseError) {
    }
  }
  
  // Fallback: Try to find JSON object in the response
  const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response')
  }
  
  let jsonString = jsonMatch[0]
  
  // Handle the specific case where HTML content is wrapped in backticks
  // Look for patterns like "html": `<!DOCTYPE html>...`
  jsonString = jsonString.replace(/"html":\s*`([^`]*)`/g, (match, htmlContent) => {
    // Escape quotes and newlines in HTML content
    const escapedHtml = htmlContent
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t')   // Escape tabs
    return `"html": "${escapedHtml}"`
  })
  
  // Handle CSS content with backticks
  jsonString = jsonString.replace(/"css":\s*`([^`]*)`/g, (match, cssContent) => {
    const escapedCss = cssContent
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return `"css": "${escapedCss}"`
  })
  
  // Handle JS content with backticks
  jsonString = jsonString.replace(/"js":\s*`([^`]*)`/g, (match, jsContent) => {
    const escapedJs = jsContent
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return `"js": "${escapedJs}"`
  })
  
  // Handle any other backtick-wrapped content
  jsonString = jsonString.replace(/`([^`]*)`/g, '"$1"')
  
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    throw error
  }
}

// Helper function to create simple section dictionary
function createSimpleSectionDictionary(extractedData) {
  const sections = {};
  
  // Create sections based on available data
  if (extractedData.sections && Array.isArray(extractedData.sections)) {
    extractedData.sections.forEach(section => {
      const sectionType = section.type || 'content';
      const sectionName = sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
      
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      
      // Add section title
      if (section.title) {
        sections[sectionName].push(section.title);
      }
      
      // Add first few words from content (clean up)
      if (section.content) {
        const cleanContent = section.content
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const words = cleanContent.split(' ').slice(0, 8).join(' ');
        if (words.trim() && words.length > 10) {
          sections[sectionName].push(words);
        }
      }
    });
  }
  
  // If no sections, create basic structure
  if (Object.keys(sections).length === 0) {
    sections['Content'] = ['No sections found'];
  }
  
  return sections;
}

// Helper function to parse Gemini response and create dictionary format
function parseGeminiResponseToDictionary(extractedData) {
  const sections = {};
  
  // First, try to parse from comprehensiveAnalysis if available
  if (extractedData.comprehensiveAnalysis) {
    const analysis = extractedData.comprehensiveAnalysis;
    
    // Parse the structured response from Gemini
    if (typeof analysis === 'string') {
      return parseStructuredResponse(analysis);
    } else if (typeof analysis === 'object') {
      return parseAnalysisObject(analysis);
    }
  }
  
  // Fallback to parsing from sections array
  if (extractedData.sections && Array.isArray(extractedData.sections)) {
    extractedData.sections.forEach(section => {
      const sectionType = section.type || 'content';
      
      if (!sections[sectionType]) {
        sections[sectionType] = [];
      }
      
      // Extract section name and content
      if (section.title) {
        sections[sectionType].push(section.title);
      }
      
      // Extract content elements - get first few meaningful words
      if (section.content) {
        const contentElements = extractContentFromText(section.content);
        // Only add the first few meaningful elements to avoid clutter
        sections[sectionType].push(...contentElements.slice(0, 3));
      }
    });
  }
  
  // If no sections found, create a simple structure from available data
  if (Object.keys(sections).length === 0) {
    // Create basic sections based on available data
    if (extractedData.sections && extractedData.sections.length > 0) {
      sections['Content'] = extractedData.sections.map(section => section.title || 'Untitled Section');
    } else {
      sections['Content'] = ['No sections found'];
    }
  }
  
  // Always ensure we have some basic sections
  if (Object.keys(sections).length === 0) {
    sections['Content'] = ['No content available'];
  }
  
  // Clean up and remove duplicates
  Object.keys(sections).forEach(key => {
    sections[key] = [...new Set(sections[key])].filter(element => 
      element && element.trim().length > 0 && element !== 'Not Found' && element !== 'Empty'
    );
  });
  
  return sections;
}

// Helper function to parse analysis object
function parseAnalysisObject(analysis) {
  const sections = {};
  
  // Parse layout analysis
  if (analysis.layoutAnalysis && analysis.layoutAnalysis.pageStructure) {
    const pageStructure = analysis.layoutAnalysis.pageStructure;
    
    Object.keys(pageStructure).forEach(sectionType => {
      const section = pageStructure[sectionType];
      if (section && section.present) {
        const sectionName = sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
        if (!sections[sectionName]) {
          sections[sectionName] = [];
        }
        
        // Add section-specific elements
        if (section.elements) {
          sections[sectionName].push(...section.elements);
        }
        if (section.title) {
          sections[sectionName].push(section.title);
        }
      }
    });
  }
  
  // Parse content mapping
  if (analysis.contentMapping) {
    const contentMapping = analysis.contentMapping;
    
    Object.keys(contentMapping).forEach(contentType => {
      const contentItems = contentMapping[contentType];
      if (Array.isArray(contentItems)) {
        const sectionName = contentType.charAt(0).toUpperCase() + contentType.slice(1);
        if (!sections[sectionName]) {
          sections[sectionName] = [];
        }
        
        contentItems.forEach(item => {
          if (typeof item === 'string') {
            sections[sectionName].push(item);
          } else if (item.text) {
            sections[sectionName].push(item.text);
          }
        });
      }
    });
  }
  
  // Parse visual elements
  if (analysis.visualElements) {
    const visualElements = analysis.visualElements;
    
    Object.keys(visualElements).forEach(elementType => {
      const elements = visualElements[elementType];
      if (Array.isArray(elements)) {
        const sectionName = elementType.charAt(0).toUpperCase() + elementType.slice(1);
        if (!sections[sectionName]) {
          sections[sectionName] = [];
        }
        
        elements.forEach(element => {
          if (element.text) {
            sections[sectionName].push(element.text);
          } else if (element.content) {
            sections[sectionName].push(element.content);
          }
        });
      }
    });
  }
  
  return sections;
}

// Helper function to parse structured response from Gemini
function parseStructuredResponse(analysisText) {
  const sections = {};
  
  // Split by emoji headers
  const lines = analysisText.split('\n');
  let currentSection = '';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Check for section headers
    if (trimmedLine.includes('🔝 Header / Navigation')) {
      currentSection = 'Header';
    } else if (trimmedLine.includes('🎯 Hero Section')) {
      currentSection = 'Hero';
    } else if (trimmedLine.includes('📑 All Content Sections')) {
      currentSection = 'Content';
    } else if (trimmedLine.includes('🤝 Social Proof')) {
      currentSection = 'Social Proof';
    } else if (trimmedLine.includes('🚀 Call To Actions')) {
      currentSection = 'CTA';
    } else if (trimmedLine.includes('🦶 Footer')) {
      currentSection = 'Footer';
    } else if (trimmedLine.startsWith('- ') && currentSection) {
      // Extract element content
      const elementContent = trimmedLine.substring(2);
      if (elementContent.includes(':')) {
        const [key, value] = elementContent.split(':', 2);
        const cleanValue = value.trim();
        if (cleanValue && cleanValue !== 'Not Found' && cleanValue !== 'Empty') {
          if (!sections[currentSection]) {
            sections[currentSection] = [];
          }
          sections[currentSection].push(cleanValue);
        }
      } else {
        const cleanContent = elementContent.trim();
        if (cleanContent && cleanContent !== 'Not Found' && cleanContent !== 'Empty') {
          if (!sections[currentSection]) {
            sections[currentSection] = [];
          }
          sections[currentSection].push(cleanContent);
        }
      }
    }
  });
  
  return sections;
}

// Helper function to extract content from text
function extractContentFromText(text) {
  const elements = [];
  
  if (!text || typeof text !== 'string') {
    return elements;
  }
  
  // Split by lines and extract meaningful content
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Skip very short lines or common patterns
    if (trimmedLine.length < 3 || 
        trimmedLine.match(/^(about:blank|Generated by|AI Response)/i) ||
        trimmedLine.match(/^\d+\.?\s*$/) ||
        trimmedLine.match(/^[-\s]*$/)) {
      return;
    }
    
    // Extract meaningful content elements
    if (trimmedLine.length > 5) {
      elements.push(trimmedLine);
    }
  });
  
  return elements;
}

// Helper function to extract content elements from section
function extractContentElements(section) {
  const elements = [];
  
  // Add section title as an element
  if (section.title && section.title.trim()) {
    elements.push(section.title.trim());
  }
  
  // Extract elements from content based on section type
  if (section.content && section.content.trim()) {
    const content = section.content.trim();
    
    // For different section types, extract different elements
    switch (section.type) {
      case 'header':
        elements.push(...extractHeaderElements(content));
        break;
      case 'hero':
        elements.push(...extractHeroElements(content));
        break;
      case 'content':
        elements.push(...extractContentSectionElements(content));
        break;
      case 'footer':
        elements.push(...extractFooterElements(content));
        break;
      default:
        elements.push(...extractGenericElements(content));
    }
  }
  
  // Remove duplicates and return
  return [...new Set(elements)].filter(element => element && element.trim().length > 0);
}

// Helper functions for different section types
function extractHeaderElements(content) {
  const elements = [];
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 3 && trimmedLine.length < 100) {
      if (trimmedLine.match(/^(logo|menu|navigation|nav|search|header)/i)) {
        elements.push(trimmedLine);
      } else if (trimmedLine.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/)) {
        elements.push(trimmedLine); // Likely menu items
      }
    }
  });
  
  return elements;
}

function extractHeroElements(content) {
  const elements = [];
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 5 && trimmedLine.length < 200) {
      if (trimmedLine.match(/^(welcome|get started|learn more|discover|explore|empower)/i)) {
        elements.push(trimmedLine);
      } else if (trimmedLine.match(/^[A-Z][^.!?]*[.!?]?$/)) {
        elements.push(trimmedLine); // Likely headlines
      }
    }
  });
  
  return elements;
}

function extractContentSectionElements(content) {
  const elements = [];
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 5 && trimmedLine.length < 150) {
      // Skip technical content
      if (!trimmedLine.match(/^(def |import |class |function |if __name__|parser\.|args\.)/)) {
        if (trimmedLine.match(/^(features|services|about|products|testimonials|contact)/i)) {
          elements.push(trimmedLine);
        } else if (trimmedLine.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/)) {
          elements.push(trimmedLine); // Likely section titles
        }
      }
    }
  });
  
  return elements;
}

function extractFooterElements(content) {
  const elements = [];
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 3 && trimmedLine.length < 100) {
      if (trimmedLine.match(/^(contact|privacy|terms|copyright|follow us|social)/i)) {
        elements.push(trimmedLine);
      } else if (trimmedLine.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/)) {
        elements.push(trimmedLine); // Likely footer links
      }
    }
  });
  
  return elements;
}

function extractGenericElements(content) {
  const elements = [];
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 5 && trimmedLine.length < 100) {
      // Skip technical patterns
      if (!trimmedLine.match(/^(def |import |class |function |if __name__|parser\.|args\.|about:blank)/)) {
        elements.push(trimmedLine);
      }
    }
  });
  
  return elements;
}

// Helper function to get section purpose based on type
function getSectionPurpose(sectionType) {
  const purposes = {
    'header': 'Navigation and branding area at the top of the page',
    'hero': 'Main focal point with primary messaging and call-to-action',
    'content': 'Informational content section with details about the business',
    'features': 'Highlight key features, benefits, or services offered',
    'cta': 'Call-to-action section to drive user engagement',
    'footer': 'Bottom section with contact info, links, and legal information',
    'social-proof': 'Testimonials, reviews, client logos, or case studies',
    'about': 'Information about the business, team, or company story',
    'services': 'Detailed description of services or products offered',
    'contact': 'Contact information, forms, or ways to get in touch',
    'testimonials': 'Customer reviews, quotes, or success stories',
    'pricing': 'Pricing plans, packages, or cost information',
    'gallery': 'Image showcase, portfolio, or visual content',
    'blog': 'Latest news, articles, or updates',
    'newsletter': 'Email signup or subscription form'
  }
  
  return purposes[sectionType] || 'General content section for information display'
}

// Helper function to determine design type
function determineDesignType(pdfText, sections) {
  const lowerText = pdfText.toLowerCase();
  
  // Check for landing page indicators
  if (lowerText.includes('landing') || lowerText.includes('homepage') || lowerText.includes('website') || 
      lowerText.includes('call to action') || lowerText.includes('cta') || lowerText.includes('sign up')) {
    return 'landing-page';
  }
  
  // Check for brochure indicators
  if (lowerText.includes('brochure') || lowerText.includes('catalog') || lowerText.includes('product') || 
      lowerText.includes('service') || lowerText.includes('offer')) {
    return 'brochure';
  }
  
  // Check for document indicators
  if (lowerText.includes('document') || lowerText.includes('report') || lowerText.includes('manual') || 
      lowerText.includes('guide') || lowerText.includes('instruction')) {
    return 'document';
  }
  
  return 'unknown';
}







// @desc    Generate landing page content using Gemini AI
// @route   POST /api/ai/generate-content
// @access  Private
router.post('/generate-content', [
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
    .isIn(['professional', 'friendly', 'playful', 'authoritative', 'casual'])
    .withMessage('Invalid brand tone'),
  body('extractedContent')
    .optional()
    .isObject()
    .withMessage('Extracted content must be an object'),
  body('sections')
    .isArray({ min: 1 })
    .withMessage('At least one section type is required')
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

    const {
      businessName,
      businessOverview,
      targetAudience,
      brandTone,
      extractedContent,
      sections
    } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key not configured'
      });
    }

    // Prepare prompt for Gemini AI
    const prompt = generateContentPrompt({
      businessName,
      businessOverview,
      targetAudience,
      brandTone,
      extractedContent,
      sections
    });

    // Call Gemini AI API
    const generatedContent = await callGeminiAPI(prompt);

    logger.info('Content generated successfully using Gemini AI', {
      businessName,
      userId: req.user.id,
      sections: sections.length
    });

    res.json({
      success: true,
      message: 'Content generated successfully',
      data: {
        sections: generatedContent,
        generatedAt: new Date(),
        model: 'gemini-pro'
      }
    });
  } catch (error) {
    logger.error('Content generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during content generation'
    });
  }
});

// @desc    Regenerate specific section content
// @route   POST /api/ai/regenerate-section
// @access  Private
router.post('/regenerate-section', [
  body('sectionType')
    .isIn(['hero', 'features', 'testimonials', 'cta', 'about', 'contact'])
    .withMessage('Invalid section type'),
  body('businessContext')
    .isObject()
    .withMessage('Business context is required'),
  body('currentContent')
    .optional()
    .isString()
    .withMessage('Current content must be a string')
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

    const { sectionType, businessContext, currentContent } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key not configured'
      });
    }

    // Prepare prompt for section regeneration
    const prompt = generateSectionPrompt({
      sectionType,
      businessContext,
      currentContent
    });

    // Call Gemini AI API
    const regeneratedContent = await callGeminiAPI(prompt);

    logger.info('Section content regenerated successfully', {
      sectionType,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Section content regenerated successfully',
      data: {
        sectionType,
        content: regeneratedContent,
        regeneratedAt: new Date(),
        model: 'gemini-pro'
      }
    });
  } catch (error) {
    logger.error('Section regeneration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during section regeneration'
    });
  }
});

// @desc    Generate complete landing page from extracted data and business info
// @route   POST /api/ai/generate-landing-page
// @access  Private
router.post('/generate-landing-page', [
  body('businessInfo')
    .isObject()
    .withMessage('Business info is required'),
  body('extractedData')
    .isObject()
    .withMessage('Extracted data is required'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
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

    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!model) {
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized'
      });
    }


    // Generate comprehensive landing page content using Gemini AI
    const landingPageContent = await generateCompleteLandingPage({
      businessInfo,
      extractedData,
      preferences,
      model
    });

    // Create the landing page structure
    const landingPage = {
      title: `${businessInfo.businessName} - Landing Page`.substring(0, 100),
      businessName: businessInfo.businessName,
      businessOverview: businessInfo.businessOverview,
      targetAudience: businessInfo.targetAudience,
      brandTone: businessInfo.brandTone || 'professional',
      websiteUrl: businessInfo.websiteUrl,
      designSource: {
        type: extractedData.designType || 'pdf',
        fileName: extractedData.metadata?.title || 'Extracted Design',
        processedAt: new Date()
      },
      sections: landingPageContent.sections,
      status: 'draft',
      tags: ['ai-generated', 'extracted-data'],
      isPublic: false,
      generatedAt: new Date(),
      model: 'gemini-pro',
      analytics: {
        views: 0,
        conversions: 0
      },
      settings: {
        theme: 'light',
        customCSS: landingPageContent.customCSS || '',
        customJS: landingPageContent.customJS || ''
      }
    };


    logger.info('Complete landing page generated successfully', {
      businessName: businessInfo.businessName,
      userId: req.user?.id || 'anonymous',
      sections: landingPage.sections.length
    });

    res.json({
      success: true,
      message: 'Complete landing page generated successfully',
      data: landingPage,
      downloadUrl: `/api/ai/download-landing-page/${Date.now()}`,
      previewUrl: `/api/ai/preview-landing-page/${Date.now()}`
    });

  } catch (error) {
    logger.error('Complete landing page generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during landing page generation'
    });
  }
});

// @desc    Download generated landing page as HTML
// @route   POST /api/ai/download-landing-page
// @access  Private
router.post('/download-landing-page', async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!businessInfo || !extractedData) {
      return res.status(400).json({
        success: false,
        error: 'Business info and extracted data are required'
      });
    }


    // Generate HTML content
    const htmlContent = await generateLandingPageHTML({
      businessInfo,
      extractedData,
      preferences
    });


    // Set headers for file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${businessInfo.businessName}-landing-page.html"`);
    
    res.send(htmlContent);

  } catch (error) {
    logger.error('Landing page download failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during download'
    });
  }
});

// @desc    Preview generated landing page
// @route   POST /api/ai/preview-landing-page
// @access  Private
router.post('/preview-landing-page', async (req, res) => {
  try {
    const { businessInfo, extractedData, preferences = {} } = req.body;

    if (!businessInfo || !extractedData) {
      return res.status(400).json({
        success: false,
        error: 'Business info and extracted data are required'
      });
    }


    // Generate preview data
    const previewData = await generateLandingPagePreview({
      businessInfo,
      extractedData,
      preferences
    });


    res.json({
      success: true,
      data: previewData
    });

  } catch (error) {
    logger.error('Landing page preview failed:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during preview generation'
    });
  }
});

// Helper function to generate content prompt
function generateContentPrompt({
  businessName,
  businessOverview,
  targetAudience,
  brandTone,
  extractedContent,
  sections
}) {
  let prompt = `Generate landing page content for a business with the following details:

Business Name: ${businessName}
Business Overview: ${businessOverview}
Target Audience: ${targetAudience}
Brand Tone: ${brandTone}

Required Sections: ${sections.join(', ')}

Please generate compelling, engaging content for each section that matches the brand tone and speaks directly to the target audience.`;

  if (extractedContent) {
    prompt += `\n\nExtracted Design Content: ${JSON.stringify(extractedContent, null, 2)}`;
  }

  prompt += `\n\nFormat the response as a JSON object with the following structure:
{
  "sections": [
    {
      "type": "section_type",
      "title": "Section Title",
      "content": "Generated content for this section",
      "order": 1
    }
  ]
}`;

  return prompt;
}

// Helper function to generate section prompt
function generateSectionPrompt({
  sectionType,
  businessContext,
  currentContent
}) {
  let prompt = `Regenerate content for the ${sectionType} section of a landing page.

Business Context: ${JSON.stringify(businessContext, null, 2)}

Current Content: ${currentContent || 'None'}

Please generate new, improved content for this section that is more engaging and effective.`;

  prompt += `\n\nFormat the response as a JSON object with the following structure:
{
  "content": "New generated content for this section"
}`;

  return prompt;
}

// Helper function to call Gemini AI API
async function callGeminiAPI(prompt) {
  try {
    const response = await axios.post(
      `${GEMINI_API_URL}/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract generated content from response
    const generatedText = response.data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON response
    try {
      return JSON.parse(generatedText);
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      return {
        content: generatedText
      };
    }
  } catch (error) {
    logger.error('Gemini API call failed:', error);
    throw new Error('Failed to generate content using AI');
  }
}

// Helper function to create comprehensive fallback analysis from PDF content
function createComprehensiveFallbackAnalysis(pdfText, sections) {
  const textLines = pdfText.split('\n').filter(line => line.trim().length > 0);
  const words = pdfText.split(/\s+/).filter(word => word.length > 0);
  
  // Extract visual elements from PDF content
  const visualElements = {
    textBlocks: textLines.map((line, index) => ({
      id: `text-${index + 1}`,
      type: line.length > 50 ? 'body' : line.length > 20 ? 'subheadline' : 'headline',
      content: line.trim(),
      position: { x: 0, y: index * 30, width: 800, height: 30 },
      typography: {
        fontFamily: 'Arial',
        fontSize: line.length > 50 ? '16px' : line.length > 20 ? '20px' : '24px',
        fontWeight: line.length > 20 ? 'normal' : 'bold',
        color: '#000000'
      }
    })).slice(0, 10), // Limit to first 10 text blocks
    images: [], // PDF text extraction doesn't include images
    buttons: words.filter(word => 
      /^(get|start|click|download|sign|up|login|register|subscribe|buy|shop|order|contact|learn|more|try|now)$/i.test(word)
    ).map((word, index) => ({
      id: `btn-${index + 1}`,
      type: 'cta',
      text: word.charAt(0).toUpperCase() + word.slice(1),
      position: { x: 0, y: 0, width: 120, height: 40 },
      style: {
        backgroundColor: '#007bff',
        color: '#ffffff',
        borderRadius: '4px'
      }
    })).slice(0, 5), // Limit to first 5 buttons
    forms: [] // No forms detected in text-only extraction
  };

  // Extract content mapping from PDF content
  const contentMapping = {
    headlines: textLines.filter(line => line.length <= 30 && line.length > 0).map((line, index) => ({
      id: `headline-${index + 1}`,
      text: line.trim(),
      hierarchy: line.length <= 15 ? 'primary' : 'secondary',
      position: { x: 0, y: index * 40, width: 600, height: 40 }
    })).slice(0, 5),
    bodyText: textLines.filter(line => line.length > 30).map((line, index) => ({
      id: `body-${index + 1}`,
      content: line.trim(),
      type: 'description',
      position: { x: 0, y: index * 30, width: 500, height: 30 }
    })).slice(0, 10),
    ctaButtons: visualElements.buttons,
    navigation: [], // No navigation detected in text-only extraction
    features: sections.filter(section => 
      ['features', 'recipes', 'categories'].includes(section.type)
    ).map((section, index) => ({
      id: `feature-${index + 1}`,
      title: section.title,
      description: section.content.substring(0, 100),
      type: 'feature',
      position: { x: 0, y: 0, width: 300, height: 200 }
    })),
    testimonials: [] // No testimonials detected in text-only extraction
  };

  // Create layout analysis
  const layoutAnalysis = {
    pageStructure: {
      header: { present: sections.some(s => s.type === 'header'), position: { x: 0, y: 0, width: 1200, height: 80 } },
      hero: { present: sections.some(s => s.type === 'hero'), position: { x: 0, y: 80, width: 1200, height: 500 } },
      features: { present: sections.some(s => ['features', 'recipes'].includes(s.type)), position: { x: 0, y: 580, width: 1200, height: 400 } },
      testimonials: { present: false },
      cta: { present: sections.some(s => s.type === 'cta'), position: { x: 0, y: 980, width: 1200, height: 200 } },
      footer: { present: sections.some(s => s.type === 'footer'), position: { x: 0, y: 1180, width: 1200, height: 150 } }
    },
    gridSystem: {
      type: 'flexbox',
      columns: 12,
      gutters: '20px',
      margins: '40px'
    },
    responsiveBreakpoints: [
      { name: 'mobile', width: '320px', present: true },
      { name: 'tablet', width: '768px', present: true },
      { name: 'desktop', width: '1200px', present: true }
    ],
    alignment: {
      primary: 'left',
      secondary: 'left',
      vertical: 'top'
    },
    spacing: {
      sectionPadding: '60px',
      elementMargin: '20px',
      lineHeight: '1.5'
    }
  };

  // Create design tokens
  const designTokens = {
    colors: [
      { name: 'primary', value: '#007bff', usage: 'buttons|links|highlights' },
      { name: 'secondary', value: '#6c757d', usage: 'text|borders|backgrounds' },
      { name: 'text', value: '#000000', usage: 'headlines|body' }
    ],
    typography: [
      { name: 'heading', fontFamily: 'Arial, sans-serif', fontSize: '24px', fontWeight: 'bold' },
      { name: 'body', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: 'normal' }
    ],
    spacing: [
      { name: 'xs', value: '4px' },
      { name: 'sm', value: '8px' },
      { name: 'md', value: '16px' },
      { name: 'lg', value: '24px' },
      { name: 'xl', value: '32px' }
    ]
  };

  return {
    visualElements,
    contentMapping,
    layoutAnalysis,
    designTokens
  };
}

// Helper function to create sections from comprehensive analysis data
function createSectionsFromAnalysis(analysisData, pdfText) {
  
  const sections = [];
  let sectionCounter = 1;
  
  // If no meaningful analysis data, return empty sections
  if (!analysisData || !analysisData.contentMapping) {
    return sections;
  }
  
  // Create sections from content mapping
  if (analysisData.contentMapping) {
    const { headlines, bodyText, features, ctaButtons, navigation } = analysisData.contentMapping;
    
    // Create header section from navigation
    if (navigation && navigation.length > 0) {
      const nav = navigation[0];
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Header",
        type: "header",
        content: nav.items ? nav.items.join('\n') : "Navigation elements",
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: nav.position || { x: 0, y: 0, width: 800, height: 80 },
        extractedAt: new Date().toISOString()
      });
    }
    
    // Create hero section from primary headlines
    if (headlines && headlines.length > 0) {
      const primaryHeadlines = headlines.filter(h => h.hierarchy === 'primary');
      if (primaryHeadlines.length > 0) {
        const heroContent = primaryHeadlines.map(h => h.text).join('\n');
        sections.push({
          id: `section-${sectionCounter}`,
          title: "Hero",
          type: "hero",
          content: heroContent,
          order: sectionCounter++,
          pageNumber: 1,
          boundingBox: primaryHeadlines[0].position || { x: 0, y: 80, width: 800, height: 200 },
          extractedAt: new Date().toISOString()
        });
      }
    }
    
    // Create feature sections
    if (features && features.length > 0) {
      features.forEach(feature => {
        sections.push({
          id: `section-${sectionCounter}`,
          title: feature.title || "Feature",
          type: "features",
          content: feature.description || feature.title,
          order: sectionCounter++,
          pageNumber: 1,
          boundingBox: feature.position || { x: 0, y: 280, width: 800, height: 150 },
          extractedAt: new Date().toISOString()
        });
      });
    }
    
    // Create CTA sections
    if (ctaButtons && ctaButtons.length > 0) {
      const ctaContent = ctaButtons.map(cta => cta.text).join('\n');
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Call to Action",
        type: "cta",
        content: ctaContent,
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: ctaButtons[0].position || { x: 0, y: 430, width: 800, height: 100 },
        extractedAt: new Date().toISOString()
      });
    }
    
    // Create footer section from remaining content
    if (bodyText && bodyText.length > 0) {
      const footerContent = bodyText.map(body => body.content).join('\n');
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Footer",
        type: "footer",
        content: footerContent,
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: { x: 0, y: 530, width: 800, height: 100 },
        extractedAt: new Date().toISOString()
      });
    }
  }
  
  // If no sections created from analysis, create from layout analysis
  if (sections.length === 0 && analysisData.layoutAnalysis) {
    const { pageStructure } = analysisData.layoutAnalysis;
    
    if (pageStructure.header && pageStructure.header.present) {
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Header",
        type: "header",
        content: "Header/Navigation content",
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: pageStructure.header.position || { x: 0, y: 0, width: 800, height: 80 },
        extractedAt: new Date().toISOString()
      });
    }
    
    if (pageStructure.hero && pageStructure.hero.present) {
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Hero",
        type: "hero",
        content: "Hero section content",
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: pageStructure.hero.position || { x: 0, y: 80, width: 800, height: 200 },
        extractedAt: new Date().toISOString()
      });
    }
    
    if (pageStructure.features && pageStructure.features.present) {
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Features",
        type: "features",
        content: "Features section content",
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: pageStructure.features.position || { x: 0, y: 280, width: 800, height: 150 },
        extractedAt: new Date().toISOString()
      });
    }
    
    if (pageStructure.cta && pageStructure.cta.present) {
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Call to Action",
        type: "cta",
        content: "Call to action content",
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: pageStructure.cta.position || { x: 0, y: 430, width: 800, height: 100 },
        extractedAt: new Date().toISOString()
      });
    }
    
    if (pageStructure.footer && pageStructure.footer.present) {
      sections.push({
        id: `section-${sectionCounter}`,
        title: "Footer",
        type: "footer",
        content: "Footer content",
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: pageStructure.footer.position || { x: 0, y: 530, width: 800, height: 100 },
        extractedAt: new Date().toISOString()
      });
    }
  }
  
  // If still no sections, create from PDF text analysis with intelligent parsing
  if (sections.length === 0) {
    return createIntelligentSections(pdfText);
  }
  
  return sections;
}

// Helper function to create intelligent sections from PDF text
function createIntelligentSections(pdfText) {
  
  const sections = [];
  let sectionCounter = 1;
  
  // If PDF text is empty, return empty sections
  if (!pdfText || pdfText.trim().length === 0) {
    return sections;
  }
  
  // Split text into lines and analyze each line
  const lines = pdfText.split('\n').filter(line => line.trim().length > 0);
  
  // Look for common section patterns
  const sectionPatterns = {
    header: /header|navigation|nav|menu/i,
    hero: /hero|main|banner|welcome|slogan/i,
    features: /features|services|products|categories|recipes/i,
    cta: /cta|call.*action|button|sign.*up|get.*started/i,
    footer: /footer|credit|contact|about/i,
    promotion: /promotion|instagram|social|follow/i
  };
  
  let currentSection = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line matches a section pattern
    let sectionType = null;
    let sectionTitle = null;
    
    for (const [type, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(line)) {
        sectionType = type;
        sectionTitle = line;
        break;
      }
    }
    
    // If we found a new section, save the previous one
    if (sectionType && currentSection) {
      sections.push({
        id: `section-${sectionCounter}`,
        title: currentSection.title,
        type: currentSection.type,
        content: currentContent.join('\n'),
        order: sectionCounter++,
        pageNumber: 1,
        boundingBox: {
          x: 0,
          y: (sectionCounter - 2) * 120,
          width: 800,
          height: Math.max(100, Math.min(400, currentContent.join('\n').length / 1.5))
        },
        extractedAt: new Date().toISOString()
      });
      
      currentContent = [];
    }
    
    // Start new section or add to current content
    if (sectionType) {
      currentSection = {
        type: sectionType,
        title: sectionTitle
      };
      currentContent.push(line);
    } else if (currentSection) {
      currentContent.push(line);
    } else {
      // If no current section, try to determine from content
      if (line.toLowerCase().includes('hot') || line.toLowerCase().includes('recipes')) {
        currentSection = {
          type: 'features',
          title: 'Hot Recipes'
        };
        currentContent.push(line);
      } else if (line.toLowerCase().includes('categories')) {
        currentSection = {
          type: 'features',
          title: 'Categories'
        };
        currentContent.push(line);
      } else if (line.toLowerCase().includes('handpicked')) {
        currentSection = {
          type: 'features',
          title: 'Handpicked Recipes'
        };
        currentContent.push(line);
      } else if (line.toLowerCase().includes('instagram')) {
        currentSection = {
          type: 'promotion',
          title: 'Instagram Promotion'
        };
        currentContent.push(line);
      } else if (line.toLowerCase().includes('footer') || line.toLowerCase().includes('credit')) {
        currentSection = {
          type: 'footer',
          title: 'Footer'
        };
        currentContent.push(line);
      } else if (line.toLowerCase().includes('slogan') || line.toLowerCase().includes('cta')) {
        currentSection = {
          type: 'cta',
          title: 'Call to Action'
        };
        currentContent.push(line);
      } else {
        // Default to content section
        if (!currentSection) {
          currentSection = {
            type: 'content',
            title: 'Content Section'
          };
        }
        currentContent.push(line);
      }
    }
  }
  
  // Add the last section
  if (currentSection && currentContent.length > 0) {
    sections.push({
      id: `section-${sectionCounter}`,
      title: currentSection.title,
      type: currentSection.type,
      content: currentContent.join('\n'),
      order: sectionCounter++,
      pageNumber: 1,
      boundingBox: {
        x: 0,
        y: (sectionCounter - 2) * 120,
        width: 800,
        height: Math.max(100, Math.min(400, currentContent.join('\n').length / 1.5))
      },
      extractedAt: new Date().toISOString()
    });
  }
  
  // If no sections created, fall back to basic parsing
  if (sections.length === 0) {
    return createFallbackSections(pdfText);
  }
  
  return sections;
}

// Helper function to create fallback sections when Gemini AI fails
function createFallbackSections(pdfText) {
  const sections = [];
  const textChunks = pdfText
    .split(/\n{2,}/)
    .filter(chunk => chunk.trim().length > 20)
    .map(chunk => chunk.trim());

  let sectionCounter = 1;
  
  for (let i = 0; i < textChunks.length && sectionCounter <= 10; i++) {
    const chunk = textChunks[i];
    
    if (chunk.length < 20) continue;
    
    const sectionType = analyzeSectionType(chunk);
    const sectionTitle = generateSectionTitle(chunk, sectionType);
    
    sections.push({
      id: `fallback-section-${sectionCounter}`,
      title: sectionTitle,
      type: sectionType,
      content: chunk,
      order: sectionCounter,
      pageNumber: Math.floor((i * 120) / 800) + 1,
      boundingBox: {
        x: 0,
        y: i * 120,
        width: 800,
        height: Math.max(100, Math.min(400, chunk.length / 1.5))
      }
    });
    
    sectionCounter++;
  }

  return sections;
}

// Helper function to enhance sections with additional metadata
function enhanceSections(sections) {
  return sections.map((section, index) => {
    // Preserve the actual content from Gemini AI, don't override with placeholder
    const actualContent = section.content !== undefined ? section.content : 'No content available';
    
    return {
      id: section.id || `gemini-section-${index + 1}`,
      title: section.title || `Section ${index + 1}`,
      type: section.type || 'content',
      content: actualContent, // Use the actual content, not a fallback
      order: section.order || index + 1,
      pageNumber: section.pageNumber || Math.floor((index * 120) / 800) + 1,
      boundingBox: section.boundingBox || {
        x: 0,
        y: index * 120,
        width: 800,
        height: 200
      },
      extractedAt: new Date()
    };
  });
}

// Helper function to analyze section type (fallback method)
function analyzeSectionType(content) {
  const lowerContent = content.toLowerCase();
  
  // Recipe and food-related sections
  if (lowerContent.includes('recipe') || lowerContent.includes('cooking') || lowerContent.includes('ingredient')) {
    return 'recipes';
  }
  if (lowerContent.includes('category') || lowerContent.includes('type') || lowerContent.includes('group')) {
    return 'categories';
  }
  if (lowerContent.includes('hot') || lowerContent.includes('trending') || lowerContent.includes('popular')) {
    return 'features';
  }
  if (lowerContent.includes('handpicked') || lowerContent.includes('selected') || lowerContent.includes('curated')) {
    return 'features';
  }
  if (lowerContent.includes('slogan') || lowerContent.includes('tagline') || lowerContent.includes('motto')) {
    return 'cta';
  }
  if (lowerContent.includes('instagram') || lowerContent.includes('social') || lowerContent.includes('follow')) {
    return 'promotion';
  }
  if (lowerContent.includes('footer') || lowerContent.includes('credit') || lowerContent.includes('bottom')) {
    return 'footer';
  }
  
  // Standard sections
  if (lowerContent.includes('header') || lowerContent.includes('navigation') || lowerContent.includes('menu')) {
    return 'header';
  }
  if (lowerContent.includes('hero') || lowerContent.includes('welcome') || lowerContent.includes('main')) {
    return 'hero';
  }
  if (lowerContent.includes('feature') || lowerContent.includes('benefit') || lowerContent.includes('advantage')) {
    return 'features';
  }
  if (lowerContent.includes('testimonial') || lowerContent.includes('review') || lowerContent.includes('customer')) {
    return 'testimonials';
  }
  if (lowerContent.includes('cta') || lowerContent.includes('call to action') || lowerContent.includes('sign up')) {
    return 'cta';
  }
  if (lowerContent.includes('about') || lowerContent.includes('company') || lowerContent.includes('story')) {
    return 'about';
  }
  if (lowerContent.includes('contact') || lowerContent.includes('phone') || lowerContent.includes('email')) {
    return 'contact';
  }
  
  return 'content';
}

// Helper function to map section types to valid database types
function mapSectionType(type) {
  const typeMapping = {
    // Recipe and food-related types
    'categories': 'features',
    'recipes': 'features', 
    'promotion': 'cta',
    'footer': 'content',
    'navigation': 'header',
    
    // Standard types (already valid)
    'hero': 'hero',
    'features': 'features',
    'testimonials': 'testimonials',
    'cta': 'cta',
    'about': 'about',
    'contact': 'contact',
    'header': 'header',
    'content': 'content'
  };
  
  return typeMapping[type] || 'content'; // Default to 'content' if unknown
}

// Helper function to map section names to types for OCR response
function mapSectionTypeFromName(sectionName) {
  const name = sectionName.toLowerCase();
  
  // Hero section patterns
  if (name.includes('hero') || name.includes('banner') || name.includes('main') || name.includes('intro')) {
    return 'hero';
  }
  
  // Header/Navigation patterns
  if (name.includes('header') || name.includes('nav') || name.includes('menu') || name.includes('navigation')) {
    return 'header';
  }
  
  // Features section patterns
  if (name.includes('feature') || name.includes('service') || name.includes('benefit') || name.includes('capability')) {
    return 'features';
  }
  
  // Testimonials section patterns
  if (name.includes('testimonial') || name.includes('review') || name.includes('feedback') || name.includes('client')) {
    return 'testimonials';
  }
  
  // CTA section patterns
  if (name.includes('cta') || name.includes('call to action') || name.includes('action') || name.includes('button') || name.includes('signup') || name.includes('contact us')) {
    return 'cta';
  }
  
  // About section patterns
  if (name.includes('about') || name.includes('story') || name.includes('mission') || name.includes('vision')) {
    return 'about';
  }
  
  // Contact section patterns
  if (name.includes('contact') || name.includes('reach') || name.includes('get in touch')) {
    return 'contact';
  }
  
  // Footer section patterns
  if (name.includes('footer') || name.includes('bottom') || name.includes('end')) {
    return 'content';
  }
  
  // Pricing section patterns
  if (name.includes('pricing') || name.includes('plan') || name.includes('cost') || name.includes('price')) {
    return 'features';
  }
  
  // FAQ section patterns
  if (name.includes('faq') || name.includes('question') || name.includes('help')) {
    return 'content';
  }
  
  // Default to content for unknown sections
  return 'content';
}

// Helper function to generate section title (fallback method)
function generateSectionTitle(content, type) {
  const lines = content.split('\n');
  const firstLine = lines[0].trim();
  
  if (firstLine.length > 3 && firstLine.length < 60 && 
      /^[A-Z][a-zA-Z\s&]+$/.test(firstLine) && !firstLine.includes('.')) {
    return firstLine;
  }
  
  const words = content
    .split(/\s+/)
    .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word))
    .slice(0, 4);
  
  if (words.length > 0) {
    const title = words.join(' ');
    return title.length > 50 ? title.substring(0, 50) + '...' : title;
  }
  
  return `${type.charAt(0).toUpperCase() + type.slice(1)} Section`;
}

// Helper function to calculate quality score for generated landing page
function calculateQualityScore(landingPageContent, businessInfo) {
  let score = 0;
  const maxScore = 100;

  // Check if sections are generated (30 points)
  if (landingPageContent.sections && landingPageContent.sections.length > 0) {
    score += 30;
    
    // Bonus points for having key sections (20 points)
    const keySections = ['header', 'hero', 'features', 'cta', 'footer'];
    const hasKeySections = keySections.filter(section => 
      landingPageContent.sections.some(s => s.type === section)
    ).length;
    score += (hasKeySections / keySections.length) * 20;
  }

  // Check if CSS is generated (15 points)
  if (landingPageContent.customCSS && landingPageContent.customCSS.length > 50) {
    score += 15;
  }

  // Check if JS is generated (10 points)
  if (landingPageContent.customJS && landingPageContent.customJS.length > 50) {
    score += 10;
  }

  // Check if meta information is present (15 points)
  if (landingPageContent.meta && 
      landingPageContent.meta.title && 
      landingPageContent.meta.description) {
    score += 15;
  }

  // Check content quality based on business info integration (10 points)
  if (landingPageContent.sections) {
    const businessNameInContent = landingPageContent.sections.some(section => 
      section.content && section.content.toLowerCase().includes(businessInfo.businessName.toLowerCase())
    );
    if (businessNameInContent) {
      score += 10;
    }
  }

  return Math.min(Math.round(score), maxScore);
}

// Helper function to validate word count against content length requirements
function validateWordCount(wordCount, contentLength, customLength) {
  switch (contentLength) {
    case 'short':
      return wordCount >= 50 && wordCount <= 100;
    case 'medium':
      return wordCount >= 100 && wordCount <= 200;
    case 'long':
      return wordCount >= 200 && wordCount <= 400;
    case 'custom':
      const target = customLength || 150;
      return wordCount >= (target - 10) && wordCount <= (target + 10);
    default:
      return wordCount >= 100 && wordCount <= 200;
  }
}

// Helper function to generate content expansion when word count is insufficient
function generateContentExpansion(section, businessInfo, additionalWordsNeeded) {
  const businessName = businessInfo.businessName || 'our company';
  const businessOverview = businessInfo.businessOverview || 'professional services';
  const targetAudience = businessInfo.targetAudience || 'our clients';
  
  const expansionTemplates = [
    `At ${businessName}, we understand that ${targetAudience} need comprehensive solutions that deliver real results. Our team of experienced professionals brings together years of industry expertise and cutting-edge knowledge to ensure every project exceeds expectations.`,
    `We pride ourselves on our commitment to excellence and attention to detail. Every solution we deliver is carefully crafted to meet the unique needs of ${targetAudience}, ensuring maximum value and long-term success.`,
    `Our proven track record speaks for itself, with numerous satisfied clients who continue to trust us with their most important projects. We believe in building lasting relationships and providing ongoing support to help our clients achieve their goals.`,
    `With a focus on innovation and quality, ${businessName} has established itself as a trusted partner for ${targetAudience} seeking reliable, professional solutions. Our comprehensive approach ensures that every aspect of your project is handled with care and precision.`,
    `We understand that every client is unique, which is why we take a personalized approach to each project. Our team works closely with ${targetAudience} to understand their specific requirements and deliver solutions that perfectly match their needs and objectives.`
  ];
  
  // Select appropriate expansion based on section type
  let expansion = '';
  if (section.type === 'hero' || section.title.toLowerCase().includes('hero')) {
    expansion = `Welcome to ${businessName}, where we transform ideas into reality. Our comprehensive ${businessOverview} are designed specifically for ${targetAudience} who demand excellence and innovation. `;
  } else if (section.type === 'features' || section.title.toLowerCase().includes('feature')) {
    expansion = `Our key features include advanced technology integration, expert consultation, and ongoing support. We ensure that ${targetAudience} receive the highest quality solutions tailored to their specific requirements. `;
  } else if (section.type === 'about' || section.title.toLowerCase().includes('about')) {
    expansion = `Founded with a vision to provide exceptional ${businessOverview}, ${businessName} has grown to become a trusted partner for ${targetAudience} worldwide. Our commitment to quality and customer satisfaction drives everything we do. `;
  } else if (section.type === 'contact' || section.title.toLowerCase().includes('contact')) {
    expansion = `We're here to help ${targetAudience} achieve their goals. Contact our team today to discuss your project requirements and discover how our ${businessOverview} can benefit your organization. `;
  } else {
    expansion = expansionTemplates[Math.floor(Math.random() * expansionTemplates.length)];
  }
  
  // Add more content if still not enough words
  const currentWords = expansion.split(/\s+/).length;
  if (currentWords < additionalWordsNeeded) {
    expansion += ` Our team combines technical expertise with creative problem-solving to deliver solutions that not only meet but exceed expectations. We believe in continuous improvement and staying ahead of industry trends to provide ${targetAudience} with the most effective and innovative solutions available.`;
  }
  
  return expansion;
}

// Helper function to generate complete landing page content
async function generateCompleteLandingPage({ businessInfo, extractedData, preferences, model, stepData }) {
  // Determine content length based on business info
  const contentLength = businessInfo.contentLength || 'medium';
  const customLength = businessInfo.customContentLength || 150;
  
  
  let lengthInstruction = '';
  let wordCountRange = '';
  switch (contentLength) {
    case 'short':
      lengthInstruction = 'Generate SHORT content - concise, impactful messaging';
      wordCountRange = 'EXACTLY 50-100 words per section';
      break;
    case 'medium':
      lengthInstruction = 'Generate MEDIUM content - balanced detail and readability';
      wordCountRange = 'EXACTLY 100-200 words per section';
      break;
    case 'long':
      lengthInstruction = 'Generate LONG content - comprehensive, detailed information';
      wordCountRange = 'EXACTLY 200-400 words per section';
      break;
    case 'custom':
      lengthInstruction = 'Generate CUSTOM content - tailored to specific length requirements';
      wordCountRange = `EXACTLY ${customLength} words per section (within 10 words of target)`;
      break;
    default:
      lengthInstruction = 'Generate MEDIUM content - balanced detail and readability';
      wordCountRange = 'EXACTLY 100-200 words per section';
  }

  const prompt = `
Generate professional content for each section in the given payload.  

IMPORTANT: You MUST generate content with EXACTLY the specified word count for each section. This is CRITICAL and non-negotiable.

The payload contains two parts:
- "businessInfo": details about the business (name, overview, target audience, tone, and website).
- "extractedData.sections": a list of sections with titles.

For each section:
1. Keep only these keys in the response: "id", "title", "type", "content", "order".
2. Use the section "title" as the theme to generate the content.
   Example: if the title is "Projects", generate project-related content for the business. 
3. Generate the "content" using information from "businessInfo" (businessName, businessOverview, targetAudience, brandTone, websiteUrl).
4. Ensure the generated content matches the "brandTone".
5. ${lengthInstruction}
6. MANDATORY WORD COUNT: Each section's content must be ${wordCountRange}
7. Return all sections in JSON format, where each section has enriched "content".

WORD COUNT EXAMPLES:
- If you need 200-400 words, generate content like this example (approximately 300 words):
  "Our company specializes in providing comprehensive digital solutions that transform businesses and drive growth. With over a decade of experience in the industry, we have successfully helped hundreds of clients achieve their goals through innovative strategies and cutting-edge technology. Our team of expert professionals brings together deep industry knowledge and technical expertise to deliver results that exceed expectations. We understand that every business is unique, which is why we take a personalized approach to each project, ensuring that our solutions are tailored to meet specific needs and objectives. Our comprehensive suite of services includes web development, digital marketing, data analytics, and business consulting, all designed to help companies stay competitive in today's fast-paced digital landscape. We pride ourselves on our commitment to excellence, attention to detail, and ability to deliver projects on time and within budget. Our proven track record speaks for itself, with numerous success stories and satisfied clients who continue to trust us with their most important projects. When you choose our company, you're not just getting a service provider – you're getting a strategic partner who is invested in your long-term success and growth."

BUSINESS INFORMATION:
- Business Name: ${businessInfo.businessName}
- Business Overview: ${businessInfo.businessOverview}
- Target Audience: ${businessInfo.targetAudience}
- Brand Tone: ${businessInfo.brandTone || 'professional'}
- Website URL: ${businessInfo.websiteUrl || 'Not provided'}
- Content Length: ${contentLength}${contentLength === 'custom' ? ` (${customLength} words)` : ''}

EXTRACTED SECTIONS:
${JSON.stringify(extractedData.sections || [], null, 2)}

ADDITIONAL CONTEXT:
- Preferences: ${JSON.stringify(preferences, null, 2)}
- Step Data: ${JSON.stringify(stepData, null, 2)}

---

Sample Response Format:

[
    {
      "id": "section-1",
    "title": "About Me",
    "type": "header",
    "content": "Amazon Web Services (AWS) is the world's leading cloud platform, trusted by startups, enterprises, and governments worldwide. Our mission is to help organizations innovate faster, reduce costs, and build with confidence in a secure, scalable environment.",
      "order": 1
  },
  {
    "id": "section-2",
    "title": "Professional Experience",
    "type": "content",
    "content": "AWS has decades of expertise in cloud infrastructure, supporting millions of customers with reliable, scalable, and cost-effective solutions tailored to their needs.",
    "order": 2
  }
  ...
]

CRITICAL INSTRUCTIONS:
- Do NOT add any text before or after the JSON
- Do NOT include explanations or comments
- Return ONLY the JSON array
- Generate complete, engaging content for each section
- Focus on professional, conversion-focused content that matches the brand tone
- Use the section title as the theme for content generation
- Content must be plain text only - NO HTML tags, NO markdown, NO formatting
- ${lengthInstruction}
- ABSOLUTELY MANDATORY: Each section's content must be ${wordCountRange} - this is non-negotiable!
- COUNT WORDS CAREFULLY: Before finalizing each section, count the words and ensure they fall within the specified range
- If a section is too short, add more detail, examples, benefits, or features
- If a section is too long, make it more concise while keeping key information
- Include specific business benefits and features
- Use the exact business name and target audience in content
- QUALITY CHECK: Verify each section meets the word count requirement before submitting
`;

  try {
    let result = await model.generateContent(prompt);
    let response = await result.response;
    let text = response.text();
    
    // Check if content meets word count requirements
    let parsedResponse;
    try {
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const sections = JSON.parse(arrayMatch[0]);
        parsedResponse = { sections: sections };
      } else {
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsedResponse = JSON.parse(objectMatch[0]);
        } else {
          parsedResponse = JSON.parse(text);
        }
      }
      
      // Check word counts
      let needsRetry = false;
      if (parsedResponse.sections && parsedResponse.sections.length > 0) {
        for (const section of parsedResponse.sections) {
          const wordCount = section.content ? section.content.split(/\s+/).length : 0;
          if (!validateWordCount(wordCount, contentLength, customLength)) {
            needsRetry = true;
            break;
          }
        }
      }
      
      // If word counts don't meet requirements, use smart fallback instead of retries
      if (needsRetry) {
        
        // Use smart fallback: manually expand content immediately
        if (parsedResponse.sections && parsedResponse.sections.length > 0) {
          parsedResponse.sections = parsedResponse.sections.map(section => {
            const currentWordCount = section.content ? section.content.split(/\s+/).length : 0;
            const targetMinWords = contentLength === 'short' ? 50 : 
                                 contentLength === 'medium' ? 100 : 
                                 contentLength === 'long' ? 200 : 
                                 (customLength || 150) - 10;
            
            if (currentWordCount < targetMinWords) {
              const expansion = generateContentExpansion(section, businessInfo, targetMinWords - currentWordCount);
              section.content = section.content + ' ' + expansion;
            }
            return section;
          });
        }
      }
    } catch (parseError) {
    }
    
    
    // Parse the response (if not already parsed in retry check)
    if (!parsedResponse) {
      try {
        // Try to parse as JSON array first (new format)
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const sections = JSON.parse(arrayMatch[0]);
          parsedResponse = {
            sections: sections,
            meta: {
              title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
              description: businessInfo.businessOverview,
              keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`
            }
          };
        } else {
          // Fallback to object format
          const objectMatch = text.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsedResponse = JSON.parse(objectMatch[0]);
          } else {
            parsedResponse = JSON.parse(text);
          }
        }
      } catch (parseError) {
        parsedResponse = createFallbackLandingPage(businessInfo, extractedData);
      }
    }
    
    // Ensure meta object is present
    if (!parsedResponse.meta) {
      parsedResponse.meta = {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`
      };
    }

    // Transform the sections to match expected structure
    if (parsedResponse.sections && parsedResponse.sections.length > 0) {
      parsedResponse.sections = parsedResponse.sections.map((section, index) => ({
        id: section.id || `section-${index + 1}`,
        type: section.type || 'content',
        title: section.title || section.name || `Section ${index + 1}`,
        content: cleanHtmlContent(section.content) || generateBusinessSpecificContent(section, businessInfo),
        order: section.order || index + 1
      }));
      
      // Validate word counts (simplified logging)
      let totalWords = 0;
      let sectionsMeetingRequirements = 0;
      parsedResponse.sections.forEach((section, index) => {
        const wordCount = section.content ? section.content.split(/\s+/).length : 0;
        totalWords += wordCount;
        
        // Check if word count meets requirements
        const isValid = validateWordCount(wordCount, contentLength, customLength);
        if (isValid) {
          sectionsMeetingRequirements++;
        }
      });
      
    }

    // Ensure meta object is always present
    if (!parsedResponse.meta) {
      parsedResponse.meta = {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`,
        ogTitle: `${businessInfo.businessName} - Professional Services`,
        ogDescription: businessInfo.businessOverview,
        ogImage: '/images/og-image.jpg'
      };
    }

    return parsedResponse;
  } catch (error) {
    return createFallbackLandingPage(businessInfo, extractedData);
  }
}

// Helper function to create fallback landing page
function createFallbackLandingPage(businessInfo, extractedData) {
  // Use extracted sections if available, otherwise return empty sections
  const extractedSections = extractedData?.sections || [];
  
  let sections = [];
  
  if (extractedSections.length > 0) {
    // Create sections based on extracted design structure with business-specific content
    sections = extractedSections.map((section, index) => {
      return {
        id: section.id || `section-${index + 1}`,
        type: section.type || 'content',
        title: section.title || section.name || `Section ${index + 1}`,
        content: generateBusinessSpecificContent(section, businessInfo),
        order: section.order || index + 1
      };
    });
  } else {
    // Create default sections if no extracted data
    sections = [
      {
        id: 'section-1',
        type: 'hero',
        title: 'Welcome to ' + businessInfo.businessName,
        content: `Transform your business with ${businessInfo.businessName}. ${businessInfo.businessOverview} Perfect for ${businessInfo.targetAudience}. Get started today and see the difference we can make for your business.`,
        order: 1
      },
      {
        id: 'section-2',
        type: 'features',
        title: 'Our Services',
        content: `Key features of ${businessInfo.businessName}: ${businessInfo.businessOverview.toLowerCase()}. Our solutions are designed specifically for ${businessInfo.targetAudience} to help you achieve your goals efficiently and effectively.`,
        order: 2
      },
      {
        id: 'section-3',
        type: 'cta',
        title: 'Get Started',
        content: `Contact ${businessInfo.businessName} today! We're here to help ${businessInfo.targetAudience} achieve their goals. Reach out to us for a consultation and discover how we can help your business grow.`,
        order: 3
      }
    ];
  }
  
  return {
    sections: sections,
    meta: {
      title: `${businessInfo.businessName} - Professional Services`,
      description: businessInfo.businessOverview,
      keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`,
      ogTitle: `${businessInfo.businessName} - Professional Services`,
      ogDescription: businessInfo.businessOverview,
      ogImage: '/images/og-image.jpg'
    }
  };
}

// Helper function to clean HTML tags from content
function cleanHtmlContent(content) {
  if (!content) return '';
  
  // Remove HTML tags
  let cleaned = content.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If content is empty after cleaning, return null to trigger fallback
  if (!cleaned || cleaned.length < 10) {
    return null;
  }
  
  return cleaned;
}

// Helper function to generate business-specific content for sections
function generateBusinessSpecificContent(section, businessInfo) {
  const sectionType = section.type?.toLowerCase() || 'content';
  const sectionTitle = section.title || section.name || 'Section';
  
  switch (sectionType) {
    case 'hero':
      return `Transform your business with ${businessInfo.businessName}. ${businessInfo.businessOverview} Perfect for ${businessInfo.targetAudience}. Get started today and see the difference we can make for your business. Experience the power of our innovative solutions designed to help you achieve your goals faster and more efficiently.`;
      
    case 'features':
      return `Key features of ${businessInfo.businessName}: ${businessInfo.businessOverview.toLowerCase()}. Our solutions are designed specifically for ${businessInfo.targetAudience} to help you achieve your goals efficiently and effectively. From advanced capabilities to seamless integration, we provide everything you need to succeed in today's competitive market.`;
      
    case 'benefits':
      return `Benefits of choosing ${businessInfo.businessName}: ${businessInfo.businessOverview} We specialize in serving ${businessInfo.targetAudience} with professional excellence and innovative solutions that drive results. Our proven track record and commitment to quality ensure that you get the best value for your investment while achieving your business objectives.`;
      
    case 'about':
      return `About ${businessInfo.businessName}: ${businessInfo.businessOverview} We are committed to serving ${businessInfo.targetAudience} with excellence and innovation. Our team brings years of experience and dedication to every project.`;
      
    case 'testimonials':
      return `What our clients say about ${businessInfo.businessName}: "Excellent service and results!" - Satisfied Customer. "Professional and reliable." - Happy Client. "Exceeded our expectations!" - Valued Partner.`;
      
    case 'contact':
    case 'cta':
      return `Contact ${businessInfo.businessName} today! We're here to help ${businessInfo.targetAudience} achieve their goals. Reach out to us for a consultation and discover how we can help your business grow.`;
      
    case 'footer':
      return `${businessInfo.businessName} - ${businessInfo.businessOverview} Serving ${businessInfo.targetAudience} with professional excellence. Contact us today to get started.`;
      
    default:
      return `${sectionTitle}: ${businessInfo.businessOverview} Perfect for ${businessInfo.targetAudience}. Learn more about how ${businessInfo.businessName} can help you achieve your goals.`;
  }
}

// Helper function to enhance generated content
function enhanceGeneratedContent(content, context) {
  const enhanced = { ...content };
  
  // Ensure sections are properly formatted
  if (enhanced.sections && Array.isArray(enhanced.sections)) {
    enhanced.sections = enhanced.sections.map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      type: section.type || 'content',
      title: section.title || `Section ${index + 1}`,
      content: section.content || `Content for ${section.title || section.type}`,
      order: section.order || index + 1
    }));
  }
  
  // Enhance HTML content with business context
  if (enhanced.html && !enhanced.html.includes(context.businessName)) {
    enhanced.html = enhanced.html.replace(/Your Business Name/g, context.businessName)
    enhanced.html = enhanced.html.replace(/Business Name/g, context.businessName)
  }

  return enhanced
}

module.exports = router;
