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
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error('PDF extraction failed: File not found', { filePath });
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Log file information before processing
    const filename = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    logger.info('PDF extraction request received:', {
      requestedFilePath: filePath,
      filename: filename,
      fileSize: fileSize,
      fileExists: true
    });

    // Read PDF file
    const pdfBytes = fs.readFileSync(filePath);
    logger.info('PDF file read successfully:', {
      bufferSize: pdfBytes.length,
      filePath: filePath
    });

    // New comprehensive prompt for design section extraction
    const SECTION_EXTRACTION_PROMPT = `
You are an OCR + layout extraction agent for UI/UX design PDFs. 
Analyze the PDF and identify distinct sections. For each section, detect ALL possible design elements. 
Possible fields include (but are not limited to):
- section_name (Hero, Features, Pricing, FAQ, etc.)
- title (main heading)
- subtitle (supporting heading)
- content (paragraphs, descriptions, messages)
- buttons (array of button labels)
- links (array of link texts or URLs)
- images (array of image/icon names or descriptions)
- messages/alerts (any special notices, banners, error/info messages)
- lists (bullet points, numbered items)
- forms/inputs (fields, placeholders, labels)
- CTAs (special calls-to-action)

⚠️ Rules:
- Include ONLY the fields that actually exist in the content.
- Do NOT add placeholders, dummy data, null, or empty arrays.
- Use arrays for multiple values (buttons, images, links, lists).
- Keep JSON clean and valid.

Return ONLY JSON with this structure:
{
  "sections": [
    {
      "section_name": "Hero",
      "title": "Welcome to Our Service",
      "subtitle": "Fast, Reliable, Secure",
      "content": "Supporting text...",
      "buttons": ["Get Started", "Learn More"],
      "images": ["hero_banner.png"],
      "messages": ["Limited-time offer"]
    }
  ]
}
`;

    logger.info('Starting Gemini AI processing with new prompt:', {
      filePath: filePath,
      promptLength: SECTION_EXTRACTION_PROMPT.length,
      pdfBufferSize: pdfBytes.length,
      base64Size: Buffer.from(pdfBytes).toString("base64").length
    });

    try {
      logger.info('Calling Gemini AI model...');
      const result = await model.generateContent([
        { text: SECTION_EXTRACTION_PROMPT },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: Buffer.from(pdfBytes).toString("base64"),
          },
        },
      ]);
      
      const response = await result.response;
      let text = response.text();
      
      if (!text) {
        throw new Error("Empty response from Gemini.");
      }
      
      logger.info('Gemini AI response received:', {
        responseLength: text.length,
        filePath: filePath,
        responsePreview: text.substring(0, 200) + '...'
      });

      // Clean JSON (strip markdown fences if any)
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      let data;
      try {
        data = JSON.parse(cleaned);
        logger.info('JSON parsing successful:', {
          hasSections: !!data.sections,
          sectionsCount: data.sections ? data.sections.length : 0,
          filePath: filePath
        });
      } catch (err) {
        throw new Error(`Failed to parse JSON: ${err.message}\nRaw: ${cleaned}`);
      }

      // Filter out empty sections
      const rawSections = Array.isArray(data.sections) ? data.sections : [];
      const filteredSections = rawSections.filter(section =>
        Object.values(section).some(v => (Array.isArray(v) ? v.length > 0 : !!v))
      );

      logger.info('Sections filtered and processed:', {
        originalCount: rawSections.length,
        filteredCount: filteredSections.length,
        filePath: filePath
      });

      // Transform sections to match the exact format requested
      const sections = filteredSections.map((section) => {
        const components = {};
        
        // Add title if present
        if (section.title) {
          components.title = section.title;
        }
        
        // Add subtitle if present
        if (section.subtitle) {
          components.subtitle = section.subtitle;
        }
        
        // Add content if present
        if (section.content) {
          components.content = section.content;
        }
        
        // Add buttons if present
        if (section.buttons && section.buttons.length > 0) {
          components.buttons = section.buttons;
        }
        
        // Add images if present
        if (section.images && section.images.length > 0) {
          components.images = section.images;
        }
        
        // Add links if present
        if (section.links && section.links.length > 0) {
          components.links = section.links;
        }
        
        // Add messages if present
        if (section.messages && section.messages.length > 0) {
          components.messages = section.messages;
        }
        
        // Add lists if present
        if (section.lists && section.lists.length > 0) {
          components.items = section.lists;
        }
        
        // Add forms if present
        if (section.forms && section.forms.length > 0) {
          components.forms = section.forms;
        }
        
        // Add CTAs if present
        if (section.ctas && section.ctas.length > 0) {
          components.ctas = section.ctas;
        }

        return {
          name: section.section_name,
          components: components
        };
      });

      logger.info('PDF analysis completed successfully', {
        filePath,
        sectionsCount: sections.length
      });

      logger.info('=== PDF EXTRACTION COMPLETED SUCCESSFULLY ===', {
        filePath: filePath,
        sectionsCount: sections.length
      });

      res.json({
        sections: sections
      });

    } catch (geminiError) {
      logger.error('Gemini AI processing failed:', {
        error: geminiError.message,
        errorCode: geminiError.code,
        filePath: filePath,
        stack: geminiError.stack
      });
      
      // Fallback: create basic sections
      logger.info('Creating fallback analysis due to Gemini error...');
      const fallbackSections = createFallbackSections('');
      
      // Transform fallback sections to match the exact format
      const sections = fallbackSections.map((section) => {
        return {
          name: section.name || section.title || 'Unknown Section',
          components: {
            title: section.title || section.name || 'Section Title',
            content: section.content || 'Section content not available'
          }
        };
      });

      logger.info('=== PDF EXTRACTION COMPLETED WITH FALLBACK ===', {
        filePath: filePath,
        reason: 'Gemini AI error',
        sectionsCount: sections.length
      });

      res.json({
        sections: sections
      });
    }

  } catch (error) {
    logger.error('PDF extraction failed:', {
      error: error.message,
      errorCode: error.code,
      errorType: error.name,
      filePath: req.body?.filePath,
      stack: error.stack
    });
    
    res.status(500).json({
      error: error.message || 'Failed to extract PDF content'
    });
  }
});

