const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');
const config = require('../config/backend-config');

class WebsiteScraper {
  constructor() {
    this.gemini = new GoogleGenerativeAI(config.geminiApiKey);
    
    // Use the working model from our test
    try {
      this.model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      logger.info('Gemini model initialized successfully: gemini-1.5-flash');
    } catch (error) {
      logger.error('Failed to initialize Gemini model:', error);
      throw new Error('Unable to initialize Gemini AI model. Please check your API key and model configuration.');
    }
  }

  /**
   * Scrape website content and extract business information
   * @param {string} url - Website URL to scrape
   * @returns {Promise<Object>} - Extracted business information
   */
  async scrapeAndAnalyze(url) {
    try {
      logger.info(`Starting website scraping for: ${url}`);
      
      // Scrape website content
      const websiteContent = await this.scrapeWebsite(url);
      
      if (!websiteContent) {
        throw new Error('Failed to scrape website content');
      }

      // Analyze content using Gemini
      const businessInfo = await this.analyzeWithGemini(websiteContent, url);
      
      logger.info(`Successfully analyzed website: ${url}`);
      return businessInfo;
      
    } catch (error) {
      logger.error(`Error scraping and analyzing website ${url}:`, error);
      throw error;
    }
  }

  /**
   * Scrape website content with retry mechanism and better error handling
   * @param {string} url - Website URL
   * @returns {Promise<string>} - Website content
   */
  async scrapeWebsite(url) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Scraping attempt ${attempt}/${maxRetries} for: ${url}`);
        
        // Validate URL before making request
        this.validateUrl(url);
        
        const response = await axios.get(url, {
          timeout: 50000, // 50 seconds timeout
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        // Extract text content from HTML
        const htmlContent = response.data;
        const textContent = this.extractTextFromHTML(htmlContent);
        
        if (!textContent || textContent.trim().length < 50) {
          throw new Error('Website content is too short or empty');
        }
        
        logger.info(`Successfully scraped website: ${url} (${textContent.length} characters)`);
        return textContent;
        
      } catch (error) {
        logger.error(`Scraping attempt ${attempt} failed for ${url}:`, error.message);
        
        // Handle specific error types
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error(`The provided URL is not accessible. Please check the URL and try again.`);
        } else if (error.response?.status === 403) {
          throw new Error(`The website is blocking automated access (403 Forbidden). This is common for websites that protect against scraping. Please try a different website or provide business information manually.`);
        } else if (error.response?.status === 404) {
          throw new Error(`The provided URL was not found. Please check the URL and try again.`);
        } else if (error.response?.status >= 500) {
          throw new Error(`The website server is experiencing issues. Please try again later.`);
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          if (attempt === maxRetries) {
            throw new Error(`Request timeout: The website took too long to respond. Please try again or use a different URL.`);
          }
          // Continue to retry for timeout errors
        } else if (error.message.includes('security') || error.message.includes('blocked')) {
          throw new Error(`The website is blocking automated access. This is common for websites that protect against scraping. Please try a different website or provide business information manually.`);
        }
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(`Failed to scrape website after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Validate URL for security and format
   * @param {string} url - URL to validate
   */
  validateUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /0\.0\.0\.0/,
        /192\.168\./,
        /10\./,
        /172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /file:\/\//,
        /ftp:\/\//,
        /javascript:/,
        /data:/
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          throw new Error('The provided URL is not allowed due to security restrictions');
        }
      }
      
      // Check URL length
      if (url.length > 2048) {
        throw new Error('URL is too long');
      }
      
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Extract text content from HTML
   * @param {string} html - HTML content
   * @returns {string} - Extracted text
   */
  extractTextFromHTML(html) {
    try {
      // Remove script and style tags
      let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      // Remove HTML tags
      text = text.replace(/<[^>]*>/g, ' ');
      
      // Decode HTML entities
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#39;/g, "'");
      
      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();
      
      return text;
    } catch (error) {
      logger.error('Error extracting text from HTML:', error);
      return html; // Return original HTML if text extraction fails
    }
  }

  /**
   * Analyze website content using Gemini AI with timeout and retry mechanism
   * @param {string} content - Website content
   * @param {string} url - Original URL
   * @returns {Promise<Object>} - Analyzed business information
   */
  async analyzeWithGemini(content, url) {
    const maxRetries = 2;
    const baseDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Gemini analysis attempt ${attempt}/${maxRetries} for: ${url}`);
        
        const prompt = this.buildAnalysisPrompt(content, url);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Gemini AI request timeout after 50 seconds')), 50000);
        });
        
        const geminiPromise = this.model.generateContent(prompt).then(result => {
          const response = result.response;
          return response.text();
        });
        
        const text = await Promise.race([geminiPromise, timeoutPromise]);
        
        // Parse Gemini response
        const businessInfo = this.parseGeminiResponse(text);
        
        logger.info(`Successfully analyzed content with Gemini for: ${url}`);
        return {
          isAutoGenerated: true,
          generatedAt: new Date(),
          sourceUrl: url,
          generatedContent: businessInfo
        };
        
      } catch (error) {
        logger.error(`Gemini analysis attempt ${attempt} failed for ${url}:`, error.message);
        
        // Handle specific error types
        if (error.message.includes('timeout')) {
          if (attempt === maxRetries) {
            throw new Error('AI analysis timeout: The content analysis took too long. Please try again or use simpler content.');
          }
          // Continue to retry for timeout errors
        } else if (error.message.includes('404 Not Found') || error.message.includes('models/')) {
          throw new Error('Gemini AI model not found. Please check your API configuration and model name.');
        } else if (error.message.includes('API key') || error.message.includes('authentication')) {
          throw new Error('Invalid Gemini API key. Please check your API key configuration.');
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
          throw new Error('Gemini API quota exceeded or rate limited. Please try again later.');
        } else if (error.message.includes('safety') || error.message.includes('blocked')) {
          throw new Error('Content analysis blocked due to safety restrictions. Please try with different content.');
        }
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(`Failed to analyze content with AI after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        const delay = baseDelay * attempt;
        logger.info(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Build prompt for Gemini analysis
   * @param {string} content - Website content
   * @param {string} url - Website URL
   * @returns {string} - Formatted prompt
   */
  buildAnalysisPrompt(content, url) {
    return `Analyze the following website content and extract business information. Return the response in a structured JSON format.

Website URL: ${url}

Website Content:
${content.substring(0, 8000)} // Limit content length for Gemini

Please extract and return the following information in JSON format:
{
  "businessDescription": "A clear, concise description of what the business does",
  "services": ["Service 1", "Service 2", "Service 3"],
  "valueProposition": "The main value or benefit the business provides",
  "industry": "The industry or sector the business operates in",
  "companySize": "Estimated company size (e.g., 'Small business', 'Enterprise', 'Startup')",
  "foundedYear": "Year the company was founded if mentioned",
  "location": "Business location or headquarters",
  "contactInfo": {
    "email": "Business email if found",
    "phone": "Phone number if found",
    "address": "Physical address if found"
  },
  "socialMedia": {
    "linkedin": "LinkedIn URL if found",
    "twitter": "Twitter/X URL if found",
    "facebook": "Facebook URL if found",
    "instagram": "Instagram URL if found"
  },
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "testimonials": ["Testimonial 1", "Testimonial 2"],
  "pricing": ["Pricing tier 1", "Pricing tier 2"]
}

If any information is not available, use null or empty strings. Focus on extracting factual business information that would be useful for creating marketing content.`;
  }

  /**
   * Parse Gemini response into structured data
   * @param {string} response - Gemini response text
   * @returns {Object} - Parsed business information
   */
  parseGeminiResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.sanitizeBusinessInfo(parsed);
      } else {
        // Fallback: try to extract information from text
        return this.extractInfoFromText(response);
      }
    } catch (error) {
      logger.error('Error parsing Gemini response:', error);
      // Return default structure if parsing fails
      return this.getDefaultBusinessInfo();
    }
  }

  /**
   * Sanitize and validate business information
   * @param {Object} info - Raw business information
   * @returns {Object} - Sanitized business information
   */
  sanitizeBusinessInfo(info) {
    const sanitized = {};
    
    // Ensure all required fields exist with proper types
    sanitized.businessDescription = info.businessDescription || '';
    sanitized.services = Array.isArray(info.services) ? info.services.filter(s => s && s.trim()) : [];
    sanitized.valueProposition = info.valueProposition || '';
    sanitized.industry = info.industry || '';
    sanitized.companySize = info.companySize || '';
    sanitized.foundedYear = info.foundedYear || '';
    sanitized.location = info.location || '';
    
    sanitized.contactInfo = {
      email: info.contactInfo?.email || '',
      phone: info.contactInfo?.phone || '',
      address: info.contactInfo?.address || ''
    };
    
    sanitized.socialMedia = {
      linkedin: info.socialMedia?.linkedin || '',
      twitter: info.socialMedia?.twitter || '',
      facebook: info.socialMedia?.facebook || '',
      instagram: info.socialMedia?.instagram || ''
    };
    
    sanitized.keyFeatures = Array.isArray(info.keyFeatures) ? info.keyFeatures.filter(f => f && f.trim()) : [];
    sanitized.testimonials = Array.isArray(info.testimonials) ? info.testimonials.filter(t => t && t.trim()) : [];
    sanitized.pricing = Array.isArray(info.pricing) ? info.pricing.filter(p => p && p.trim()) : [];
    
    return sanitized;
  }

  /**
   * Extract information from text response (fallback)
   * @param {string} text - Response text
   * @returns {Object} - Extracted business information
   */
  extractInfoFromText(text) {
    // Simple text extraction as fallback
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    return {
      businessDescription: lines.find(line => line.includes('business') || line.includes('company')) || '',
      services: [],
      valueProposition: '',
      industry: '',
      companySize: '',
      foundedYear: '',
      location: '',
      contactInfo: { email: '', phone: '', address: '' },
      socialMedia: { linkedin: '', twitter: '', facebook: '', instagram: '' },
      keyFeatures: [],
      testimonials: [],
      pricing: []
    };
  }

  /**
   * Get default business information structure
   * @returns {Object} - Default business information
   */
  getDefaultBusinessInfo() {
    return {
      businessDescription: '',
      services: [],
      valueProposition: '',
      industry: '',
      companySize: '',
      foundedYear: '',
      location: '',
      contactInfo: { email: '', phone: '', address: '' },
      socialMedia: { linkedin: '', twitter: '', facebook: '', instagram: '' },
      keyFeatures: [],
      testimonials: [],
      pricing: []
    };
  }
}

module.exports = WebsiteScraper;
