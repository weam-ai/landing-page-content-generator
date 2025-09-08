import { useState, useEffect, useCallback } from 'react';
import { LandingPage } from '@/types';
import apiService from '@/lib/api';

interface UseLandingPagesReturn {
  landingPages: LandingPage[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  totalCount: number; // Add total count to interface
  currentPage: number;
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

  const fetchLandingPages = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user from session to filter landing pages by companyId
      let companyId: string | undefined;
      try {
        const userResponse = await apiService.getUserSession();
        if (userResponse.success) {
          companyId = userResponse.data.companyId;
        }
      } catch (error) {
        console.warn('Could not get user session, showing all pages:', error);
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
        setTotalPages(Math.ceil(response.count / 18)); // Calculate total pages based on 18 items per page
      } else {
        throw new Error(response.error || 'Failed to fetch landing pages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching landing pages:', err);
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
      // If we're updating sections, use the sections endpoint
      if (data.sections && Array.isArray(data.sections)) {
        const response = await apiService.updateLandingPageSections(id, data.sections);
        
        if (response.success) {
          await refreshData(); // Refresh the list
          return response.data;
        } else {
          throw new Error(response.error || 'Failed to update landing page sections');
        }
      } else {
        // For non-section updates, use the regular endpoint
        const response = await apiService.updateLandingPage(id, data);
        
        if (response.success) {
          await refreshData(); // Refresh the list
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
    refreshData,
    createPage,
    updatePage,
    deletePage,
    setCurrentPage,
  };
};
