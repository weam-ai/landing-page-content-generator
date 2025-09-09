import { api } from './utils';
import config from '../config/frontend-config';

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const requestUrl = `${config.apiUrl}${endpoint}`;
    
    const requestConfig: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for AI operations
      
      const response = await fetch(requestUrl, {
        ...requestConfig,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. You do not have permission to perform this action.');
        } else if (response.status === 404) {
          throw new Error('Resource not found.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. The server may be unavailable.');
        } else if (error.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection and ensure the backend server is running.');
        }
      }
      
      throw error;
    }
  }

  // Landing Pages API
  async getLandingPages(page: number = 1, limit: number = 15, companyId?: string) { // Updated to filter by companyId instead of userId
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (companyId) {
      params.append('companyId', companyId);
    }
    
    return this.request(`/landing-pages?${params.toString()}`);
  }

  async getLandingPage(id: string) {
    return this.request(`/landing-pages/${id}`);
  }

  async createLandingPage(data: any) {
    return this.request('/landing-pages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLandingPage(id: string, data: any) {
    return this.request(`/landing-pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateLandingPageSections(id: string, sections: any[]) {
    return this.request(`/landing-pages/${id}/sections`, {
      method: 'PUT',
      body: JSON.stringify({ sections }),
    });
  }

  async deleteLandingPage(id: string) {
    return this.request(`/landing-pages/${id}`, {
      method: 'DELETE',
    });
  }



  // Upload API
  async uploadDesign(formData: FormData) {
    const requestUrl = `${config.apiUrl}/upload/design`;
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. You do not have permission to perform this action.');
      } else if (response.status === 404) {
        throw new Error('Resource not found.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(`Upload failed: ${response.status}`);
      }
    }

    return response.json();
  }

  // Figma Design Extraction API
  async extractFigmaDesign(figmaUrl: string) {
    return this.request('/ai/extract-figma', {
      method: 'POST',
      body: JSON.stringify({ figmaUrl }),
    });
  }

  // PDF Content Extraction API (Enhanced with Gemini AI)
  async extractPDFContent(filePath: string) {
    // Call the Next.js API route instead of the backend directly
    const response = await fetch(api('/ai/extract-pdf'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. You do not have permission to perform this action.');
      } else if (response.status === 404) {
        throw new Error('Resource not found.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    return response.json();
  }

  // Business Information API
  async autoGenerateBusinessInfo(data: {
    websiteUrl: string;
    businessName: string;
    businessOverview: string;
    targetAudience: string;
    brandTone?: string;
    tags?: string[];
  }) {
    return this.request('/business-info/auto-generate-public', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBusinessInfo(data: {
    businessName: string;
    businessOverview: string;
    targetAudience: string;
    brandTone?: string;
    websiteUrl?: string;
    tags?: string[];
  }) {
    return this.request('/business-info', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBusinessInfo(id: string) {
    return this.request(`/business-info/${id}`);
  }

  async updateBusinessInfo(id: string, data: any) {
    return this.request(`/business-info/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBusinessInfo(id: string) {
    return this.request(`/business-info/${id}`, {
      method: 'DELETE',
    });
  }

  // User Session API
  async getUserSession() {
    // Call the Next.js API route directly with the correct basePath
    const response = await fetch(`${config.basePath}/api/user/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. You do not have permission to perform this action.');
      } else if (response.status === 404) {
        throw new Error('Resource not found.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    return response.json();
  }
}

export const apiService = new ApiService();
export default apiService;