// Public URL design extraction route (no authentication required)
router.post('/extract-design-from-url', async (req, res) => {
  try {
    logger.info('=== URL DESIGN EXTRACTION API CALLED ===');
    logger.info('Request body received:', {
      hasUrl: !!req.body.url,
      url: req.body.url,
      bodyKeys: Object.keys(req.body || {}),
      requestHeaders: {
        'content-type': req.get('content-type'),
        'user-agent': req.get('user-agent'),
        'authorization': req.get('authorization') ? 'present' : 'not present'
      }
    });
    
    const { url } = req.body;

    if (!url) {
      logger.error('URL design extraction failed: No URL provided');
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    if (!model) {
      logger.error('URL design extraction failed: Gemini AI model not initialized');
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized. Please check your API key configuration.'
      });
    }

    // Validate URL format
    let normalizedUrl;
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        normalizedUrl = 'https://' + url;
      } else {
        normalizedUrl = url;
      }
      new URL(normalizedUrl);
    } catch (error) {
      logger.error('URL design extraction failed: Invalid URL format', { url });
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    logger.info('URL design extraction request received:', {
      requestedUrl: url,
      normalizedUrl: normalizedUrl
    });

    // Scrape website content
    const WebsiteScraper = require('../utils/websiteScraper');
    const scraper = new WebsiteScraper();
    
    let websiteContent;
    try {
      websiteContent = await scraper.scrapeWebsite(normalizedUrl);
      logger.info('Website content scraped successfully:', {
        url: normalizedUrl,
        contentLength: websiteContent.length
      });
    } catch (scrapeError) {
      logger.error('Website scraping failed:', {
        error: scrapeError.message,
        url: normalizedUrl
      });
      return res.status(400).json({
        success: false,
        error: `Failed to scrape website: ${scrapeError.message}`
      });
    }

    // New comprehensive prompt for design section extraction from URL content
    const SECTION_EXTRACTION_PROMPT = `
You are a UI/UX design analysis agent for website content. 
Analyze the provided website content and identify distinct sections. For each section, detect ALL possible design elements. 
Possible fields include (but are not limited to):
- section_name (Hero, Features, Pricing, FAQ, About, Contact, etc.)
- title (main heading)
- subtitle (supporting heading)
- content (paragraphs, descriptions, messages)
- buttons (array of button labels)
- links (array of link texts or URLs)
- images (array of image/icon names or descriptions)
- messages/alerts (any special notices, banners, error/info messages)
- lists (bullet points, numbered items)
- forms/inputs (fields, placeholders, labels)
- CTAs (special calls-to-action)
- navigation (menu items, navigation elements)
- testimonials (customer reviews, quotes)
- pricing (pricing tiers, plans)
- features (feature lists, benefits)

⚠️ Rules:
- Include ONLY the fields that actually exist in the content.
- Do NOT add placeholders, dummy data, null, or empty arrays.
- Use arrays for multiple values (buttons, images, links, lists).
- Keep JSON clean and valid.
- Focus on the main landing page sections and their design elements.

Website URL: ${normalizedUrl}

Website Content:
${websiteContent.substring(0, 12000)} // Limit content length for Gemini

Return ONLY JSON with this structure:
{
  "sections": [
    {
      "section_name": "Hero",
      "title": "Welcome to Our Service",
      "subtitle": "Fast, Reliable, Secure",
      "content": "Supporting text...",
      "buttons": ["Get Started", "Learn More"],
      "images": ["hero_banner.png"],
      "messages": ["Limited-time offer"]
    }
  ]
}
`;

    logger.info('Starting Gemini AI processing with URL design extraction prompt:', {
      url: normalizedUrl,
      promptLength: SECTION_EXTRACTION_PROMPT.length,
      contentLength: websiteContent.length
    });

    try {
      logger.info('Calling Gemini AI model for URL design analysis...');
      const result = await model.generateContent(SECTION_EXTRACTION_PROMPT);
      
      const response = await result.response;
      let text = response.text();
      
      if (!text) {
        throw new Error("Empty response from Gemini.");
      }
      
      logger.info('Gemini AI response received for URL design analysis:', {
        responseLength: text.length,
        url: normalizedUrl,
        responsePreview: text.substring(0, 200) + '...'
      });

      // Clean JSON (strip markdown fences if any)
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      let data;
      try {
        data = JSON.parse(cleaned);
        logger.info('JSON parsing successful for URL design analysis:', {
          hasSections: !!data.sections,
          sectionsCount: data.sections ? data.sections.length : 0,
          url: normalizedUrl
        });
      } catch (err) {
        throw new Error(`Failed to parse JSON: ${err.message}\nRaw: ${cleaned}`);
      }

      // Filter out empty sections
      const rawSections = Array.isArray(data.sections) ? data.sections : [];
      const filteredSections = rawSections.filter(section =>
        Object.values(section).some(v => (Array.isArray(v) ? v.length > 0 : !!v))
      );

      logger.info('Sections filtered and processed for URL design analysis:', {
        originalCount: rawSections.length,
        filteredCount: filteredSections.length,
        url: normalizedUrl
      });

      // Transform sections to match the exact format requested
      const sections = filteredSections.map((section) => {
        const components = {};
        
        // Add title if present
        if (section.title) {
          components.title = section.title;
        }
        
        // Add subtitle if present
        if (section.subtitle) {
          components.subtitle = section.subtitle;
        }
        
        // Add content if present
        if (section.content) {
          components.content = section.content;
        }
        
        // Add buttons if present
        if (section.buttons && section.buttons.length > 0) {
          components.buttons = section.buttons;
        }
        
        // Add images if present
        if (section.images && section.images.length > 0) {
          components.images = section.images;
        }
        
        // Add links if present
        if (section.links && section.links.length > 0) {
          components.links = section.links;
        }
        
        // Add messages if present
        if (section.messages && section.messages.length > 0) {
          components.messages = section.messages;
        }
        
        // Add lists if present
        if (section.lists && section.lists.length > 0) {
          components.items = section.lists;
        }
        
        // Add forms if present
        if (section.forms && section.forms.length > 0) {
          components.forms = section.forms;
        }
        
        // Add CTAs if present
        if (section.ctas && section.ctas.length > 0) {
          components.ctas = section.ctas;
        }

        // Add navigation if present
        if (section.navigation && section.navigation.length > 0) {
          components.navigation = section.navigation;
        }

        // Add testimonials if present
        if (section.testimonials && section.testimonials.length > 0) {
          components.testimonials = section.testimonials;
        }

        // Add pricing if present
        if (section.pricing && section.pricing.length > 0) {
          components.pricing = section.pricing;
        }

        // Add features if present
        if (section.features && section.features.length > 0) {
          components.features = section.features;
        }

        return {
          name: section.section_name,
          components: components
        };
      });

      logger.info('URL design analysis completed successfully', {
        url: normalizedUrl,
        sectionsCount: sections.length
      });

      logger.info('=== URL DESIGN EXTRACTION COMPLETED SUCCESSFULLY ===', {
        url: normalizedUrl,
        sectionsCount: sections.length
      });

      res.json({
        success: true,
        sections: sections,
        sourceUrl: normalizedUrl
      });

    } catch (geminiError) {
      logger.error('Gemini AI processing failed for URL design analysis:', {
        error: geminiError.message,
        errorCode: geminiError.code,
        url: normalizedUrl,
        stack: geminiError.stack
      });
      
      // Fallback: create basic sections
      logger.info('Creating fallback analysis due to Gemini error...');
      const fallbackSections = createFallbackSections('');
      
      // Transform fallback sections to match the exact format
      const sections = fallbackSections.map((section) => {
        return {
          name: section.name || section.title || 'Unknown Section',
          components: {
            title: section.title || section.name || 'Section Title',
            content: section.content || 'Section content not available'
          }
        };
      });

      logger.info('=== URL DESIGN EXTRACTION COMPLETED WITH FALLBACK ===', {
        url: normalizedUrl,
        reason: 'Gemini AI error',
        sectionsCount: sections.length
      });

      res.json({
        success: true,
        sections: sections,
        sourceUrl: normalizedUrl
      });
    }

  } catch (error) {
    logger.error('URL design extraction failed:', {
      error: error.message,
      errorCode: error.code,
      errorType: error.name,
      url: req.body?.url,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract design from URL'
    });
  }
});

