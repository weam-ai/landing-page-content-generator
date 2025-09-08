"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Edit, Trash2, FileText, Calendar, Building2, Sparkles, Clock, Users, X, Loader2, Zap, Globe, Search, Download, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ToastContainer, ToastProps } from "@/components/ui/toast"
import { UploadDesignModal } from "@/components/UploadDesignModal"
import { UserEmailDisplay } from "@/components/UserEmailDisplay"
import { BusinessInfoModal } from "@/components/BusinessInfoModal"
import { LandingPage } from "@/types"
import { useLandingPages } from "@/hooks/useLandingPages"
import apiService from "@/lib/api"
import { api } from "@/lib/utils"

export default function SolutionsPage() {
  const router = useRouter()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null)
  const [pageToDelete, setPageToDelete] = useState<LandingPage | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState<ToastProps[]>([])
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingSection, setEditingSection] = useState<any>(null)
  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionContent, setSectionContent] = useState('')
  const [sectionType, setSectionType] = useState('hero')
  const [isBusinessInfoModalOpen, setIsBusinessInfoModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  // Remove local pagination variables since we're using backend pagination
  const itemsPerPage = 15 // Updated to 15 pages per page

  // Use the custom hook for real data
  const {
    landingPages,
    loading,
    error,
    totalPages,
    totalCount, // Add total count from hook
    currentPage,
    refreshData,
    createPage,
    updatePage,
    deletePage,
    setCurrentPage
  } = useLandingPages()

  // Toast functions - Modified to show only one toast at a time
  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    // Clear all existing toasts and show only the new one
    setToasts([{ ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Filter landing pages based on search query
  const filteredLandingPages = landingPages.filter(page => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      page.title?.toLowerCase().includes(query) ||
      page.businessName?.toLowerCase().includes(query) ||
      page.businessOverview?.toLowerCase().includes(query) ||
      page.targetAudience?.toLowerCase().includes(query) ||
      page.brandTone?.toLowerCase().includes(query)
    )
  })
  
  // Refresh data when component mounts or when returning from editor
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Update current time every minute for real-time timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const handleView = async (page: LandingPage) => {
    console.log('Viewing page:', page)
    console.log('Page sections:', page.sections)
    
    // Fetch the latest page data to ensure we have the most up-to-date information
    try {
      const response = await apiService.getLandingPage(page.id)
      if (response.success) {
        // Transform the data to match our frontend types
        const latestPage: LandingPage = {
          id: response.data._id || response.data.id,
          title: response.data.title,
          businessName: response.data.businessName,
          businessOverview: response.data.businessOverview,
          targetAudience: response.data.targetAudience,
          brandTone: response.data.brandTone,
          websiteUrl: response.data.websiteUrl,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          sections: response.data.sections || [],
          status: response.data.status,
          analytics: response.data.analytics,
          settings: response.data.settings,
          tags: response.data.tags,
          isPublic: response.data.isPublic,
          designSource: response.data.designSource
        }
        console.log('Latest page data:', latestPage)
        console.log('Latest page sections:', latestPage.sections)
        setSelectedPage(latestPage)
      } else {
        // Fallback to the page data we have
        console.log('Using fallback page data')
        setSelectedPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch latest page data:', error)
      // Fallback to the page data we have
      setSelectedPage(page)
    }
    
    setIsViewModalOpen(true)
    setExpandedCard(null)
  }

  const handleEdit = (page: LandingPage) => {
    // Navigate to editor page with page data
    router.push(`/editor?id=${page.id}`)
  }

  const handleDelete = (page: LandingPage) => {
    setPageToDelete(page)
    setIsDeleteModalOpen(true)
  }

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field)
    
    if (field === 'editSection') {
      try {
        const section = JSON.parse(currentValue)
        setEditingSection(section)
        setSectionTitle(section.title || '')
        setSectionContent(section.content || '')
        setSectionType(section.type || 'hero')
        setEditValue('') // Clear editValue for section editing
      } catch (error) {
        console.error('Failed to parse section data:', error)
        setEditValue(currentValue)
      }
    } else if (field === 'addSection') {
      setEditingSection(null)
      setSectionTitle('')
      setSectionContent('')
      setSectionType('hero')
      setEditValue('')
    } else if (field === 'deleteSection') {
      try {
        const section = JSON.parse(currentValue)
        setEditingSection(section)
        setEditValue('')
      } catch (error) {
        console.error('Failed to parse section data:', error)
        setEditValue(currentValue)
      }
    } else {
      setEditValue(currentValue)
      setEditingSection(null)
    }
    
    setIsEditModalOpen(true)
    setExpandedCard(null) // Close the expanded card
  }

  const handleEditFieldSave = async () => {
    if (!editingField || !selectedPage) return
    
    try {
      const updatedPage = { ...selectedPage }
      
      // Handle section operations
      if (editingField === 'addSection') {
        const newSection = {
          id: `section-${Date.now()}`,
          title: sectionTitle,
          content: sectionContent,
          type: sectionType,
          order: (updatedPage.sections?.length || 0) + 1
        }
        updatedPage.sections = [...(updatedPage.sections || []), newSection]
      } else if (editingField === 'editSection' && editingSection) {
        updatedPage.sections = updatedPage.sections?.map(section => 
          section.id === editingSection.id 
            ? { ...section, title: sectionTitle, content: sectionContent, type: sectionType }
            : section
        ) || []
      } else if (editingField === 'deleteSection' && editingSection) {
        updatedPage.sections = updatedPage.sections?.filter(section => 
          section.id !== editingSection.id
        ) || []
      } else {
        // Update the specific business field
        switch (editingField) {
          case 'businessName':
            updatedPage.businessName = editValue
            break
          case 'brandTone':
            updatedPage.brandTone = editValue
            break
          case 'targetAudience':
            updatedPage.targetAudience = editValue
            break
          case 'websiteUrl':
            updatedPage.websiteUrl = editValue
            break
          case 'businessOverview':
            updatedPage.businessOverview = editValue
            break
        }
      }
      
      // Call API to update the page
      const response = await apiService.updateLandingPage(selectedPage.id, updatedPage)
      if (response.success) {
        setSelectedPage(updatedPage)
        // Also update the landing pages list
        refreshData()
      }
    } catch (error) {
      console.error('Failed to update field:', error)
    } finally {
      setIsEditModalOpen(false)
      setEditingField(null)
      setEditValue('')
      setEditingSection(null)
      setSectionTitle('')
      setSectionContent('')
      setSectionType('hero')
    }
  }

  const confirmDelete = async () => {
    if (pageToDelete) {
      try {
        await deletePage(pageToDelete.id)
        setIsDeleteModalOpen(false)
        setPageToDelete(null)
        
        // Show success toast
        addToast({
          title: "Landing Page Deleted",
          description: `"${pageToDelete.title}" has been successfully deleted.`,
          type: "success",
          duration: 3000
        })
      } catch (error) {
        console.error('Failed to delete landing page:', error)
        
        // Show error toast
        addToast({
          title: "Delete Failed",
          description: "Failed to delete the landing page. Please try again.",
          type: "error",
          duration: 3000
        })
      }
    }
  }

  const handleSaveEdit = async (updatedPage: LandingPage) => {
    try {
      await updatePage(updatedPage.id, updatedPage)
      // Navigate back to main page after successful update
      router.push('/')
    } catch (error) {
      console.error('Failed to update landing page:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const getTimeAgo = (date: Date) => {
    const now = currentTime
    const diffInMs = now.getTime() - date.getTime()
    const diffInSeconds = Math.floor(diffInMs / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`
    return formatDate(date)
  }

  const getBrandToneColor = (tone: string | undefined | null): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "professional" | "friendly" | "playful" | "authoritative" | "casual" => {
    if (!tone) return "default"
    
    switch (tone.toLowerCase()) {
      case "professional": return "professional"
      case "friendly": return "friendly"
      case "playful": return "playful"
      case "authoritative": return "authoritative"
      case "casual": return "casual"
      default: return "default"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-primary/5 border-b border-gray-200/60 sticky top-0 z-10 shadow-sm">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(147,51,234,0.08),transparent_50%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.06),transparent_50%)] opacity-60" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-gradient-to-r from-purple-500/20 to-primary/20 rounded-full blur-3xl opacity-30" />
        
        <div className="container mx-auto px-6 py-6 relative">
          {/* User Email Display - Top Right */}
          <div className="absolute top-4 right-6 z-20">
            <UserEmailDisplay className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200/50" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Enhanced Title Section */}
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary via-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-primary/25">
                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  {/* Floating accent dots */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
                
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-primary to-purple-700 bg-clip-text text-transparent leading-tight">
                    Solutions
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-2 h-2 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">AI-Powered Platform</span>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Subtitle */}
              <div className="max-w-xl">
                <p className="text-lg text-gray-600 leading-relaxed font-medium">
                  Transform your designs into stunning landing pages with 
                  <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent font-semibold"> AI-powered content generation</span>
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-500 font-medium">Instant Generation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-sm text-gray-500 font-medium">Professional Quality</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-sm text-gray-500 font-medium">Customizable</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-4">
              {/* Enhanced CTA Button */}
              <div className="relative">
                <Button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="relative bg-gradient-to-r from-primary via-purple-600 to-purple-700 hover:from-primary/90 hover:via-purple-600/90 hover:to-purple-700/90 text-white shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 px-6 py-4 text-base font-bold rounded-xl border-0 overflow-hidden group"
                  size="lg"
                >
                  {/* Button Background Pattern */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Button Content */}
                  <div className="relative flex items-center space-x-2">
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm relative">
                      <Sparkles className="h-4 w-4 text-white animate-spin" style={{ animationDuration: '2s' }} />
                      {/* Star animation particles */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full animate-ping absolute -top-1 -right-1" style={{ animationDelay: '0.5s' }}></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-ping absolute -bottom-1 -left-1" style={{ animationDelay: '1s' }}></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-ping absolute top-0 left-0" style={{ animationDelay: '1.5s' }}></div>
                      </div>
                    </div>
                    <span>Generate New Landing Page</span>
                  </div>
                  
                  {/* Button Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
                
                {/* Floating notification badge */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-primary via-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 border-2 border-white animate-pulse">
                  <span className="text-sm text-white font-bold">{landingPages.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your landing pages...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/20 rounded-full">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Error Loading Data</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button 
              onClick={refreshData}
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {landingPages.length === 0 ? (
              <EmptyState onAddNew={() => setIsUploadModalOpen(true)} />
            ) : (
              <div className="space-y-6">
                {/* Stats Section */}
                                {/* Stats Section - Tiny Beautiful Design */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    {/* Total Pages */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg flex items-center justify-center border border-primary/20">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                        <p className="text-xs text-gray-500">Total Pages</p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-12 bg-gray-200" />

                    {/* Updated This Week */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center border border-green-200">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {landingPages.filter(p => p.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                        </p>
                        <p className="text-xs text-gray-500">Updated This Week</p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-12 bg-gray-200" />

                    {/* Professional Tone */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center border border-blue-200">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {landingPages.filter(p => p.brandTone && p.brandTone.toLowerCase() === "professional").length}
                        </p>
                        <p className="text-xs text-gray-500">Professional Tone</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Landing Pages Grid */}
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-1 h-8 bg-gradient-to-b from-primary to-purple-600 rounded-full" />
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Your Landing Pages</h2>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search landing pages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder-gray-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Search Results Counter */}
                  {searchQuery && (
                    <div className="mb-6 text-sm text-gray-600">
                      {filteredLandingPages.length === 1 ? (
                        <span>1 landing page found</span>
                      ) : (
                        <span>{filteredLandingPages.length} landing pages found</span>
                      )}
                      {filteredLandingPages.length !== landingPages.length && (
                        <span className="text-gray-400 ml-2">
                          (of {landingPages.length} total)
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredLandingPages.length > 0 ? (
                      filteredLandingPages.map((page) => (
                        <LandingPageCard
                          key={page.id}
                          page={page}
                          onView={() => handleView(page)}
                          onDelete={() => handleDelete(page)}
                          formatDate={formatDate}
                          getTimeAgo={getTimeAgo}
                          getBrandToneColor={getBrandToneColor}
                        />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <div className="max-w-md mx-auto">
                          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No landing pages found</h3>
                          <p className="text-gray-500 mb-4">
                            {searchQuery ? `No results found for "${searchQuery}". Try a different search term.` : 'No landing pages available.'}
                          </p>
                          {searchQuery && (
                            <Button
                              onClick={() => setSearchQuery('')}
                              variant="outline"
                              className="mx-auto"
                            >
                              Clear Search
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Pagination */}
                  {totalCount > 15 && ( // Updated to 15 pages per page
                    <div className="flex items-center justify-center space-x-2 mt-8">
                      <button
                        onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => {
                          const pageNum = i + 1
                          const isCurrentPage = pageNum === currentPage
                          const isNearCurrent = Math.abs(pageNum - currentPage) <= 1
                          const isFirstPage = pageNum === 1
                          const isLastPage = pageNum === totalPages
                          
                          if (isFirstPage || isLastPage || isNearCurrent) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                  isCurrentPage
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                            return <span key={pageNum} className="px-2 text-gray-400">...</span>
                          }
                          return null
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Upload Design Modal */}
      <UploadDesignModal
        isOpen={isUploadModalOpen}
        onClose={async () => {
          setIsUploadModalOpen(false)
          // Refresh data when modal is closed to show any new landing pages
          try {
            await refreshData()
          } catch (error) {
            console.error('Failed to refresh data on modal close:', error)
          }
        }}
        onSuccess={async (newPage) => {
          try {
            // Save the landing page data to localStorage for preview
            localStorage.setItem('latestLandingPage', JSON.stringify(newPage))
            console.log('Saved landing page to localStorage:', newPage)
            
            // Note: Landing page is already created by the API in PreviewStep
            // No need to call createPage() again to avoid duplicate records
            
            // Refresh the data to show the new landing page in the list
            await refreshData()
            
            setIsUploadModalOpen(false)
          } catch (error) {
            console.error('Failed to refresh data:', error)
          }
        }}
      />

      {/* View Landing Page Modal */}
              <Dialog open={isViewModalOpen} onOpenChange={(open) => {
          setIsViewModalOpen(open)
          if (!open) setExpandedCard(null)
        }}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-gray-50/30">
          {selectedPage && (
            <div className="h-full overflow-hidden">
              <DialogHeader className="border-b border-gray-200/50 pb-4 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-t-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex items-center mb-2">
                      <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      {selectedPage.title}
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground font-medium">
                      Complete landing page details and sections
                      {selectedPage.sections && selectedPage.sections.length > 0 && (
                        <span className="ml-2 text-primary font-semibold">
                          • {selectedPage.sections.length} sections available
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                  
                </div>
              </DialogHeader>
              
              <div className="overflow-y-auto max-h-[75vh] pr-2 py-6">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {/* Business Information & Overview */}
                  <div 
                    className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-6 rounded-xl border border-indigo-200/50 shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    onClick={() => setIsBusinessInfoModalOpen(true)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-blue-700 rounded-lg flex items-center justify-center mr-4 shadow-lg">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-primary">Business Information & Overview</h2>
                          <p className="text-sm text-muted-foreground mt-1">Click to view and edit all business details</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </div>
                    </div>
                  </div>



                  {/* Landing Page Sections */}
                  <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 p-6 rounded-xl border border-green-200/50 shadow-md backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-primary flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        Landing Page Sections
                      </h2>
                      <Badge variant="outline" className="text-base px-4 py-2 bg-white/90 backdrop-blur-sm border-green-200 text-green-700 font-bold">
                        {selectedPage.sections?.length || 0} sections
                      </Badge>
                    </div>
                    
                    {/* Clickable Sections Overview Card */}
                    <div 
                      className="flex items-center space-x-3 p-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer mb-4"
                      onClick={() => setExpandedCard(expandedCard === 'landingPageSections' ? null : 'landingPageSections')}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0"
                        style={{ backgroundColor: '#059669' }}
                      >
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Landing Page Sections</p>
                        <p className="text-base font-bold text-foreground break-words">Click to view all sections</p>
                      </div>
                    </div>
                    
                    {/* Expanded Sections View */}
                    {expandedCard === 'landingPageSections' && selectedPage.sections && selectedPage.sections.length > 0 && (
                      <div className="mt-4 p-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-green-100 max-h-[60vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold text-primary">All Landing Page Sections</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 px-2 py-1 text-xs">
                              {selectedPage.sections.length} sections
                            </Badge>
                            <Tooltip content="Add New Section">
                              <Button 
                                size="sm" 
                                onClick={() => handleEditField('addSection', '')}
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-transparent p-1"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                        <div className={`${selectedPage.sections.length > 6 ? 'grid grid-cols-2 gap-3' : 'space-y-2'}`}>
                          {selectedPage.sections.map((section, index) => (
                            <div key={section.id} className={`bg-white/80 backdrop-blur-sm rounded-lg border border-green-100 p-3 hover:shadow-md transition-all duration-200 ${selectedPage.sections.length > 6 ? 'min-h-[120px]' : ''}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-foreground mb-1 truncate">{section.title}</h4>
                                    <div className="flex items-center space-x-2 mb-2">
                                      <Badge variant="outline" className="capitalize bg-green-50 border-green-200 text-green-700 px-2 py-0.5 text-xs">
                                        {section.type}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">Order: {section.order}</span>
                                    </div>
                                    <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                                      {section.content}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1 ml-2">
                                  <Tooltip content="Edit Section">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleEditField('editSection', JSON.stringify(section))}
                                      variant="ghost"
                                      className="text-green-600 hover:text-green-700 hover:bg-transparent p-1"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip content="Delete Section">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleEditField('deleteSection', JSON.stringify(section))}
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-transparent p-1"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* No Sections Message */}
                    {(!selectedPage.sections || selectedPage.sections.length === 0) && (
                      <div className="text-center py-8 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-green-100">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">No Sections Added Yet</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-3">
                          This landing page doesn't have any sections yet. Add sections to organize your content and create a compelling user experience.
                        </p>
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 px-3 py-1 text-xs">
                          Ready to add sections
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Page Dates - Inline */}
                  <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground py-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span>Created: {formatDate(selectedPage.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-green-600" />
                      <span>Updated: {formatDate(selectedPage.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-pink-50 rounded-lg opacity-50"></div>
          
          <DialogHeader className="relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🗑️</span>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Delete Landing Page</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
              </div>
            </div>
            <DialogDescription className="text-gray-700 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{pageToDelete?.title}"</span>? 
              <br />
              <span className="text-red-600 font-medium">All content and data will be permanently removed.</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-end space-x-3 pt-6 relative">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <span className="flex items-center space-x-2">
                <span>🗑️</span>
                <span>Delete</span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Field Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className={`${editingField === 'deleteSection' ? 'max-w-sm' : 'max-w-2xl'} max-h-[90vh] overflow-hidden`}>
          {/* Enhanced Header with Gradient Background */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-t-lg"></div>
            <DialogHeader className="relative p-6 pb-4">
              {editingField === 'deleteSection' ? null : (
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                    {editingField === 'addSection' ? '➕' : 
                     editingField === 'editSection' ? '✏️' : '📝'}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {editingField === 'addSection' ? 'Add New Section' : 
                       editingField === 'editSection' ? 'Edit Section' :
                       `Edit ${editingField?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 mt-1">
                      {editingField === 'addSection' ? 'Create a new section for your landing page.' :
                       editingField === 'editSection' ? 'Update the section details and content.' :
                       `Update the ${editingField?.toLowerCase().replace(/([A-Z])/g, ' $1')} for this landing page.`}
                    </DialogDescription>
                  </div>
                </div>
              )}
            </DialogHeader>
          </div>
          
          <div className="px-6 pb-6 overflow-y-auto max-h-[60vh]">
            {editingField === 'addSection' ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Section Title</span>
                  </label>
                  <input
                    type="text"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    placeholder="Enter section title..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Section Content</span>
                  </label>
                  <textarea
                    value={sectionContent}
                    onChange={(e) => setSectionContent(e.target.value)}
                    className="w-full min-h-[120px] p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md resize-none"
                    placeholder="Enter section content..."
                  />
                </div>
              </div>
            ) : editingField === 'editSection' ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Section Title</span>
                  </label>
                  <input
                    type="text"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    placeholder="Enter section title..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Section Content</span>
                  </label>
                  <textarea
                    value={sectionContent}
                    onChange={(e) => setSectionContent(e.target.value)}
                    className="w-full min-h-[120px] p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md resize-none"
                    placeholder="Enter section content..."
                  />
                </div>
              </div>
            ) : editingField === 'deleteSection' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Delete Section</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  This action cannot be undone. The section will be permanently deleted.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>{editingField?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  </label>
                  {editingField === 'targetAudience' || editingField === 'businessOverview' ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full min-h-[120px] p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md resize-none"
                      placeholder={`Enter ${editingField?.toLowerCase().replace(/([A-Z])/g, ' $1')}...`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                      placeholder={`Enter ${editingField?.toLowerCase().replace(/([A-Z])/g, ' $1')}...`}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced Footer with Better Button Styling */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Cancel
              </Button>
              {editingField === 'deleteSection' ? (
                <Button 
                  onClick={handleEditFieldSave} 
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Section
                </Button>
              ) : (
                <Button 
                  onClick={handleEditFieldSave} 
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {editingField === 'addSection' ? (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Section
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Business Information Modal */}
      {selectedPage && (
        <BusinessInfoModal
          isOpen={isBusinessInfoModalOpen}
          onClose={() => setIsBusinessInfoModalOpen(false)}
          businessInfo={{
            businessName: selectedPage?.businessName || '',
            businessOverview: selectedPage?.businessOverview || '',
            targetAudience: selectedPage?.targetAudience || '',
            brandTone: selectedPage?.brandTone,
            websiteUrl: selectedPage?.websiteUrl
          }}
          onSave={async (updatedInfo) => {
            try {
              // Update the landing page with new business information
              const updatedPage = {
                ...selectedPage,
                ...updatedInfo
              }
              
              console.log('Saving business info:', {
                landingPageId: selectedPage?.id,
                updatedInfo,
                fullUpdatedPage: updatedPage
              })
              
              // Call the API to update the landing page
              if (selectedPage?.id) {
                await updatePage(selectedPage.id, updatedPage)
                
                // Refresh the data from the database to ensure we have the latest
                await refreshData()
                
                // Update the selected page state with the refreshed data
                setSelectedPage(updatedPage)
              }
              
              // Show success toast
              addToast({
                title: "Success",
                description: "Business information updated successfully!",
                type: "success"
              })
            } catch (error) {
              console.error('Error updating business info:', error)
              addToast({
                title: "Error",
                description: "Failed to update business information. Please try again.",
                type: "error"
              })
              throw error // Re-throw to let the modal handle the error state
            }
          }}
          landingPageId={selectedPage?.id}
        />
      )}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

function EmptyState({ onAddNew }: { onAddNew: () => void }) {
  return (
    <div className="text-center py-10">
      <div className="max-w-sm mx-auto">
        <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Landing Pages Yet</h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Start by uploading a design or creating your first landing page from scratch
        </p>
        <Button 
          onClick={onAddNew} 
          size="default" 
          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-6 py-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Page
        </Button>
      </div>
    </div>
  )
}

function LandingPageCard({ 
  page, 
  onView,
  onDelete,
  formatDate,
  getTimeAgo,
  getBrandToneColor
}: { 
  page: LandingPage
  onView: () => void
  onDelete: () => void
  formatDate: (date: Date) => string
  getTimeAgo: (date: Date) => string
  getBrandToneColor: (tone: string | undefined | null) => "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "professional" | "friendly" | "playful" | "authoritative" | "casual"
}) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Fetch the latest page data from the database to ensure we have the most up-to-date content
      console.log('🔍 Fetching latest page data for download...')
      console.log('🔗 API URL:', api(`/landing-pages/${page.id}`))
      const response = await fetch(api(`/landing-pages/${page.id}`))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error(`Failed to fetch latest page data: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      const latestPage = result.data
      
      console.log('🔍 Latest page data from database:', latestPage)
      console.log('🔍 Latest page sections:', latestPage.sections)
      console.log('🔍 Sections count:', latestPage.sections?.length || 0)
      console.log('🔍 Full API response:', result)
      
      if (latestPage.sections && latestPage.sections.length > 0) {
        console.log('🔍 All sections from database:', JSON.stringify(latestPage.sections, null, 2))
        latestPage.sections.forEach((section: any, index: number) => {
          console.log(`🔍 Section ${index + 1}:`, {
            id: section.id,
            title: section.title,
            content: section.content,
            contentLength: section.content?.length || 0,
            type: section.type,
            order: section.order,
            hasRealContent: section.content && section.content.trim() !== '' && !section.content.includes('This section contains important information about'),
            fullSection: section
          })
        })
      } else {
        console.log('⚠️ No sections found in database for this page')
      }
      
      // Create HTML content from the latest landing page data
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${latestPage.title || latestPage.businessName || 'Landing Page'}</title>
    <meta name="description" content="${latestPage.businessOverview || latestPage.description || ''}">
    <meta name="keywords" content="${latestPage.keywords || ''}">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --primary-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
            --secondary-gradient: linear-gradient(135deg, #6637ec 0%, #5050f6 100%);
            --accent-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            --dark-gradient: linear-gradient(135deg, #6637ec 0%, #5050f6 100%);
            --glass-bg: rgba(255, 255, 255, 0.9);
            --glass-border: rgba(102, 55, 236, 0.1);
            --text-primary: #262626;
            --text-secondary: #404040;
            --text-light: #737373;
            --shadow-soft: 0 20px 40px rgba(102, 55, 236, 0.08);
            --shadow-medium: 0 25px 50px rgba(102, 55, 236, 0.12);
            --shadow-strong: 0 30px 60px rgba(102, 55, 236, 0.15);
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--text-primary);
            background: var(--primary-gradient);
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 24px;
        }
        
        /* Animated Background */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%);
            animation: backgroundShift 20s ease-in-out infinite;
            z-index: -1;
        }
        
        @keyframes backgroundShift {
            0%, 100% { transform: translateX(0) translateY(0); }
            25% { transform: translateX(-20px) translateY(-10px); }
            50% { transform: translateX(20px) translateY(10px); }
            75% { transform: translateX(-10px) translateY(20px); }
        }
        
        /* Hero Section */
        .hero {
            min-height: 40vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: var(--primary-gradient);
            overflow: hidden;
            padding: 60px 0 40px;
        }
        
        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
            animation: gridMove 30s linear infinite;
        }
        
        @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(10px, 10px); }
        }
        
        .hero-content {
            text-align: center;
            position: relative;
            z-index: 2;
            max-width: 600px;
            padding: 0 20px;
        }
        
        .hero h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: clamp(2rem, 4.5vw, 3rem);
            font-weight: 700;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            animation: titleGlow 3s ease-in-out infinite alternate;
        }
        
        @keyframes titleGlow {
            0% { filter: brightness(1); }
            100% { filter: brightness(1.1); }
        }
        
        .hero p {
            font-size: clamp(0.95rem, 1.8vw, 1.1rem);
            color: #334155;
            max-width: 500px;
            margin: 0 auto 20px;
            font-weight: 400;
            line-height: 1.5;
        }
        
        /* Floating Elements */
        .floating-elements {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        }
        
        .floating-element {
            position: absolute;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            animation: float 6s ease-in-out infinite;
        }
        
        .floating-element:nth-child(1) {
            width: 80px;
            height: 80px;
            top: 20%;
            left: 10%;
            animation-delay: 0s;
        }
        
        .floating-element:nth-child(2) {
            width: 120px;
            height: 120px;
            top: 60%;
            right: 15%;
            animation-delay: 2s;
        }
        
        .floating-element:nth-child(3) {
            width: 60px;
            height: 60px;
            bottom: 30%;
            left: 20%;
            animation-delay: 4s;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        /* Sections Container */
        .sections-container {
            background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
            backdrop-filter: blur(20px);
            padding: 120px 0;
            position: relative;
        }
        
        .sections-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.3), transparent);
        }
        
        /* Glassmorphism Sections */
        .section {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            margin: 0 auto 60px;
            padding: 60px 50px;
            border-radius: 32px;
            box-shadow: var(--shadow-soft);
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: var(--primary-gradient);
            border-radius: 32px 32px 0 0;
        }
        
        .section::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.05) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.4s ease;
            pointer-events: none;
        }
        
        .section:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: var(--shadow-strong);
            border-color: rgba(102, 126, 234, 0.2);
        }
        
        .section:hover::after {
            opacity: 1;
        }
        
        .section h2 {
            font-family: 'Space Grotesk', sans-serif;
            background: linear-gradient(135deg, #6637ec 0%, #8d3ce2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: clamp(1.8rem, 4vw, 2.5rem);
            font-weight: 700;
            margin-bottom: 32px;
            position: relative;
            padding-bottom: 20px;
        }
        
        .section h2::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 80px;
            height: 6px;
            background: linear-gradient(135deg, #6637ec 0%, #8d3ce2 100%);
            border-radius: 3px;
        }
        
        .section p, .section div {
            color: var(--text-secondary);
            font-size: 1.15rem;
            line-height: 1.8;
            margin-bottom: 20px;
            font-weight: 400;
        }
        
        .section p:last-child, .section div:last-child {
            margin-bottom: 0;
        }
        
        /* Contact Section Special Styling */
        .contact-info {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 24px;
            border: 1px solid rgba(102, 55, 236, 0.1);
            margin-top: 32px;
            box-shadow: var(--shadow-soft);
        }
        
        .contact-info h3 {
            font-family: 'Space Grotesk', sans-serif;
            color: var(--text-primary);
            font-size: 1.6rem;
            font-weight: 600;
            margin-bottom: 24px;
        }
        
        .contact-info p {
            margin-bottom: 16px;
            font-size: 1.05rem;
        }
        
        .contact-info a {
            color: #6637ec;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .contact-info a::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 0;
            height: 2px;
            background: linear-gradient(135deg, #6637ec 0%, #8d3ce2 100%);
            transition: width 0.3s ease;
        }
        
        .contact-info a:hover::after {
            width: 100%;
        }
        
        /* Premium Footer */
        .footer {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            color: #64748b;
            text-align: center;
            padding: 60px 20px;
            position: relative;
            overflow: hidden;
            border-top: 1px solid rgba(102, 55, 236, 0.1);
        }
        
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent);
        }
        
        .footer p {
            font-size: 1rem;
            opacity: 0.8;
            font-weight: 400;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                padding: 0 20px;
            }
            
            .section {
                padding: 50px 40px;
                margin-bottom: 50px;
            }
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 0 16px;
            }
            
            .hero {
                min-height: 35vh;
                padding: 40px 0 30px;
            }
            
            .section {
                padding: 40px 30px;
                margin-bottom: 40px;
                border-radius: 24px;
            }
            
            .sections-container {
                padding: 80px 0;
            }
            
            .contact-info {
                padding: 30px 24px;
            }
        }
        
        @media (max-width: 480px) {
            .section {
                padding: 32px 24px;
                border-radius: 20px;
            }
            
            .contact-info {
                padding: 24px 20px;
            }
        }
        
        /* Smooth scrolling */
        html {
            scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 12px;
        }
        
        ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 6px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: var(--primary-gradient);
            border-radius: 6px;
            border: 2px solid transparent;
            background-clip: content-box;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #5a67d8, #6b46c1, #e879f9);
            background-clip: content-box;
        }
        
        /* Loading Animation */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .section {
            animation: fadeInUp 0.6s ease-out;
        }
        
        .section:nth-child(1) { animation-delay: 0.1s; }
        .section:nth-child(2) { animation-delay: 0.2s; }
        .section:nth-child(3) { animation-delay: 0.3s; }
        .section:nth-child(4) { animation-delay: 0.4s; }
        .section:nth-child(5) { animation-delay: 0.5s; }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <div class="floating-elements">
                <div class="floating-element"></div>
                <div class="floating-element"></div>
                <div class="floating-element"></div>
            </div>
            <div class="hero-content">
                <h1>${latestPage.businessName || 'Your Business'}</h1>
                <p>${latestPage.businessOverview || 'Professional services for your needs'}</p>
            </div>
        </div>
        
        <div class="sections-container">
            <div class="container">
                ${latestPage.sections && latestPage.sections.length > 0 ? latestPage.sections.map((section: any) => {
          // Debug each section content
          console.log(`🔍 Rendering section "${section.title}":`, {
            content: section.content,
            contentType: typeof section.content,
            contentLength: section.content?.length || 0,
            isEmpty: !section.content || section.content.trim() === ''
          })
          
          // Handle different content formats - prioritize real content
          let sectionContent = section.content || section.description || section.text || ''
          
          // Clean up the content
          if (sectionContent) {
            sectionContent = sectionContent.trim()
          }
          
          // Only use fallback if absolutely no content exists or content is just placeholder text
          const isPlaceholder = sectionContent && (
            sectionContent.includes('[Welcome Content - Customize as needed]') ||
            sectionContent.includes('This section contains important information about') ||
            sectionContent === 'undefined' ||
            sectionContent === 'null'
          )
          
          if (!sectionContent || sectionContent === '' || isPlaceholder) {
            console.log(`⚠️ Section "${section.title}" has no real content (${sectionContent}), using fallback`)
            switch (section.type?.toLowerCase()) {
              case 'hero':
                sectionContent = `Welcome to ${latestPage.businessName || 'our business'}. We provide exceptional services to help you achieve your goals.`
                break
              case 'features':
                sectionContent = `Discover our key features and benefits that set us apart from the competition.`
                break
              case 'about':
                sectionContent = `Learn more about our company, our mission, and the values that drive us forward.`
                break
              case 'testimonials':
                sectionContent = `Hear what our satisfied customers have to say about their experience with us.`
                break
              case 'contact':
                sectionContent = `Get in touch with us today. We're here to help and answer any questions you may have.`
                break
              default:
                sectionContent = `This section contains important information about ${section.title?.toLowerCase() || 'our services'}.`
            }
          } else {
            console.log(`✅ Section "${section.title}" has real content (${sectionContent.length} chars):`, sectionContent.substring(0, 100) + '...')
          }
          
          return `
            <div class="section">
                <h2>${section.title || 'Section'}</h2>
                <div>${sectionContent}</div>
            </div>
          `
        }).join('') : ''}
        
        
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${latestPage.businessName || 'Your Business'}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

      // Debug: Log the final HTML content
      console.log('🔍 Final HTML content length:', htmlContent.length)
      console.log('🔍 HTML preview (first 500 chars):', htmlContent.substring(0, 500))
      
      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const downloadUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${(latestPage.businessName || latestPage.title || 'landing-page').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-landing-page.html`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Download failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Download failed: ${errorMessage}`)
    }
  }
  return (
    <Card className="group relative overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 rounded-xl cursor-pointer" onClick={onView}>
      {/* Left accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Icon and Title */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors duration-200">
                {page.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Updated {getTimeAgo(page.updatedAt)}
              </p>
            </div>
          </div>
          
          {/* Right side - Badge and Action Icons */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Badge 
              variant={getBrandToneColor(page.brandTone)} 
              className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border-0"
            >
              {page.brandTone || 'Not Set'}
            </Badge>
            
            {/* Action Icons */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="w-8 h-8 p-0 hover:bg-green-50 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md hover:shadow-green-200/50 group border border-transparent hover:border-green-200"
                title="Download Landing Page"
              >
                <div className="relative">
                  <Download className="w-4 h-4 text-green-600 group-hover:text-green-700 transition-all duration-300 group-hover:animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"></div>
                  </div>
                </div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="w-8 h-8 p-0 hover:bg-red-50 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-md hover:shadow-red-200/50 group border border-transparent hover:border-red-200"
                title="Delete Landing Page"
              >
                <div className="relative">
                  <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700 transition-all duration-300 group-hover:animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"></div>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}


