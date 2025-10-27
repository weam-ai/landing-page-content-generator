import { useState, useEffect, useCallback } from 'react';
import { LandingPage } from '@/types';
import apiService from '@/lib/api';
import { getSessionData } from '@/actions/session';

interface UseLandingPagesReturn {
  landingPages: LandingPage[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  totalCount: number; // Add total count to interface
  currentPage: number;
  isAuthorized: boolean; // Add authorization status
  refreshData: () => Promise<void>;
  createPage: (data: Partial<LandingPage>) => Promise<LandingPage>;
  updatePage: (id: string, data: Partial<LandingPage>) => Promise<LandingPage>;
  deletePage: (id: string) => Promise<void>;
  setCurrentPage: (page: number) => void;
}

export const useLandingPages = (): UseLandingPagesReturn => {
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0); // Add total count state
  const [currentPage, setCurrentPage] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false); // Add authorization state

  const fetchLandingPages = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user from session to filter landing pages by companyId
      let companyId: string | undefined;
      try {
        const userResponse = await getSessionData();
        if (userResponse.success && userResponse.data) {
          companyId = userResponse.data.companyId;
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.warn('Could not get user session, showing all pages:', error);
        setIsAuthorized(false);
        // Continue without companyId to show all pages
      }
      
      const response = await apiService.getLandingPages(page, 15, companyId); // Pass companyId for filtering
      
      if (response.success) {
        // Transform the data to match our frontend types
        const transformedPages = response.data.map((page: any) => ({
          id: page._id || page.id,
          title: page.title,
          businessName: page.businessName,
          businessOverview: page.businessOverview,
          targetAudience: page.targetAudience,
          brandTone: page.brandTone,
          websiteUrl: page.websiteUrl,
          createdAt: new Date(page.createdAt),
          updatedAt: new Date(page.updatedAt),
          sections: page.sections || [],
          status: page.status,
          analytics: page.analytics,
          settings: page.settings,
          tags: page.tags,
          isPublic: page.isPublic,
          designSource: page.designSource
        }));
        
        setLandingPages(transformedPages);
        setTotalCount(response.count || 0); // Set total count from backend
        setTotalPages(Math.ceil(response.count / 15)); // Calculate total pages based on 15 items per page
      } else {
        throw new Error(response.error || 'Failed to fetch landing pages');
      }
    } catch (err) {
      // Handle backend connection errors gracefully
      if (err instanceof Error && (
        err.message.includes('fetch') || 
        err.message.includes('Network') || 
        err.message.includes('Connection') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('timeout') ||
        err.message.includes('Request timeout') ||
        err.message.includes('server may be unavailable')
      )) {
        console.warn('Backend server is not running. Showing empty state.');
        setError('Backend server is not running. Please start the Node.js backend server.');
        setLandingPages([]);
        setTotalCount(0);
        setTotalPages(0);
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching landing pages:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchLandingPages(currentPage);
  }, [fetchLandingPages, currentPage]);

  const createPage = useCallback(async (data: Partial<LandingPage>): Promise<LandingPage> => {
    try {
      const response = await apiService.createLandingPage(data);
      
      if (response.success) {
        await refreshData(); // Refresh the list
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create landing page');
      }
    } catch (err) {
      throw err;
    }
  }, [refreshData]);

  const updatePage = useCallback(async (id: string, data: Partial<LandingPage>): Promise<LandingPage> => {
    try {
      // Check if this is a sections-only update (no other fields being updated)
      const hasBusinessFields = data.businessName || data.businessOverview || data.targetAudience || 
                               data.brandTone || data.websiteUrl || data.title;
      // If we're updating sections AND no business fields, use the sections endpoint
      if (data.sections && Array.isArray(data.sections) && !hasBusinessFields) {
        const response = await apiService.updateLandingPageSections(id, data.sections);
        
        if (response.success) {
          await refreshData(); // Refresh the list for sections updates
          return response.data;
        } else {
          throw new Error(response.error || 'Failed to update landing page sections');
        }
      } else {
        // For business info updates, use the regular endpoint without refreshing
        const response = await apiService.updateLandingPage(id, data);
        
        if (response.success) {
          // Update local state directly for business info updates (faster)
          setLandingPages(prevPages => 
            prevPages.map(page => 
              page.id === id ? { ...page, ...data } : page
            )
          );
          return response.data;
        } else {
          throw new Error(response.error || 'Failed to update landing page');
        }
      }
    } catch (err) {
      throw err;
    }
  }, [refreshData]);

  const deletePage = useCallback(async (id: string) => {
    try {
      const response = await apiService.deleteLandingPage(id);
      
      if (response.success) {
        await refreshData(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to delete landing page');
      }
    } catch (err) {
      throw err;
    }
  }, [refreshData]);

  // Fetch data when component mounts or currentPage changes
  useEffect(() => {
    fetchLandingPages(currentPage);
  }, [fetchLandingPages, currentPage]);

  return {
    landingPages,
    loading,
    error,
    totalPages,
    totalCount,
    currentPage,
    isAuthorized,
    refreshData,
    createPage,
    updatePage,
    deletePage,
    setCurrentPage,
  };
};