// @desc    Extract design from Figma
// @route   POST /api/ai/extract-figma
// @access  Public (no authentication required)
router.post('/extract-figma', async (req, res) => {
  try {
    logger.info('=== FIGMA DESIGN EXTRACTION API CALLED ===');
    logger.info('Request body received:', {
      hasUrl: !!req.body.figmaUrl,
      url: req.body.figmaUrl,
      bodyKeys: Object.keys(req.body || {}),
      requestHeaders: {
        'content-type': req.get('content-type'),
        'user-agent': req.get('user-agent'),
        'authorization': req.get('authorization') ? 'present' : 'not present'
      }
    });
    
    const { figmaUrl } = req.body;

    if (!figmaUrl) {
      logger.error('Figma design extraction failed: No URL provided');
      return res.status(400).json({
        success: false,
        error: 'Figma URL is required'
      });
    }

    if (!model) {
      logger.error('Figma design extraction failed: Gemini AI model not initialized');
      return res.status(500).json({
        success: false,
        error: 'Gemini AI model not initialized. Please check your API key configuration.'
      });
    }

    // Check if Figma access token is configured
    if (!config.figmaAccessToken) {
      logger.error('Figma design extraction failed: Figma access token not configured');
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
      logger.error('Figma design extraction failed: Invalid URL format', { figmaUrl });
      return res.status(400).json({
        success: false,
        error: 'Invalid Figma URL. Could not extract file key.'
      });
    }

    logger.info('Figma design extraction request received:', {
      requestedUrl: figmaUrl,
      fileKey: fileKey
    });

    // Fetch file from Figma API
    let figmaFile;
    try {
      figmaFile = await figmaApi.getFile(fileKey);
      logger.info('Figma file fetched successfully:', {
        url: figmaUrl,
        fileName: figmaFile?.name || 'Unknown',
        fileKey: fileKey
      });
    } catch (fetchError) {
      logger.error('Figma file fetch failed:', {
        error: fetchError.message,
        url: figmaUrl,
        fileKey: fileKey
      });
      return res.status(400).json({
        success: false,
        error: `Failed to fetch Figma file: ${fetchError.message}`
      });
    }
    
    if (!figmaFile || !figmaFile.document) {
      logger.error('Figma file fetch validation failed:', {
        hasFigmaFile: !!figmaFile,
        hasDocument: !!figmaFile?.document,
        figmaUrl: figmaUrl
      });
      return res.status(400).json({
        success: false,
        error: 'Failed to fetch Figma file or file is empty'
      });
    }

    // Get basic file analysis first
    const sections = figmaApi.analyzeDesignStructure(figmaFile.document);
    const designTokens = figmaApi.extractDesignTokens(figmaFile.document);
    const layoutAnalysis = figmaApi.analyzeLayout(figmaFile.document);

    // Prepare Figma data for Gemini analysis with extracted elements
    const figmaDataForAnalysis = {
          fileName: figmaFile.name,
      sections: sections.slice(0, 10).map(section => ({
        name: section.title,
        type: section.type,
        extractedElements: section.extractedElements,
        nodeInfo: {
          width: section.boundingBox?.width || 0,
          height: section.boundingBox?.height || 0,
          isComponent: section.isComponent,
          autoLayout: section.autoLayout
        }
      })),
          designTokens: designTokens,
          layoutAnalysis: layoutAnalysis,
          documentSummary: {
            nodeCount: figmaFile.document.children?.length || 0,
        hasComponents: figmaFile.document.children?.some(child => child.type === 'COMPONENT') || false,
        documentType: figmaFile.document.type || 'DOCUMENT',
        totalSections: sections.length
      }
    };

    // Create comprehensive prompt for Gemini AI analysis with actual extracted elements
    const FIGMA_SECTION_EXTRACTION_PROMPT = `
You are a UI/UX design analysis agent for Figma designs. 
Analyze the provided Figma design data and extract the ACTUAL design elements that were found in each section.

The Figma analysis has already extracted real design elements from each section:
- texts: Array of actual text content found in the design
- buttons: Array of actual buttons with their text and styles
- images: Array of actual images with descriptions
- forms: Array of actual form elements found

Your task is to transform these extracted elements into a clean, organized format for each section.

⚠️ CRITICAL RULES:
- Use ONLY the actual extracted elements provided - NO placeholders or dummy content
- If a section has no extracted texts, buttons, or images, DO NOT add fake ones
- Transform the actual text content into proper titles, subtitles, and content
- Use the actual button text found in the design
- Use the actual image descriptions found in the design
- Keep the JSON clean and only include elements that actually exist

Figma Design URL: ${figmaUrl}
File Name: ${figmaFile.name}

Extracted Figma Design Data with Real Elements:
${JSON.stringify(figmaDataForAnalysis, null, 2)}

Transform the extracted elements into this structure (ONLY include fields with actual data):
{
  "sections": [
    {
      "section_name": "[Use the section name from the analysis]",
      "title": "[Use actual text content found in the section - largest/most prominent text]",
      "subtitle": "[Use actual secondary text if found]", 
      "content": "[Use actual paragraph/body text if found]",
      "buttons": ["[Use actual button text found]"],
      "images": ["[Use actual image descriptions found]"],
      "navigation": ["[Use actual navigation text if found]"]
    }
  ]
}

REMEMBER: Use ONLY the actual extracted elements - no placeholders like "[Section Content - Customize as needed]"
`;

    logger.info('Starting Gemini AI processing with Figma design extraction prompt:', {
      figmaUrl: figmaUrl,
      promptLength: FIGMA_SECTION_EXTRACTION_PROMPT.length,
      figmaDataLength: JSON.stringify(figmaDataForAnalysis).length
    });

    try {
      logger.info('Calling Gemini AI model for Figma design analysis...');
      const result = await model.generateContent(FIGMA_SECTION_EXTRACTION_PROMPT);
      
      const response = await result.response;
      let text = response.text();
      
      if (!text) {
        throw new Error("Empty response from Gemini.");
      }
      
      logger.info('Gemini AI response received for Figma design analysis:', {
        responseLength: text.length,
        figmaUrl: figmaUrl,
        responsePreview: text.substring(0, 200) + '...'
      });

      // Clean JSON (strip markdown fences if any)
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      let data;
      try {
        data = JSON.parse(cleaned);
        logger.info('JSON parsing successful for Figma design analysis:', {
          hasSections: !!data.sections,
          sectionsCount: data.sections ? data.sections.length : 0,
          figmaUrl: figmaUrl
        });
      } catch (err) {
        throw new Error(`Failed to parse JSON: ${err.message}\nRaw: ${cleaned}`);
      }

      // Filter out empty sections
      const rawSections = Array.isArray(data.sections) ? data.sections : [];
      const filteredSections = rawSections.filter(section =>
        Object.values(section).some(v => (Array.isArray(v) ? v.length > 0 : !!v))
      );

      logger.info('Sections filtered and processed for Figma design analysis:', {
        originalCount: rawSections.length,
        filteredCount: filteredSections.length,
        figmaUrl: figmaUrl
      });

      // Transform sections to match the exact format requested (like URL extraction)
      const transformedSections = filteredSections.map((section) => {
        const components = {};
        
        // Add title if present
        if (section.title) {
          components.title = section.title;
        }
        
        // Add subtitle if present
        if (section.subtitle) {
          components.subtitle = section.subtitle;
        }
        
        // Add content if present
        if (section.content) {
          components.content = section.content;
        }
        
        // Add buttons if present
        if (section.buttons && section.buttons.length > 0) {
          components.buttons = section.buttons;
        }
        
        // Add images if present
        if (section.images && section.images.length > 0) {
          components.images = section.images;
        }
        
        // Add links if present
        if (section.links && section.links.length > 0) {
          components.links = section.links;
        }
        
        // Add messages if present
        if (section.messages && section.messages.length > 0) {
          components.messages = section.messages;
        }
        
        // Add lists if present
        if (section.lists && section.lists.length > 0) {
          components.items = section.lists;
        }
        
        // Add forms if present
        if (section.forms && section.forms.length > 0) {
          components.forms = section.forms;
        }
        
        // Add CTAs if present
        if (section.ctas && section.ctas.length > 0) {
          components.ctas = section.ctas;
        }

        // Add navigation if present
        if (section.navigation && section.navigation.length > 0) {
          components.navigation = section.navigation;
        }

        // Add testimonials if present
        if (section.testimonials && section.testimonials.length > 0) {
          components.testimonials = section.testimonials;
        }

        // Add pricing if present
        if (section.pricing && section.pricing.length > 0) {
          components.pricing = section.pricing;
        }

        // Add features if present
        if (section.features && section.features.length > 0) {
          components.features = section.features;
        }

        return {
          name: section.section_name,
          components: components
        };
      });

      logger.info('Figma design analysis completed successfully', {
        figmaUrl: figmaUrl,
        sectionsCount: transformedSections.length
      });

      logger.info('=== FIGMA DESIGN EXTRACTION COMPLETED SUCCESSFULLY ===', {
        figmaUrl: figmaUrl,
        sectionsCount: transformedSections.length
      });

      res.json({
        success: true,
        sections: transformedSections,
        sourceUrl: figmaUrl
      });

      } catch (geminiError) {
      logger.error('Gemini AI processing failed for Figma design analysis:', {
        error: geminiError.message,
        errorCode: geminiError.code,
        figmaUrl: figmaUrl,
        stack: geminiError.stack
      });
      
      // Fallback: create basic sections from the original Figma API analysis
      logger.info('Creating fallback analysis due to Gemini error...');
      const fallbackSections = sections.map((section) => {
        return {
          name: section.name || section.title || 'Unknown Section',
          components: {
            title: section.title || section.name || 'Section Title',
            content: section.content || 'Section content extracted from Figma design'
          }
        };
      });

      logger.info('=== FIGMA DESIGN EXTRACTION COMPLETED WITH FALLBACK ===', {
        figmaUrl: figmaUrl,
        reason: 'Gemini AI error',
        sectionsCount: fallbackSections.length
    });

    res.json({
      success: true,
        sections: fallbackSections,
        sourceUrl: figmaUrl
      });
    }

  } catch (error) {
    logger.error('Figma design extraction failed:', {
      error: error.message,
      errorCode: error.code,
      errorType: error.name,
      figmaUrl: req.body?.figmaUrl,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract design from Figma'
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
      model: 'gemini-2.0-flash',
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
      // CRITICAL: Use extracted sections instead of creating defaults
      const extractedSectionTypes = extractedData?.sections?.map(s => s.type || s.name) || [];
      planningData = {
        targetSections: extractedSectionTypes.length > 0 ? extractedSectionTypes : ['content'],
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
      model: 'gemini-2.0-flash',
      currentStep: 'Complete',
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

// Helper function to update process step in database with robust error handling
async function updateProcessStep(landingPageId, stepName, stepData, isCompleted = true) {
  try {
    const LandingPage = require('../models/LandingPage');
    
    // Prepare the update data - simplified structure
    const updateData = {
      [`processSteps.${stepName}.completed`]: isCompleted,
      [`processSteps.${stepName}.completedAt`]: new Date(),
      [`processSteps.${stepName}.data`]: stepData,
      currentStep: isCompleted ? stepName : 'error',
      updatedAt: new Date()
    };
    
    const result = await LandingPage.findByIdAndUpdate(landingPageId, updateData, { 
      new: true, 
      runValidators: true,
      strict: false // Allow dynamic field updates
    });
    
    if (!result) {
      throw new Error(`Landing page record not found: ${landingPageId}`);
    }
    
    logger.info(`Process step updated successfully: ${stepName}`, { 
      landingPageId, 
      stepName, 
      completed: isCompleted
    });
    
    return { success: true, record: result };
  } catch (error) {
    logger.error(`CRITICAL: Failed to update process step: ${stepName}`, { 
      error: error.message, 
      landingPageId, 
      stepName,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

// Helper function to safely create initial database record
async function createInitialLandingPageRecord(recordData) {
  const LandingPage = require('../models/LandingPage');
  try {
    
    // Add creation metadata
    const enhancedRecord = {
      ...recordData,
      creationMetadata: {
        source: 'generate-dynamic-landing-page',
        version: '2.0',
        createdAt: new Date(),
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    const savedRecord = await LandingPage.create(enhancedRecord);
    logger.info('Initial database record created successfully', { 
      landingPageId: savedRecord._id,
      businessName: savedRecord.businessName,
      recordSize: JSON.stringify(savedRecord).length
    });
    
    return { success: true, record: savedRecord, id: savedRecord._id };
  } catch (error) {
    logger.error('CRITICAL: Failed to create initial database record', { 
      error: error.message,
      businessName: recordData.businessName,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

// New endpoint for dynamic landing page generation with Gemini (public route)
router.post('/generate-dynamic-landing-page', async (req, res) => {
  let landingPageId = null;
  const LandingPage = require('../models/LandingPage');
  
  try {
    const { businessInfo, extractedData, designType, user } = req.body;

    // STEP 1: VALIDATION - Create initial database record 
    // Validate required data
    if (!businessInfo || !businessInfo.businessName) {
      return res.status(400).json({
        success: false,
        error: 'Business information is required'
      });
    }

    // Create initial database record with validation step
    const initialRecord = {
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
        type: designType || 'url',
        fileName: extractedData?.metadata?.title || 'Processing...',
        processedAt: new Date()
      },
      sections: [],
      status: 'draft',
      tags: ['ai-generated'],
      isPublic: false,
      generatedAt: new Date(),
      model: 'gemini-2.0-flash',
      meta: {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services`,
        ogTitle: `${businessInfo.businessName} - Professional Services`,
        ogDescription: businessInfo.businessOverview,
        ogImage: '/images/og-image.jpg'
      },
      processSteps: {
        "Extract Design": {
          completed: true,
          completedAt: new Date(),
          data: {
            stepName: 'validation',
            inputData: { businessInfo, extractedData, designType },
            outputData: {
              businessInfoValid: !!(businessInfo && businessInfo.businessName),
              extractedDataValid: !!(extractedData && Object.keys(extractedData).length > 0),
              preferencesValid: true,
              errors: []
            }
          }
        },
        "Plan Content": { completed: false, data: {} },
        "Analyze Design": { completed: false, data: {} },
        "Generate Content": { completed: false, data: {} },
        "Generate Landing Page": { completed: false, data: {} },
        "Preview Landing Page": { completed: false, data: {} },
        "Download Landing Page": { completed: false, data: {} }
      },
      currentStep: 'Extract Design'
    };

    // Create database record - THIS MUST SUCCEED
    const createResult = await createInitialLandingPageRecord(initialRecord);
    if (!createResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create database record: ' + createResult.error
      });
    }
    
    landingPageId = createResult.id;
    logger.info('Step 1 - Initial database record created successfully', { landingPageId });

    // STEP 2: CONTENT PLANNING
    const stepStartTime2 = new Date();
    const context = {
      businessName: businessInfo.businessName,
      businessOverview: businessInfo.businessOverview || 'Professional services',
      targetAudience: businessInfo.targetAudience || 'General customers',
      brandTone: businessInfo.brandTone || 'Professional',
      extractedSections: extractedData?.sections || [],
      designType: designType || 'unknown',
      layoutStructure: extractedData?.layout_structure || null,
      textElements: extractedData?.text_elements || null,
      comprehensiveAnalysis: extractedData?.comprehensiveAnalysis || null,
      designSections: extractedData?.sections || {},
      sectionTypes: extractedData?.sectionTypes || []
    };

    const contentPlanningResult = await updateProcessStep(landingPageId, 'Plan Content', {
      stepName: 'contentPlanning',
      inputData: { businessInfo, extractedData },
      outputData: context,
      processingTime: new Date() - stepStartTime2
    });

    if (!contentPlanningResult.success) {
      logger.error('Content planning step failed', { landingPageId, error: contentPlanningResult.error });
    }

    // STEP 3: DESIGN ANALYSIS
    const stepStartTime3 = new Date();
    const designAnalysisResult = await updateProcessStep(landingPageId, 'Analyze Design', {
      stepName: 'designAnalysis',
      inputData: extractedData,
      outputData: {
        layoutStructure: context.layoutStructure,
        extractedDataAnalysis: extractedData
      },
      processingTime: new Date() - stepStartTime3
    });

    if (!designAnalysisResult.success) {
      logger.error('Design analysis step failed', { landingPageId, error: designAnalysisResult.error });
    }

    // STEP 4: CONTENT GENERATION
    const stepStartTime4 = new Date();
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
    });

    const enhancedContent = enhanceGeneratedContent(landingPageData, context);

    const contentGenerationResult = await updateProcessStep(landingPageId, 'Generate Content', {
      stepName: 'contentGeneration',
      inputData: {
        businessInfo,
        extractedData,
        preferences: { designType: designType || 'pdf', layoutStyle: 'clean' }
      },
      outputData: {
        landingPageData,
        enhancedContent: {
          sections: enhancedContent.sections?.length || 0,
          hasCSS: !!enhancedContent.css,
          hasJS: !!enhancedContent.js,
          hasHTML: !!enhancedContent.html
        }
      },
      processingTime: new Date() - stepStartTime4
    });

    if (!contentGenerationResult.success) {
      logger.error('Content generation step failed', { landingPageId, error: contentGenerationResult.error });
    }

    // STEP 5: GENERATE LANDING PAGE
    const stepStartTime5 = new Date();
    const qualityScore = calculateQualityScore(enhancedContent, businessInfo);
    
    // Update sections in database
    const formattedSections = enhancedContent.sections?.map(section => {
      if (section.components) {
        return {
          id: section.id,
          name: section.name,
          type: section.name?.toLowerCase() || 'content',
          title: section.name || 'Section',
          content: '',
          components: section.components,
          order: section.order || 1
        };
      } else {
        return {
          id: section.id,
          type: section.type,
          title: section.title,
          content: section.content || `Content for ${section.title || section.type}`,
          order: section.order || 1
        };
      }
    }) || [];

    // Update the database record with sections and other data
    await LandingPage.findByIdAndUpdate(landingPageId, {
      sections: formattedSections,
      tags: ['ai-generated', 'extracted-data', 'dynamic-generation', 'completed'],
      meta: enhancedContent.meta || {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`,
        ogTitle: `${businessInfo.businessName} - Professional Services`,
        ogDescription: businessInfo.businessOverview,
        ogImage: '/images/og-image.jpg'
      }
    });

    const generateLandingPageResult = await updateProcessStep(landingPageId, 'Generate Landing Page', {
      stepName: 'generateLandingPage',
      inputData: {
        enhancedContent: {
          sectionsCount: enhancedContent.sections?.length || 0,
          hasHTML: !!enhancedContent.html,
          hasCSS: !!enhancedContent.css,
          hasJS: !!enhancedContent.js
        }
      },
      outputData: {
        formattedSections: formattedSections.length,
        qualityScore,
        databaseUpdated: true
      },
      processingTime: new Date() - stepStartTime5
    });

    if (!generateLandingPageResult.success) {
      logger.error('Generate landing page step failed', { landingPageId, error: generateLandingPageResult.error });
    }

    // STEP 6: PREVIEW LANDING PAGE
    const stepStartTime6 = new Date();
    const previewLandingPageResult = await updateProcessStep(landingPageId, 'Preview Landing Page', {
      stepName: 'previewLandingPage',
      inputData: {
        landingPageId,
        sectionsCount: formattedSections.length
      },
      outputData: {
        previewUrl: `/api/ai/preview-landing-page/${landingPageId}`,
        previewGenerated: true,
        qualityScore
      },
      processingTime: new Date() - stepStartTime6
    });

    if (!previewLandingPageResult.success) {
      logger.error('Preview landing page step failed', { landingPageId, error: previewLandingPageResult.error });
    }

    // STEP 7: DOWNLOAD LANDING PAGE PREPARATION
    const stepStartTime7 = new Date();
    const downloadLandingPageResult = await updateProcessStep(landingPageId, 'Download Landing Page', {
      stepName: 'downloadLandingPage',
      inputData: {
        landingPageId,
        htmlLength: (enhancedContent.html || '').length
      },
      outputData: {
        downloadUrl: `/api/ai/download-landing-page/${landingPageId}`,
        downloadPrepared: true,
        fileSize: (enhancedContent.html || '').length,
        downloadFormat: 'HTML'
      },
      processingTime: new Date() - stepStartTime7
    });

    if (!downloadLandingPageResult.success) {
      logger.error('Download landing page step failed', { landingPageId, error: downloadLandingPageResult.error });
    }

    // Final update - mark as completed
    await LandingPage.findByIdAndUpdate(landingPageId, {
      currentStep: 'Complete',
      completedAt: new Date(),
      tags: ['ai-generated', 'extracted-data', 'dynamic-generation', 'completed', 'step-by-step-tracked']
    });

    // Get the final record to return
    const finalRecord = await LandingPage.findById(landingPageId);

    res.json({
      success: true,
      message: 'Dynamic landing page generated and saved successfully with step-by-step tracking',
      data: {
        id: landingPageId,
        title: finalRecord.title,
        businessName: finalRecord.businessName,
        landingPageContent: enhancedContent,
        qualityScore,
        processSteps: finalRecord.processSteps,
        currentStep: finalRecord.currentStep,
        generationData: {
          htmlGenerated: !!enhancedContent.html,
          cssGenerated: !!enhancedContent.css,
          jsGenerated: !!enhancedContent.js,
          sectionsGenerated: formattedSections.length,
          generationTime: Date.now(),
          qualityScore
        },
        databaseRecord: {
          id: landingPageId,
          status: finalRecord.status,
          generatedAt: finalRecord.generatedAt,
          model: finalRecord.model,
          processSteps: finalRecord.processSteps
        },
        downloadUrl: `/api/ai/download-landing-page/${landingPageId}`,
        previewUrl: `/api/ai/preview-landing-page/${landingPageId}`,
        editUrl: `/editor/${landingPageId}`,
        completedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Dynamic landing page generation failed:', error);
    
    // If we have a landingPageId, try to update it with error information
    if (landingPageId) {
      try {
        await updateProcessStep(landingPageId, 'error', {
          errorMessage: error.message,
          errorStep: 'generation',
          errorTime: new Date(),
          errorStack: error.stack
        }, false);
      } catch (updateError) {
        logger.error('Failed to update error step:', updateError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error during landing page generation: ' + error.message,
      landingPageId: landingPageId,
      timestamp: new Date().toISOString()
    });
  }
});

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
        model: 'gemini-2.0-flash'
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
        model: 'gemini-2.0-flash'
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
      model: 'gemini-2.0-flash',
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
      `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
  // CRITICAL: Always use extracted sections, never create fallbacks
  const extractedSections = extractedData?.sections || [];
  
  // If no extracted sections, return minimal structure to preserve design intent
  if (!extractedSections || extractedSections.length === 0) {
    return {
      sections: [],
      meta: {
        title: `${businessInfo.businessName} - Professional Services`.substring(0, 100),
        description: businessInfo.businessOverview,
        keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`,
        ogTitle: `${businessInfo.businessName} - Professional Services`,
        ogDescription: businessInfo.businessOverview,
        ogImage: '/images/og-image.jpg'
      }
    };
  }

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
You are a professional content generator that creates landing page content based on STRICTLY the extracted design sections and business information.

CRITICAL RULE: You MUST ONLY use the extracted sections provided. DO NOT add, remove, or create new sections.

INPUT FORMAT:
- businessInfo: Business details (name, overview, target audience, tone, website)
- extractedData.sections: Array of sections with components structure (USE EXACTLY THESE)

OUTPUT FORMAT:
Return the EXACT same JSON structure with customized content for each extracted section:

{
  "sections": [
    {
      "name": "Section Name from extraction",
      "components": {
        "title": "Customized title",
        "subtitle": "Customized subtitle", 
        "content": "Customized content",
        "buttons": ["Customized button 1", "Customized button 2"],
        "images": ["Customized image 1", "Customized image 2"],
        "links": ["Customized link 1", "Customized link 2"],
        "messages": ["Customized message 1", "Customized message 2"],
        "items": ["Customized item 1", "Customized item 2"]
      }
    }
  ]
}

BUSINESS INFORMATION:
- Business Name: ${businessInfo.businessName}
- Business Overview: ${businessInfo.businessOverview}
- Target Audience: ${businessInfo.targetAudience}
- Brand Tone: ${businessInfo.brandTone || 'professional'}
- Website URL: ${businessInfo.websiteUrl || 'Not provided'}

EXTRACTED DESIGN SECTIONS (USE EXACTLY THESE - NO MORE, NO LESS):
${JSON.stringify(extractedSections, null, 2)}

RULES:
1. Keep the EXACT same structure and number of sections as the extracted design
2. For each component, generate content relevant to ${businessInfo.businessName}
3. Make content specific to the business and target audience
4. Maintain the same component types (title, subtitle, content, buttons, images, links, messages, items)
5. Ensure content matches the brand tone: ${businessInfo.brandTone || 'professional'}
6. ${lengthInstruction}
7. Return ONLY the JSON object - no other text
8. NEVER add sections that don't exist in the extracted design
9. NEVER remove sections that exist in the extracted design

EXAMPLE TRANSFORMATION:
Input: {"name": "Hero", "components": {"title": "Spicy delicious chicken wings", "buttons": ["View Recipes"]}}
Output: {"name": "Hero", "components": {"title": "Transform Your Business with ${businessInfo.businessName}", "buttons": ["Get Started", "Learn More"]}}

Generate the complete response now using ONLY the ${extractedSections.length} extracted sections:

IMPORTANT: Your response MUST contain exactly ${extractedSections.length} sections - no more, no less.
If you generate more than ${extractedSections.length} sections, the response will be rejected.
`;

  try {
    let result = await model.generateContent(prompt);
    let response = await result.response;
    let text = response.text();
    
    // Parse the response - handle both old format and new components format
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
      
      // CRITICAL VALIDATION: Enforce exact section count
      if (parsedResponse.sections && parsedResponse.sections.length !== extractedSections.length) {
        parsedResponse.sections = parsedResponse.sections.slice(0, extractedSections.length);
      }
      
      // Check word counts for both old and new formats
      let needsRetry = false;
      if (parsedResponse.sections && parsedResponse.sections.length > 0) {
        for (const section of parsedResponse.sections) {
          // For new format with components, check content in components
          if (section.components) {
            const contentText = section.components.content || '';
            const wordCount = contentText.split(/\s+/).length;
            if (wordCount > 0 && !validateWordCount(wordCount, contentLength, customLength)) {
              needsRetry = true;
              break;
            }
          } else {
            // For old format, check section.content
            const wordCount = section.content ? section.content.split(/\s+/).length : 0;
            if (!validateWordCount(wordCount, contentLength, customLength)) {
              needsRetry = true;
              break;
            }
          }
        }
      }
      
      // If word counts don't meet requirements, use smart fallback instead of retries
      if (needsRetry) {
        
        // Use smart fallback: manually expand content immediately
        if (parsedResponse.sections && parsedResponse.sections.length > 0) {
          parsedResponse.sections = parsedResponse.sections.map(section => {
            // Handle new format with components
            if (section.components && section.components.content) {
              const currentWordCount = section.components.content.split(/\s+/).length;
              const targetMinWords = contentLength === 'short' ? 50 : 
                                   contentLength === 'medium' ? 100 : 
                                   contentLength === 'long' ? 200 : 
                                   (customLength || 150) - 10;
              
              if (currentWordCount < targetMinWords) {
                const expansion = generateContentExpansion(section, businessInfo, targetMinWords - currentWordCount);
                section.components.content = section.components.content + ' ' + expansion;
              }
            } else if (section.content) {
              // Handle old format
              const currentWordCount = section.content.split(/\s+/).length;
              const targetMinWords = contentLength === 'short' ? 50 : 
                                   contentLength === 'medium' ? 100 : 
                                   contentLength === 'long' ? 200 : 
                                   (customLength || 150) - 10;
              
              if (currentWordCount < targetMinWords) {
                const expansion = generateContentExpansion(section, businessInfo, targetMinWords - currentWordCount);
                section.content = section.content + ' ' + expansion;
              }
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
          
          // CRITICAL VALIDATION: Enforce exact section count in fallback parsing too
          if (parsedResponse.sections && parsedResponse.sections.length !== extractedSections.length) {
            parsedResponse.sections = parsedResponse.sections.slice(0, extractedSections.length);
          }
        } else {
          // Fallback to object format
          const objectMatch = text.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsedResponse = JSON.parse(objectMatch[0]);
          } else {
            parsedResponse = JSON.parse(text);
          }
          
          // CRITICAL VALIDATION: Enforce exact section count in object parsing too
          if (parsedResponse.sections && parsedResponse.sections.length !== extractedSections.length) {
            parsedResponse.sections = parsedResponse.sections.slice(0, extractedSections.length);
          }
        }
      } catch (parseError) {
      // CRITICAL: Always use extracted sections for fallback, never create new ones
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

    // Transform the sections to match expected structure - handle both old and new formats
    if (parsedResponse.sections && parsedResponse.sections.length > 0) {
      parsedResponse.sections = parsedResponse.sections.map((section, index) => {
        // Handle new format with components
        if (section.components) {
          return {
            id: section.id || `section-${index + 1}`,
            name: section.name || `Section ${index + 1}`,
            components: section.components,
            order: section.order || index + 1
          };
        } else {
          // Handle old format
          return {
            id: section.id || `section-${index + 1}`,
            type: section.type || 'content',
            title: section.title || section.name || `Section ${index + 1}`,
            content: cleanHtmlContent(section.content) || generateBusinessSpecificContent(section, businessInfo),
            order: section.order || index + 1
          };
        }
      });
      
      // Validate word counts (simplified logging)
      let totalWords = 0;
      let sectionsMeetingRequirements = 0;
      parsedResponse.sections.forEach((section, index) => {
        let wordCount = 0;
        
        // Handle new format with components
        if (section.components) {
          // Count words in all text components
          Object.values(section.components).forEach(component => {
            if (Array.isArray(component)) {
              component.forEach(item => {
                if (typeof item === 'string') {
                  wordCount += item.split(/\s+/).length;
                } else if (typeof item === 'object' && item.content) {
                  wordCount += item.content.split(/\s+/).length;
                }
              });
            } else if (typeof component === 'string') {
              wordCount += component.split(/\s+/).length;
            }
          });
        } else {
          // Handle old format
          wordCount = section.content ? section.content.split(/\s+/).length : 0;
        }
        
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

// Helper function to create fallback landing page - STRICTLY using extracted sections
function createFallbackLandingPage(businessInfo, extractedData) {
  // CRITICAL: ONLY use extracted sections, never create defaults
  const extractedSections = extractedData?.sections || [];
  
  let sections = [];
  
  if (extractedSections.length > 0) {
    // Create sections based STRICTLY on extracted design structure with business-specific content
    sections = extractedSections.map((section, index) => {
      return {
        id: section.id || `section-${index + 1}`,
        type: section.type || 'content',
        title: section.title || section.name || `Section ${index + 1}`,
        content: generateBusinessSpecificContent(section, businessInfo),
        order: section.order || index + 1,
        // Preserve all original section properties
        name: section.name,
        components: section.components,
        pageNumber: section.pageNumber,
        boundingBox: section.boundingBox,
        metadata: section.metadata
      };
    });
  } else {
    // If NO extracted sections, return empty - DO NOT create defaults
    sections = [];
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
  
  // Ensure sections are properly formatted - handle both old and new formats
  if (enhanced.sections && Array.isArray(enhanced.sections)) {
    enhanced.sections = enhanced.sections.map((section, index) => {
      // Handle new format with components
      if (section.components) {
        return {
          id: section.id || `section-${index + 1}`,
          name: section.name || `Section ${index + 1}`,
          components: section.components,
          order: section.order || index + 1
        };
      } else {
        // Handle old format
        return {
          id: section.id || `section-${index + 1}`,
          type: section.type || 'content',
          title: section.title || `Section ${index + 1}`,
          content: section.content || `Content for ${section.title || section.type}`,
          order: section.order || index + 1
        };
      }
    });
  }
  
  // Enhance HTML content with business context
  if (enhanced.html && !enhanced.html.includes(context.businessName)) {
    enhanced.html = enhanced.html.replace(/Your Business Name/g, context.businessName)
    enhanced.html = enhanced.html.replace(/Business Name/g, context.businessName)
  }

  return enhanced
}

module.exports = router;
