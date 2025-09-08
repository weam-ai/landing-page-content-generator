const axios = require('axios');
const logger = require('./logger');

class FigmaAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.figma.com/v1';
    this.headers = {
      'X-Figma-Token': accessToken,
      'Content-Type': 'application/json'
    };
  }

  // Extract file key from Figma URL
  extractFileKey(url) {
    // Handle multiple Figma URL formats:
    // Standard: https://www.figma.com/file/abc123/Design-Name
    // Community: https://www.figma.com/community/file/abc123/Design-Name
    // Design: https://www.figma.com/design/abc123/Design-Name
    const match = url.match(/\/(?:community\/)?(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  // Get file information
  async getFile(fileKey) {
    try {
      const response = await axios.get(`${this.baseURL}/files/${fileKey}`, {
        headers: this.headers,
        timeout: 15000 // 15 second timeout
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching Figma file:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Figma file: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get file nodes (specific components)
  async getFileNodes(fileKey, nodeIds) {
    try {
      const nodeIdsParam = nodeIds.join(',');
      const response = await axios.get(`${this.baseURL}/files/${fileKey}/nodes?ids=${nodeIdsParam}`, {
        headers: this.headers,
        timeout: 15000 // 15 second timeout
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching Figma nodes:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Figma nodes: ${error.response?.data?.message || error.message}`);
    }
  }

  // Get image URLs for nodes
  async getImageUrls(fileKey, nodeIds, format = 'png', scale = 2) {
    try {
      const nodeIdsParam = nodeIds.join(',');
      const response = await axios.get(`${this.baseURL}/images/${fileKey}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`, {
        headers: this.headers,
        timeout: 15000 // 15 second timeout
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching Figma images:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Figma images: ${error.response?.data?.message || error.message}`);
    }
  }

  // Analyze design structure and extract sections using Figma's built-in intelligence
  analyzeDesignStructure(document) {
    const sections = [];
    let sectionId = 1;

    // Find only MAIN SECTIONS (not every small element)
    const mainSections = this.findMainSections(document);
    
    // Sort sections by position (top to bottom, left to right)
    const sortedSections = this.sortSectionsByPosition(mainSections);

    sortedSections.forEach((node, index) => {
      const section = {
        id: `section-${sectionId}`,
        title: this.extractSectionTitle(node),
        type: this.determineSectionType(node),
        content: this.extractSectionContent(node),
        order: sectionId,
        boundingBox: node.absoluteBoundingBox || { x: 0, y: 0, width: 800, height: 200 },
        figmaNodeId: node.id,
        depth: this.calculateDepth(node),
        parentSection: this.findParentId(node, document),
        // Add Figma-specific properties
        autoLayout: node.layoutMode && node.layoutMode !== 'NONE',
        isComponent: node.type === 'COMPONENT' || node.type === 'INSTANCE',
        constraints: node.constraints || null,
        effects: node.effects || [],
        fills: node.fills || []
      };
      sections.push(section);
      sectionId++;
    });

    return sections;
  }

  // Find MAIN SECTIONS only (not every small element)
  findMainSections(document) {
    const mainSections = [];
    
    const traverse = (node, depth = 0) => {
      // Look for main sections at any reasonable depth
      if (this.isMainSection(node)) {
        mainSections.push(node);
      }
      
      // Traverse deeper for CANVAS nodes and major containers
      if (node.children && depth < 3) {
        node.children.forEach(child => {
          traverse(child, depth + 1);
        });
      }
    };
    
    traverse(document);
    return mainSections;
  }

  // Check if a node is a MAIN SECTION (not a small element)
  isMainSection(node) {
    if (!node) return false;
    
    // Must be a frame or major component
    if (!['FRAME', 'COMPONENT', 'INSTANCE'].includes(node.type)) {
      return false;
    }
    
    // Must have a reasonable size (not tiny elements)
    if (node.absoluteBoundingBox) {
      const { width, height } = node.absoluteBoundingBox;
      if (width < 100 || height < 50) {
        return false;
      }
    }
    
    // Must have a meaningful name (not generic names like "Group 1")
    if (!this.hasMeaningfulSectionName(node.name)) {
      return false;
    }
    
    // Should have some children (indicating it's a container)
    if (node.children && node.children.length < 1) {
      return false;
    }
    
    return true;
  }

  // Check if we should traverse deeper for sections
  shouldTraverseForSections(node) {
    // Only go deeper for major containers
    if (node.type === 'FRAME' && this.hasMeaningfulSectionName(node.name)) {
      return true;
    }
    
    // Don't go too deep into nested elements
    return false;
  }

  // Check if a name indicates a meaningful section
  hasMeaningfulSectionName(name) {
    if (!name) return false;
    
    const sectionKeywords = [
      'section', 'header', 'hero', 'footer', 'nav', 'sidebar',
      'main', 'content', 'container', 'wrapper', 'group',
      'pricing', 'testimonial', 'feature', 'cta', 'about',
      'contact', 'gallery', 'form', 'list', 'grid',
      'banner', 'slider', 'carousel', 'accordion', 'tabs',
      'work', 'data', 'sponsors', 'apps', 'logo', 'button',
      'landing', 'page', 'desktop', 'mobile', 'tablet'
    ];
    
    const lowerName = name.toLowerCase();
    
    // Check for section keywords
    const hasSectionKeyword = sectionKeywords.some(keyword => 
      lowerName.includes(keyword)
    );
    
    // Check for descriptive patterns (not generic names like "Group 1")
    const hasDescriptivePattern = !/^(group|frame|container|element)\s*\d*$/i.test(name);
    
    // Check for meaningful length (not just "Btn" or "Icon")
    const hasMeaningfulLength = name.length > 2;
    
    // Accept if it has section keywords OR is descriptive
    return (hasSectionKeyword || hasDescriptivePattern) && hasMeaningfulLength;
  }



  // Sort sections by their position (top to bottom, left to right)
  sortSectionsByPosition(sections) {
    return sections.sort((a, b) => {
      if (a.absoluteBoundingBox && b.absoluteBoundingBox) {
        // Sort by Y position first, then X position
        if (Math.abs(a.absoluteBoundingBox.y - b.absoluteBoundingBox.y) < 50) {
          return a.absoluteBoundingBox.x - b.absoluteBoundingBox.x;
        }
        return a.absoluteBoundingBox.y - b.absoluteBoundingBox.x;
      }
      return 0;
    });
  }

  // Calculate depth of a node in the design tree
  calculateDepth(node) {
    let depth = 0;
    let current = node;
    
    while (current.parent) {
      depth++;
      current = current.parent;
    }
    
    return depth;
  }

  // Find parent ID of a node
  findParentId(node, document) {
    // This is a simplified approach - in practice, you'd need to traverse the tree
    return null;
  }

  // Determine if a node could be a section
  isPotentialSection(node) {
    if (!node) return false;
    
    // Check if it's a frame, group, or component that could represent a section
    const sectionTypes = ['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'];
    const hasReasonableSize = node.absoluteBoundingBox && 
                             node.absoluteBoundingBox.width > 200 && 
                             node.absoluteBoundingBox.height > 100;
    
    return sectionTypes.includes(node.type) && hasReasonableSize;
  }

  // Extract section title from node
  extractSectionTitle(node) {
    if (node.name) {
      // Clean up the name to make it more readable
      return node.name
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
    }
    return `Section ${node.id.slice(-4)}`;
  }

  // Determine section type based on node properties (dynamic from Figma)
  determineSectionType(node) {
    const name = node.name?.toLowerCase() || '';
    
    // Keep original dynamic types from Figma
    if (name.includes('header') || name.includes('nav')) return 'header';
    if (name.includes('hero') || name.includes('banner')) return 'hero';
    if (name.includes('feature') || name.includes('benefit')) return 'features';
    if (name.includes('testimonial') || name.includes('review')) return 'testimonials';
    if (name.includes('contact') || name.includes('form')) return 'contact';
    if (name.includes('about') || name.includes('story')) return 'about';
    if (name.includes('cta') || name.includes('button')) return 'cta';
    if (name.includes('footer')) return 'footer';
    if (name.includes('pricing') || name.includes('plan')) return 'pricing';
    if (name.includes('work') || name.includes('management')) return 'work';
    if (name.includes('customise') || name.includes('customize')) return 'customization';
    if (name.includes('data') || name.includes('security')) return 'data';
    if (name.includes('sponsors') || name.includes('partners')) return 'sponsors';
    if (name.includes('apps') || name.includes('integrations')) return 'apps';
    if (name.includes('logo') || name.includes('branding')) return 'branding';
    
    return 'content';
  }

  // Extract content from node (default placeholder text instead of actual content)
  extractSectionContent(node) {
    // Return default placeholder content based on section type
    const sectionType = this.determineSectionType(node);
    const sectionName = this.extractSectionTitle(node);
    
    switch (sectionType) {
      case 'header':
        return '[Header Navigation Content]';
      case 'hero':
        return '[Hero Section Content - Main headline and CTA]';
      case 'testimonials':
        return '[Customer Testimonials and Reviews]';
      case 'features':
        return '[Feature Highlights and Benefits]';
      case 'contact':
        return '[Contact Form and Information]';
      case 'about':
        return '[About Us Content and Story]';
      case 'cta':
        return '[Call to Action Content]';
      case 'content':
      default:
        // Generate contextual placeholder based on section name
        if (sectionName.toLowerCase().includes('work')) {
          return '[Work Management Features and Tools]';
        } else if (sectionName.toLowerCase().includes('customise') || sectionName.toLowerCase().includes('customize')) {
          return '[Customization Options and Settings]';
        } else if (sectionName.toLowerCase().includes('data')) {
          return '[Data Management and Security Features]';
        } else if (sectionName.toLowerCase().includes('sponsors')) {
          return '[Sponsor Logos and Partnerships]';
        } else if (sectionName.toLowerCase().includes('apps')) {
          return '[App Integrations and Tools]';
        } else if (sectionName.toLowerCase().includes('logo')) {
          return '[Company Logo and Branding]';
        } else if (sectionName.toLowerCase().includes('landing page')) {
          return '[Landing Page Layout and Structure]';
        } else if (sectionName.toLowerCase().includes('pricing')) {
          return '[Pricing Plans and Features]';
        } else if (sectionName.toLowerCase().includes('footer')) {
          return '[Footer Links and Company Information]';
        } else {
          return '[Section Content - Customize as needed]';
        }
    }
  }

  // Find all text nodes in a subtree
  findTextNodes(node) {
    const textNodes = [];
    
    const traverse = (currentNode) => {
      if (currentNode.type === 'TEXT' && currentNode.characters) {
        textNodes.push(currentNode);
      }
      if (currentNode.children) {
        currentNode.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return textNodes;
  }

  // Extract design tokens (colors, typography, spacing)
  extractDesignTokens(document) {
    const tokens = {
      colors: [],
      typography: [],
      spacing: [],
      shadows: []
    };

    const traverseForTokens = (node) => {
      if (!node) return;

      // Extract colors
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach(fill => {
          if (fill.type === 'SOLID' && fill.color) {
            const color = fill.color;
            const hexColor = this.rgbToHex(color.r, color.g, color.b);
            tokens.colors.push({
              name: `color-${tokens.colors.length + 1}`,
              value: hexColor
            });
          }
        });
      }

      // Extract typography
      if (node.style && node.style.fontFamily) {
        tokens.typography.push({
          name: `font-${tokens.typography.length + 1}`,
          value: node.style.fontFamily
        });
      }

      // Extract spacing (from layout properties)
      if (node.absoluteBoundingBox) {
        const spacing = Math.round(node.absoluteBoundingBox.x);
        if (spacing > 0) {
          tokens.spacing.push({
            name: `spacing-${tokens.spacing.length + 1}`,
            value: `${spacing}px`
          });
        }
      }

      // Recursively traverse children
      if (node.children) {
        node.children.forEach(child => traverseForTokens(child));
      }
    };

    traverseForTokens(document);
    return tokens;
  }

  // Convert RGB to Hex
  rgbToHex(r, g, b) {
    const toHex = (n) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Analyze layout structure
  analyzeLayout(document) {
    const layout = {
      layoutType: 'unknown',
      gridSystem: false,
      responsive: false,
      sections: 0,
      components: 0
    };

    if (!document) return layout;

    // Count sections and components
    const countNodes = (node) => {
      if (node.type === 'FRAME' || node.type === 'GROUP') {
        layout.sections++;
      } else if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        layout.components++;
      }
      
      if (node.children) {
        node.children.forEach(countNodes);
      }
    };

    countNodes(document);

    // Determine layout type
    if (layout.sections <= 2) {
      layout.layoutType = 'simple';
    } else if (layout.sections <= 5) {
      layout.layoutType = 'standard';
    } else {
      layout.layoutType = 'multi-section';
    }

    // Check for grid system (simplified detection)
    layout.gridSystem = layout.sections > 2;

    // Check for responsive design (simplified detection)
    layout.responsive = layout.components > 5;

    return layout;
  }
}

module.exports = FigmaAPI;
