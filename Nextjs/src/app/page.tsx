"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Edit, Trash2, FileText, Calendar, Building2, Sparkles, Clock, Users, X, Loader2, Zap, Globe, Search, Download, Save, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToastContainer, ToastProps } from "@/components/ui/toast"
import { UploadDesignModal } from "@/components/UploadDesignModal"
import { UserEmailDisplay } from "@/components/UserEmailDisplay"
import { BusinessInfoModal } from "@/components/BusinessInfoModal"
import { AuthorizationMessage } from "@/components/AuthorizationMessage"
import { LandingPage } from "@/types"
import { useLandingPages } from "@/hooks/useLandingPages"
import apiService from "@/lib/api"
import { api } from "@/lib/utils"

export default function SolutionsPage() {
  const router = useRouter()
  const [storageUsage, setStorageUsage] = useState<{localStorage: number, sessionStorage: number, total: number} | null>(null)
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
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<any>(null)
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
  const [newSection, setNewSection] = useState<any>(null)
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
    isAuthorized,
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
        setSectionTitle(section.name || section.title || '')
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

  const handleSectionClick = (section: any) => {
    setSelectedSection(section)
    setSectionTitle(section.name || section.title || '')
    setSectionContent(section.content || '')
    setIsSectionModalOpen(true)
  }

  const handleAddSectionClick = () => {
    // Create a new empty section
    const emptySection = {
      id: `section-${Date.now()}`,
      name: '',
      title: '',
      type: 'hero',
      content: '',
      order: (selectedPage?.sections?.length || 0) + 1,
      pageNumber: 1,
      components: {
        title: '',
        subtitle: '',
        content: '',
        buttons: [],
        images: [],
        links: [],
        messages: [],
        items: []
      }
    }
    setNewSection(emptySection)
    setSectionTitle('')
    setSectionContent('')
    setIsAddSectionModalOpen(true)
  }

  const handleSaveSection = async () => {
    if (!selectedSection || !selectedPage) return
    
    try {
      // Update the section with all the new values including components
      const updatedSection = {
        ...selectedSection,
        name: sectionTitle || selectedSection.name || selectedSection.title,
        title: sectionTitle || selectedSection.name || selectedSection.title,
        // Keep the updated components from the form
        components: selectedSection.components
      }
      
      // Update the landing page with the new section data
      const updatedPage = { ...selectedPage }
      updatedPage.sections = updatedPage.sections?.map(section => 
        section.id === selectedSection.id ? updatedSection : section
      )
      
      // Update the selectedPage state
      setSelectedPage(updatedPage)
      
      // Save to backend
      const response = await fetch(api(`/landing-pages/${selectedPage.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPage),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save section')
      }
      
      // Close the modal
      setIsSectionModalOpen(false)
      
      // Show success message
      addToast({
        title: 'Success',
        description: 'Section updated successfully',
        type: 'success'
      })
      
    } catch (error) {
      console.error('Error saving section:', error)
      addToast({
        title: 'Error',
        description: 'Failed to save section changes',
        type: 'error'
      })
    }
  }

  const handleSaveNewSection = async () => {
    if (!newSection || !selectedPage) return
    
    try {
      // Update the new section with all the form values
      const updatedNewSection = {
        ...newSection,
        name: sectionTitle || 'New Section',
        title: sectionTitle || 'New Section',
        // Keep the updated components from the form
        components: newSection.components
      }
      
      // Add the new section to the landing page
      const updatedPage = { ...selectedPage }
      updatedPage.sections = [...(updatedPage.sections || []), updatedNewSection]
      
      // Update the selectedPage state
      setSelectedPage(updatedPage)
      
      // Save to backend
      const response = await fetch(api(`/landing-pages/${selectedPage.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPage),
      })
      
      if (!response.ok) {
        throw new Error('Failed to add section')
      }
      
      // Close the modal
      setIsAddSectionModalOpen(false)
      
      // Show success message
      addToast({
        title: 'Success',
        description: 'New section added successfully',
        type: 'success'
      })
      
    } catch (error) {
      console.error('Error adding section:', error)
      addToast({
        title: 'Error',
        description: 'Failed to add new section',
        type: 'error'
      })
    }
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

  // Show authorization message if user is not authorized
  if (!isAuthorized && !loading) {
    return <AuthorizationMessage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="bg-b13 border-b-2">
        <div className="container mx-auto px-6 py-6 relative">
          
          <div className="flex lg:items-center justify-between lg:flex-row flex-col">
            <div className="flex-1">
              {/* Enhanced Title Section */}
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-b11 p-2">
                      <FileText className="w-6 h-auto text-b2" />
                    </div>                  
                  {/* Floating accent dots */}
                </div>
                
                <div>
                  <h1 className="md:text-2xl text-lg font-black text-b2 leading-tight">
                    AI Content Builder 
                  </h1>
                  <div className="flex items-center space-x-2 mt-1 text-sm text-b6">
                    Weam AI-Powered Platform
                  </div>
                </div>
              </div>
              
              <div className="w-full sm:flex hidden flex-row flex-wrap items-center gap-4 sm:gap-2 lg:gap-6 mt-5">
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="w-6 h-6 bg-b6 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">I</span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Figma URL | Upload Design</span>
                </div>
                
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="w-6 h-6 bg-b6 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">II</span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">AI Content Analysis</span>
                </div>
                
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="w-6 h-6 bg-b6 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">III</span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Customize Content</span>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="w-6 h-6 bg-b6 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">IV</span>
                  </div>
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Landing Page Craft</span>
                </div>
              </div>
              
              <p className="text-sm text-b5 leading-relaxed font-medium mt-2">
              Turn websites, PDFs, and designs into structured content your team can actually use
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-4 lg:mt-0 mt-5">
              {/* Enhanced CTA Button */}
              <div className="relative">
                <Button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="relative bg-black text-white shadow-xl shadow-b10 hover:bg-b5 transition-all duration-300 transform px-6 py-4 text-base font-bold rounded-xl border-0 overflow-hidden group"
                  size="lg"
                >
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
                </Button>
                
              </div>
            </div>
          </div>
        </div>
        
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-b2 mx-auto mb-4" />
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
            {/* Stats Section with Back to App - Always show */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="flex md:items-center justify-between flex-col md:flex-row">
                {/* Left Side - Back to App */}
                <div className="flex items-center">
                  <UserEmailDisplay className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200/50" />
                </div>

                {/* Right Side - Stats */}
                <div className="flex items-center space-x-6 md:mt-0 mt-4">
                  {/* Total Pages */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-primary/20">
                      <FileText className="h-5 w-5 text-b5" />
                    </div>
                    <div>
                      <p className="md:text-2xl text-lg font-bold text-gray-900">{totalCount}</p>
                      <p className="text-xs text-gray-500">Total Pages</p>
                    </div>
                  </div>

                  <div className="w-px h-12 bg-gray-200" />

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-primary/20">
                      <Zap className="h-5 w-5 text-b5" />
                    </div>
                    <div>
                      <p className="md:text-2xl text-lg font-bold text-gray-900">
                        {landingPages.filter(p => p.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                      </p>
                      <p className="text-xs text-gray-500">Updated This Week</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {landingPages.length === 0 ? (
              <EmptyState onAddNew={() => setIsUploadModalOpen(true)} />
            ) : (
              <div className="space-y-6">

                {/* Landing Pages Grid */}
                <div>
                  <div className="flex sm:items-center justify-between mb-8 flex-col sm:flex-row">
                    <h2 className="text-2xl font-bold text-b2 mb-2 md:mb-0">Your Landing Pages</h2>
                    
                    {/* Modern Search Bar */}
                    <div className="relative max-w-sm group">
                      <div className="absolute inset-0 rounded-lg transition-all duration-300"></div>
                      <div className="relative bg-white rounded-lg transition-all duration-300 border border-b10 ">
                        <div className="flex items-center px-3 py-0">
                          <div className="flex items-center justify-center w-6 h-6">
                            <Search className="h-3.5 w-3.5 text-b7 group-hover:text-b2 transition-colors duration-300" />
                          </div>
                          <Input
                            type="text"
                            placeholder="Search pages"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-none"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-500 hover:text-gray-700 transition-all duration-200 ml-2 group-hover:scale-105 ring-1 ring-gray-200 hover:ring-gray-300"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
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
                          <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center border bg-b12">
                            <Search className="h-8 w-8 text-b2" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {searchQuery ? 'No Results Found' : 'No Landing Pages'}
                          </h3>
                          <p className="text-gray-600 mb-4">
                            {searchQuery ? (
                              <>
                                No results found for <span className="font-semibold text-b2">"{searchQuery}"</span>. 
                                Try a different search term.
                              </>
                            ) : (
                              'You haven\'t created any landing pages yet.'
                            )}
                          </p>
                          {searchQuery ? (
                            <Button
                              onClick={() => setSearchQuery('')}
                              variant="outline"
                              className="border bg-white hover:bg-b2 hover:text-white transition-all duration-200"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Clear Search
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setIsUploadModalOpen(true)}
                              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Page
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Pill-Shaped Pagination */}
                  {totalCount > 15 && ( // Updated to 15 pages per page
                    <div className="flex items-center justify-center mt-8">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md shadow-primary/5 border border-white/30">
                        <div className="flex items-center space-x-2">
                          {/* First Page Arrow (Double Chevron Left) */}
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="p-1 text-gray-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                            title="First page"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                          </button>
                          
                          {/* Page Numbers */}
                          <div className="flex items-center space-x-1.5">
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
                                    className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full transition-all duration-200 ${
                                      isCurrentPage
                                        ? 'bg-b2 text-white'
                                        : 'text-gray-600 hover:text-b2 hover:bg-b12'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                )
                              } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                return (
                                  <span key={pageNum} className="text-gray-400 text-xs">...</span>
                                )
                              }
                              return null
                            })}
                          </div>
                          
                          {/* Last Page Arrow (Double Chevron Right) */}
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="p-1 text-gray-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                            title="Last page"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7m-8-14l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
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
          // Defer the refresh to avoid setState during render
          setTimeout(async () => {
            try {
              await refreshData()
            } catch (error) {
              console.error('Failed to refresh data on modal close:', error)
            }
          }, 0)
        }}
        onSuccess={async (newPage) => {
          try {
            // Save the landing page data to localStorage for preview
            localStorage.setItem('latestLandingPage', JSON.stringify(newPage))
            console.log('Saved landing page to localStorage:', newPage)
            
            // Note: Landing page is already created by the API in PreviewStep
            // No need to call createPage() again to avoid duplicate records
            
            // Defer the refresh to avoid setState during render
            setTimeout(async () => {
              try {
                await refreshData()
              } catch (error) {
                console.error('Failed to refresh data:', error)
              }
            }, 0)
            
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
        <DialogContent className="md:max-w-5xl max-w-[calc(100%-30px)] rounded-md max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-gray-50/30">
          {selectedPage && (
            <div className="h-full overflow-hidden">
              <DialogHeader className="border-b border-b10 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-bold flex items-center mb-2">
                      <div className="w-10 h-10 bg-b12 rounded-lg flex items-center justify-center mr-3">
                        <FileText className="h-5 w-5 text-b2" />
                      </div>
                      {selectedPage.title}
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                      Complete landing page details and sections
                      {selectedPage.sections && selectedPage.sections.length > 0 && (
                        <span className="ml-2 text-b2 font-semibold">
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
                    className="border px-4 py-3 rounded-md cursor-pointer"
                    onClick={() => setIsBusinessInfoModalOpen(true)}
                  >
                     <div className="flex items-center">
                       <div className="w-12 h-12 bg-b12 rounded-lg flex items-center justify-center mr-4">
                         <Building2 className="h-6 w-6 text-b2" />
                       </div>
                       <div>
                         <h2 className="md:text-xl text-lg font-bold text-b2">Business Information & Overview</h2>
                         <p className="text-sm text-muted-foreground mt-1">Click to view and edit all business details</p>
                       </div>
                     </div>
                  </div>



                  {/* Landing Page Sections */}
                  <div className="bg-gradient-to-r px-4 py-3 rounded-md border">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="md:text-xl text-lg font-bold text-b2 flex items-center">
                        <div className="w-10 h-10 bg-b12 rounded-lg flex items-center justify-center mr-3">
                          <Sparkles className="h-5 w-5 text-b2" />
                        </div>
                        Landing Page Sections
                      </h2>
                      <Badge variant="outline" className="px-3 py-2 border md:text-sm text-xs md:text-left text-center max-md:rounded-md">
                        {selectedPage.sections?.length || 0} sections
                      </Badge>
                    </div>
                    
                    {/* Clickable Sections Overview Card */}
                    <div 
                      className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer mb-4"
                      onClick={() => setExpandedCard(expandedCard === 'landingPageSections' ? null : 'landingPageSections')}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-b12"
                      >
                        <Sparkles className="h-5 w-5 text-b2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Landing Page Sections</p>
                        <p className="text-xs underline text-foreground break-words">Click to view all sections</p>
                      </div>
                    </div>
                    
                    {/* Expanded Sections View */}
                    {expandedCard === 'landingPageSections' && selectedPage.sections && selectedPage.sections.length > 0 && (
                      <div className="mt-4 p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-green-100 max-h-[60vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-primary">All Landing Page Sections</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 px-3 py-1 text-sm font-medium">
                              {selectedPage.sections.length} sections
                            </Badge>
                            <Button 
                              size="sm" 
                              onClick={handleAddSectionClick}
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Clean Grid Layout - Only Section Titles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedPage.sections.map((section, index) => (
                            <div 
                              key={section.id} 
                              className="bg-white rounded-md border p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                              onClick={() => handleSectionClick(section)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 bg-b12 rounded-md border flex items-center justify-center text-b5 text-sm font-bold flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-semibold text-foreground truncate group-hover:text-green-700 transition-colors">
                                      {section.name || section.title || 'Untitled Section'}
                                    </h4>
                                  </div>
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
                      <Calendar className="h-3 w-3 text-gray-600" />
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
          
          
          <DialogHeader className="relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
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
              className="px-6 py-2 bg-b2 text-white hover:bg-b5 transition-all duration-200"
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
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-200 rounded-t-lg"></div>
            <DialogHeader className="relative p-6 pb-4">
              {editingField === 'deleteSection' ? null : (
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
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
                    <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                    <span>Section Title</span>
                  </label>
                  <Input
                    type="text"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-100 focus:border-gray-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
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
                    <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                    <span>Section Title</span>
                  </label>
                  <Input
                    type="text"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-100 focus:border-gray-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
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
                    <Input
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
                  className="px-6 py-2 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
              
              
              // Call the API to update the landing page
              if (selectedPage?.id) {
                await updatePage(selectedPage.id, updatedPage)
                
                // Update the selected page state with the updated data
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
      
      {/* Enhanced Section Edit Modal */}
      <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden">
          {selectedSection && (
            <div className="h-full overflow-hidden">
              <DialogHeader className="border-b pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 md:bg-b12 md:border rounded-xl flex items-center justibg-b12 text-lg font-bold md:shadow-lg">
              b2      {selectedSection.title ? selectedSection.title.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <DialogTitle className="md:text-2xl font-bold text-gray-900 max-md:text-left">
                        Edit Section
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 mt-1 max-md:text-left">
                        Modify section details and content
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="overflow-y-auto max-h-[75vh] pr-2 py-6">
                <div className="space-y-6">
                  {/* Section Basic Info */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200/50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Edit className="h-5 w-5 mr-2 text-gray-600" />
                      Section Basic Info
                    </h3>
                    <div>
                      <Label htmlFor="section-title" className="text-sm font-medium text-gray-700 mb-2 block">
                        Section Title
                      </Label>
                      <Input
                        id="section-title"
                        value={sectionTitle}
                        onChange={(e) => setSectionTitle(e.target.value)}
                        placeholder="Enter section title"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Section Components Editor */}
                  {selectedSection.components && Object.keys(selectedSection.components).length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200/50">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                        Section Components
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(selectedSection.components).map(([componentKey, componentValue]) => {
                          const componentTypes = {
                            title: { label: 'Title', icon: '📝', color: 'gray', bgColor: 'gray-50', textColor: 'gray-700' },
                            subtitle: { label: 'Subtitle', icon: '📄', color: 'purple', bgColor: 'purple-50', textColor: 'purple-700' },
                            content: { label: 'Content', icon: '📋', color: 'green', bgColor: 'green-50', textColor: 'green-700' },
                            buttons: { label: 'Buttons', icon: '🔘', color: 'orange', bgColor: 'orange-50', textColor: 'orange-700' },
                            images: { label: 'Images', icon: '🖼️', color: 'indigo', bgColor: 'indigo-50', textColor: 'indigo-700' },
                            links: { label: 'Links', icon: '🔗', color: 'cyan', bgColor: 'cyan-50', textColor: 'cyan-700' },
                            messages: { label: 'Messages', icon: '💬', color: 'pink', bgColor: 'pink-50', textColor: 'pink-700' },
                            items: { label: 'Items', icon: '📋', color: 'teal', bgColor: 'teal-50', textColor: 'teal-700' },
                            forms: { label: 'Forms', icon: '📝', color: 'amber', bgColor: 'amber-50', textColor: 'amber-700' },
                            ctas: { label: 'CTAs', icon: '🎯', color: 'red', bgColor: 'red-50', textColor: 'red-700' }
                          }
                          
                          const config = componentTypes[componentKey as keyof typeof componentTypes] || { 
                            label: componentKey, icon: '📄', color: 'gray', bgColor: 'gray-50', textColor: 'gray-700' 
                          }

                          return (
                            <div key={componentKey} className={`bg-${config.bgColor} rounded-xl p-4 border border-${config.color}-200`}>
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`w-8 h-8 bg-${config.color}-100 rounded-lg flex items-center justify-center`}>
                                  <span className="text-lg">{config.icon}</span>
                                </div>
                                <div>
                                  <h6 className={`font-semibold text-${config.textColor} text-sm`}>{config.label}</h6>
                                  <p className="text-xs text-gray-500">
                                    {Array.isArray(componentValue) ? `${componentValue.length} items` : '1 item'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {Array.isArray(componentValue) ? (
                                  <div className="space-y-2">
                                    {componentValue.map((item: any, idx: number) => {
                                      if (typeof item === 'object' && item !== null) {
                                        return (
                                          <div key={idx} className={`bg-white rounded-lg p-3 border border-${config.color}-200 space-y-2`}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                              {Object.entries(item).map(([key, value]) => (
                                                <div key={key}>
                                                  <Label className="text-xs font-medium text-gray-600 capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                  </Label>
                                                  <Input
                                                    value={String(value)}
                                                    onChange={(e) => {
                                                      const newComponents = {...selectedSection.components}
                                                      const newArray = [...(newComponents[componentKey] as any[])]
                                                      newArray[idx] = {...newArray[idx], [key]: e.target.value}
                                                      newComponents[componentKey] = newArray
                                                      setSelectedSection({...selectedSection, components: newComponents})
                                                    }}
                                                    className="text-sm"
                                                    placeholder={`Enter ${key}`}
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )
                                      } else {
                                        return (
                                          <div key={idx} className={`bg-white rounded-lg p-3 border border-${config.color}-200`}>
                                            <Input
                                              value={String(item)}
                                              onChange={(e) => {
                                                const newComponents = {...selectedSection.components}
                                                const newArray = [...(newComponents[componentKey] as any[])]
                                                newArray[idx] = e.target.value
                                                newComponents[componentKey] = newArray
                                                setSelectedSection({...selectedSection, components: newComponents})
                                              }}
                                              className="text-sm"
                                              placeholder={`Enter ${config.label.toLowerCase()}`}
                                            />
                                          </div>
                                        )
                                      }
                                    })}
                                  </div>
                                ) : (
                                  <div className={`bg-white rounded-lg p-3 border border-${config.color}-200`}>
                                    <Textarea
                                      value={String(componentValue)}
                                      onChange={(e) => {
                                        const newComponents = {...selectedSection.components}
                                        newComponents[componentKey] = e.target.value
                                        setSelectedSection({...selectedSection, components: newComponents})
                                      }}
                                      className="text-sm resize-none"
                                      rows={3}
                                      placeholder={`Enter ${config.label.toLowerCase()}`}
                                    />
                                  </div>
                                )}
                                
                                {/* Add New Item Button for Arrays */}
                                {Array.isArray(componentValue) && (
                                  <div className="flex items-center space-x-2 md:flex-row flex-col md:space-x-2 md:space-y-0 space-y-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const newComponents = {...selectedSection.components}
                                        const newArray = [...(newComponents[componentKey] as any[]), '']
                                        newComponents[componentKey] = newArray
                                        setSelectedSection({...selectedSection, components: newComponents})
                                      }}
                                      className={`text-${config.textColor} border-${config.color}-200 hover:bg-${config.color}-50`}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add {config.label.slice(0, -1)}
                                    </Button>
                                    {componentValue.length > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const newComponents = {...selectedSection.components}
                                          const newArray = (newComponents[componentKey] as any[]).slice(0, -1)
                                          newComponents[componentKey] = newArray
                                          setSelectedSection({...selectedSection, components: newComponents})
                                        }}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Remove Last
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </div>
                {/* Action Buttons */}
                <div className="border-t border-gray-200/50 pt-4 bg-gradient-to-r from-gray-50/50 to-slate-50/50">
                  <div className="flex items-center justify-end">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <Button 
                        onClick={() => setIsSectionModalOpen(false)}
                        variant="outline"
                        className="border bg-white hover:bg-b5 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Tooltip content="Delete Section">
                        <Button 
                          onClick={async () => {
                            if (!selectedSection || !selectedPage) return
                            
                            try {
                              // Remove the section from the landing page
                              const updatedPage = { ...selectedPage }
                              updatedPage.sections = updatedPage.sections?.filter(
                                section => section.id !== selectedSection.id
                              )
                              
                              // Update the selectedPage state
                              setSelectedPage(updatedPage)
                              
                              // Save to backend
                              const response = await fetch(api(`/landing-pages/${selectedPage.id}`), {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(updatedPage),
                              })
                              
                              if (!response.ok) {
                                throw new Error('Failed to delete section')
                              }
                              
                              // Close the modal
                              setIsSectionModalOpen(false)
                              
                              // Show success message
                              addToast({
                                title: 'Success',
                                description: 'Section deleted successfully',
                                type: 'success'
                              })
                              
                            } catch (error) {
                              console.error('Error deleting section:', error)
                              addToast({
                                title: 'Error',
                                description: 'Failed to delete section',
                                type: 'error'
                              })
                            }
                          }}
                          variant="outline"
                          className="border bg-white hover:bg-b5 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </Tooltip>
                      <Button 
                        onClick={handleSaveSection}
                        className="bg-b2 text-white hover:bg-b5 hover:text-white max-md:mt-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>             
              
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Section Modal */}
      <Dialog open={isAddSectionModalOpen} onOpenChange={setIsAddSectionModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden">
          {newSection && (
            <div className="h-full overflow-hidden">
              <DialogHeader className="border-b pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center md:space-x-4 space-x-2">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-b2 text-2xl font-bold md:bg-b12 md:border">
                      +
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-gray-900 max-md:text-left">
                        Add New Section
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 mt-1 max-md:text-left">
                        Create a new section for your landing page
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="overflow-y-auto max-h-[75vh] pr-2 py-6">
                <div className="space-y-6">
                  {/* Section Basic Info */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200/50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Edit className="h-5 w-5 mr-2 text-gray-600" />
                      Section Basic Info
                    </h3>
                    <div>
                      <Label htmlFor="new-section-title" className="text-sm font-medium text-gray-700 mb-2 block">
                        Section Title
                      </Label>
                      <Input
                        id="new-section-title"
                        value={sectionTitle}
                        onChange={(e) => setSectionTitle(e.target.value)}
                        placeholder="Enter section title"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Section Components Editor */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200/50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                      Section Components
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(newSection.components).map(([componentKey, componentValue]) => {
                        const componentTypes = {
                            title: { label: 'Title', icon: '📝', color: 'gray', bgColor: 'gray-50', textColor: 'gray-700' },
                          subtitle: { label: 'Subtitle', icon: '📄', color: 'purple', bgColor: 'purple-50', textColor: 'purple-700' },
                          content: { label: 'Content', icon: '📋', color: 'green', bgColor: 'green-50', textColor: 'green-700' },
                          buttons: { label: 'Buttons', icon: '🔘', color: 'orange', bgColor: 'orange-50', textColor: 'orange-700' },
                          images: { label: 'Images', icon: '🖼️', color: 'indigo', bgColor: 'indigo-50', textColor: 'indigo-700' },
                          links: { label: 'Links', icon: '🔗', color: 'cyan', bgColor: 'cyan-50', textColor: 'cyan-700' },
                          messages: { label: 'Messages', icon: '💬', color: 'pink', bgColor: 'pink-50', textColor: 'pink-700' },
                          items: { label: 'Items', icon: '📋', color: 'teal', bgColor: 'teal-50', textColor: 'teal-700' },
                          forms: { label: 'Forms', icon: '📝', color: 'amber', bgColor: 'amber-50', textColor: 'amber-700' },
                          ctas: { label: 'CTAs', icon: '🎯', color: 'red', bgColor: 'red-50', textColor: 'red-700' }
                        }
                        
                        const config = componentTypes[componentKey as keyof typeof componentTypes] || { 
                          label: componentKey, icon: '📄', color: 'gray', bgColor: 'gray-50', textColor: 'gray-700' 
                        }

                        return (
                          <div key={componentKey} className={`bg-${config.bgColor} rounded-xl p-4 border border-${config.color}-200`}>
                            <div className="flex items-center space-x-3 mb-3">
                              <div className={`w-8 h-8 bg-${config.color}-100 rounded-lg flex items-center justify-center`}>
                                <span className="text-lg">{config.icon}</span>
                              </div>
                              <div>
                                <h6 className={`font-semibold text-${config.textColor} text-sm`}>{config.label}</h6>
                                <p className="text-xs text-gray-500">
                                  {Array.isArray(componentValue) ? `${componentValue.length} items` : '1 item'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {Array.isArray(componentValue) ? (
                                <div className="space-y-2">
                                  {componentValue.map((item: any, idx: number) => {
                                    if (typeof item === 'object' && item !== null) {
                                      return (
                                        <div key={idx} className={`bg-white rounded-lg p-3 border border-${config.color}-200 space-y-2`}>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {Object.entries(item).map(([key, value]) => (
                                              <div key={key}>
                                                <Label className="text-xs font-medium text-gray-600 capitalize">
                                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </Label>
                                                <Input
                                                  value={String(value)}
                                                  onChange={(e) => {
                                                    const newComponents = {...newSection.components}
                                                    const newArray = [...(newComponents[componentKey] as any[])]
                                                    newArray[idx] = {...newArray[idx], [key]: e.target.value}
                                                    newComponents[componentKey] = newArray
                                                    setNewSection({...newSection, components: newComponents})
                                                  }}
                                                  className="text-sm"
                                                  placeholder={`Enter ${key}`}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    } else {
                                      return (
                                        <div key={idx} className={`bg-white rounded-lg p-3 border border-${config.color}-200`}>
                                          <Input
                                            value={String(item)}
                                            onChange={(e) => {
                                              const newComponents = {...newSection.components}
                                              const newArray = [...(newComponents[componentKey] as any[])]
                                              newArray[idx] = e.target.value
                                              newComponents[componentKey] = newArray
                                              setNewSection({...newSection, components: newComponents})
                                            }}
                                            className="text-sm"
                                            placeholder={`Enter ${config.label.toLowerCase()}`}
                                          />
                                        </div>
                                      )
                                    }
                                  })}
                                </div>
                              ) : (
                                <div className={`bg-white rounded-lg p-3 border border-${config.color}-200`}>
                                  <Textarea
                                    value={String(componentValue)}
                                    onChange={(e) => {
                                      const newComponents = {...newSection.components}
                                      newComponents[componentKey] = e.target.value
                                      setNewSection({...newSection, components: newComponents})
                                    }}
                                    className="text-sm resize-none"
                                    rows={3}
                                    placeholder={`Enter ${config.label.toLowerCase()}`}
                                  />
                                </div>
                              )}
                              
                              {/* Add New Item Button for Arrays */}
                              {Array.isArray(componentValue) && (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const newComponents = {...newSection.components}
                                      const newArray = [...(newComponents[componentKey] as any[]), '']
                                      newComponents[componentKey] = newArray
                                      setNewSection({...newSection, components: newComponents})
                                    }}
                                    className={`text-${config.textColor} border-${config.color}-200 hover:bg-${config.color}-50`}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add {config.label.slice(0, -1)}
                                  </Button>
                                  {componentValue.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const newComponents = {...newSection.components}
                                        const newArray = (newComponents[componentKey] as any[]).slice(0, -1)
                                        newComponents[componentKey] = newArray
                                        setNewSection({...newSection, components: newComponents})
                                      }}
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Remove Last
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="border-t border-gray-200/50 pt-4 bg-gradient-to-r from-gray-50/50 to-slate-50/50">
                  <div className="flex items-center justify-end">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <Button 
                        onClick={() => setIsAddSectionModalOpen(false)}
                        variant="outline"
                        className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveNewSection}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              
            </div>
          )}
        </DialogContent>
      </Dialog>
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
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${latestPage.title || latestPage.businessName || 'Landing Page'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #000000 0%, #333333 100%);
            min-height: 100vh;
            color: #333;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }

        .main-container {
            width: 100vw;
            min-height: 100vh;
            background: white;
            display: flex;
            flex-direction: column;
        }

        /* Header Styles */
        header {
            background: linear-gradient(135deg, #000000 0%, #333333 100%);
            color: white;
            padding: 2rem 2rem;
            position: relative;
            overflow: hidden;
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }

        .business-name {
            font-size: 2.5rem;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            letter-spacing: -0.01em;
            line-height: 1.2;
            text-align: center;
            position: relative;
            z-index: 2;
        }

        /* Business Details Section */
        .business-details-section {
            margin-bottom: 3rem;
            max-width: 1200px;
            margin-left: auto;
            margin-right: auto;
        }

        .business-details-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(102, 126, 234, 0.1);
            position: relative;
            overflow: hidden;
        }

        .business-details-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #000000, #333333);
        }

        .business-details-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #f1f5f9;
        }

        .business-icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #000000, #333333);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3);
        }

        .business-details-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: #2d3748;
            margin: 0;
        }

        .business-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        .info-item {
            background: white;
            border-radius: 10px;
            padding: 1rem;
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .info-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #000000, #333333);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }

        .info-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            border-color: #000000;
        }

        .info-item:hover::before {
            transform: scaleX(1);
        }

        .info-label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }

        .info-value {
            font-size: 1.1rem;
            font-weight: 500;
            color: #2d3748;
            line-height: 1.5;
        }

        .info-value.brand-tone {
            display: inline-block;
            background: linear-gradient(135deg, #000000, #333333);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: capitalize;
        }

        .info-item.clickable {
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            min-height: 80px;
        }

        .info-item.clickable:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 30px rgba(102, 126, 234, 0.2);
            border-color: #000000;
        }

        .info-item.clickable:hover::before {
            transform: scaleX(1);
        }

        .info-item.clickable .info-label {
            font-size: 1rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.5rem;
        }

        .click-hint {
            font-size: 0.75rem;
            color: #000000;
            font-weight: 500;
            opacity: 0;
            transition: opacity 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        .click-hint::before {
            content: '👆';
            font-size: 0.875rem;
        }

        .info-item.clickable:hover .click-hint {
            opacity: 1;
        }

        /* Main Content */
        .content-section {
            padding: 6rem 3rem;
            background: #fafbfc;
            flex: 1;
            min-height: 50vh;
        }

        .sections-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            animation: gridFadeIn 1s ease-out;
        }

        @keyframes gridFadeIn {
            0% {
                opacity: 0;
                transform: translateY(20px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Card Styles */
        .section-card {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 1px solid rgba(255,255,255,0.2);
            position: relative;
            overflow: hidden;
            animation: cardSlideIn 0.8s ease-out forwards;
            opacity: 0;
            transform: translateY(40px) scale(0.95);
            height: 180px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            cursor: pointer;
            text-align: center;
        }

        .section-card-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
        }

        .section-card-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            margin-top: 0.75rem;
        }

        .section-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #000000, #333333);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.3s ease;
        }

        .section-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1;
        }

        /* Shimmer effect for loading state */
        .section-card.loading::before {
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            height: 100%;
            transform: scaleX(1);
        }

        .section-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(102, 126, 234, 0.15);
            background: linear-gradient(135deg, #f8fafc, #ffffff);
        }

        .section-card:hover::before {
            transform: scaleX(1);
        }

        .section-card:hover::after {
            opacity: 1;
        }

        .section-card:active {
            transform: translateY(-4px) scale(0.98);
            transition: all 0.1s ease;
        }

        @keyframes cardSlideIn {
            0% {
                opacity: 0;
                transform: translateY(40px) scale(0.95) rotateX(10deg);
            }
            50% {
                opacity: 0.7;
                transform: translateY(20px) scale(0.98) rotateX(5deg);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1) rotateX(0deg);
            }
        }

        @keyframes iconPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }

        @keyframes shimmer {
            0% {
                background-position: -200% 0;
            }
            100% {
                background-position: 200% 0;
            }
        }

        /* Icon Styles */
        .section-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #000000, #333333);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 0.75rem;
            color: white;
            font-size: 1.2rem;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            position: relative;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: iconPulse 2s ease-in-out infinite;
            flex-shrink: 0;
        }

        .section-icon::after {
            content: '';
            position: absolute;
            inset: -2px;
            background: linear-gradient(135deg, #000000, #333333);
            border-radius: 22px;
            z-index: -1;
            opacity: 0.2;
            filter: blur(8px);
            transition: all 0.3s ease;
        }

        .section-card:hover .section-icon {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            animation: none;
        }

        .section-card:hover .section-icon::after {
            opacity: 0.4;
            filter: blur(12px);
        }

        /* Typography */
        .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2d3748;
            text-align: center;
            line-height: 1.2;
            transition: all 0.3s ease;
            position: relative;
            z-index: 2;
            padding: 0 0.5rem;
            word-wrap: break-word;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .section-content {
            font-size: 0.85rem;
            line-height: 1.4;
            color: #64748b;
            margin-top: 0.75rem;
            padding: 0 0.5rem;
            word-wrap: break-word;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .section-card:hover .section-title {
            color: #000000;
            transform: translateY(-2px);
        }


        /* Section Content Modal Styles */
        .section-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 2rem;
            backdrop-filter: blur(8px);
        }

        .section-modal-content {
            background: white;
            border-radius: 24px;
            padding: 3rem;
            max-width: 800px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            position: relative;
            animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .section-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid #f1f5f9;
        }

        .section-modal-title {
            font-size: 2rem;
            font-weight: 700;
            color: #2d3748;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .section-modal-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #000000, #333333);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            font-weight: 700;
        }

        .close-button {
            background: #f1f5f9;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.2rem;
            color: #64748b;
            transition: all 0.2s ease;
        }

        .close-button:hover {
            background: #e2e8f0;
            color: #475569;
        }

        .section-modal-body {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #4a5568;
            margin-bottom: 2rem;
        }

        .section-main-content {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: #f8fafc;
            border-radius: 12px;
            border-left: 4px solid #000000;
        }

        .section-main-content h4 {
            color: #2d3748;
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .section-components-modal {
            margin-top: 2rem;
        }

        .section-components-modal h4 {
            color: #2d3748;
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
        }

        .component-section {
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .component-section h5 {
            color: #4a5568;
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            text-transform: capitalize;
        }

        .component-items {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .component-item {
            padding: 0.5rem 0.75rem;
            background: #f7fafc;
            border-radius: 6px;
            font-size: 0.9rem;
            color: #2d3748;
            border-left: 3px solid #000000;
        }

        .section-modal-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 1.5rem;
            border-top: 2px solid #f1f5f9;
        }

        .copy-button {
            background: #f1f5f9;
            border: none;
            border-radius: 8px;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            color: #64748b;
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .copy-button:hover {
            background: #e2e8f0;
            color: #475569;
            transform: translateY(-1px);
        }

        .copy-button.copied {
            background: #dcfce7;
            color: #166534;
        }

        .copy-icon {
            width: 16px;
            height: 16px;
        }


        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 6rem 3rem;
            background: white;
            border-radius: 24px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.1);
            min-height: 400px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .empty-icon {
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #e2e8f0, #cbd5e0);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2.5rem;
            font-size: 3rem;
            color: #a0aec0;
        }

        .empty-title {
            font-size: 2rem;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 1.5rem;
        }

        .empty-description {
            font-size: 1.2rem;
            color: #718096;
            max-width: 500px;
            margin: 0 auto;
            line-height: 1.6;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
            .sections-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 1.5rem;
                max-width: 1000px;
            }
        }

        @media (max-width: 768px) {
            header {
                padding: 1.5rem 1.5rem;
            }
            
            .business-name {
                font-size: 2rem;
            }
            
            .content-section {
                padding: 4rem 2rem;
            }

            .business-details-section {
                margin-bottom: 2rem;
            }

            .business-details-card {
                padding: 1.25rem;
            }

            .business-details-title {
                font-size: 1.25rem;
            }

            .business-info-grid {
                grid-template-columns: 1fr;
                gap: 0.75rem;
            }

            .info-item {
                padding: 0.875rem;
            }
            
            .sections-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 1.5rem;
            }
            
            .section-card {
                padding: 1.25rem;
                height: 160px;
            }
            
            .section-icon {
                width: 45px;
                height: 45px;
                font-size: 1.1rem;
                margin-bottom: 0.5rem;
            }
            
            .section-title {
                font-size: 1rem;
            }
        }

        @media (max-width: 480px) {
            header {
                padding: 1.5rem 1rem;
            }
            
            .business-name {
                font-size: 1.8rem;
            }
            
            .content-section {
                padding: 3rem 1.5rem;
            }

            .business-details-card {
                padding: 1rem;
            }

            .business-details-header {
                flex-direction: column;
                text-align: center;
                gap: 0.5rem;
            }

            .business-details-title {
                font-size: 1.1rem;
            }

            .info-item {
                padding: 0.75rem;
            }

            .info-label {
                font-size: 0.75rem;
            }

            .info-value {
                font-size: 1rem;
            }
            
            .sections-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .section-card {
                padding: 1rem;
                height: 140px;
            }
            
            .section-icon {
                width: 40px;
                height: 40px;
                font-size: 1rem;
                margin-bottom: 0.5rem;
            }
            
            .section-title {
                font-size: 0.95rem;
            }
        }

        /* Animation delays for staggered effect */
        .section-card:nth-child(1) { animation-delay: 0.1s; }
        .section-card:nth-child(2) { animation-delay: 0.2s; }
        .section-card:nth-child(3) { animation-delay: 0.3s; }
        .section-card:nth-child(4) { animation-delay: 0.4s; }
        .section-card:nth-child(5) { animation-delay: 0.5s; }
        .section-card:nth-child(6) { animation-delay: 0.6s; }
        .section-card:nth-child(7) { animation-delay: 0.7s; }
        .section-card:nth-child(8) { animation-delay: 0.8s; }
        .section-card:nth-child(9) { animation-delay: 0.9s; }
        .section-card:nth-child(10) { animation-delay: 1.0s; }
        .section-card:nth-child(11) { animation-delay: 1.1s; }
        .section-card:nth-child(12) { animation-delay: 1.2s; }

        /* Special hover effects for different card positions */
        .section-card:nth-child(odd):hover {
            transform: translateY(-8px) scale(1.02) rotate(1deg);
        }

        .section-card:nth-child(even):hover {
            transform: translateY(-8px) scale(1.02) rotate(-1deg);
        }
    </style>
</head>
<body>
    <div class="main-container">
        <header>
            <h1 class="business-name">${latestPage.businessName || 'Business Name'}</h1>
        </header>

        <div class="content-section">
            <!-- Business Information Section -->
            <div class="business-details-section">
                <div class="business-details-card">
                    <div class="business-details-header">
                        <div class="business-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 21h18"></path>
                                <path d="M5 21V7l8-4v18"></path>
                                <path d="M19 21V11l-6-4"></path>
                            </svg>
                        </div>
                        <h2 class="business-details-title">Business Information</h2>
                    </div>
                    <div class="business-details-content">
                        <div class="business-info-grid">
                            ${latestPage.businessOverview ? `
                            <div class="info-item clickable" onclick="openBusinessModal('Business Overview', '${latestPage.businessOverview.replace(/'/g, "\\'")}')">
                                <div class="info-label">Business Overview</div>
                                <div class="click-hint">Click to view content</div>
                            </div>
                            ` : ''}
                            ${latestPage.targetAudience ? `
                            <div class="info-item clickable" onclick="openBusinessModal('Target Audience', '${latestPage.targetAudience.replace(/'/g, "\\'")}')">
                                <div class="info-label">Target Audience</div>
                                <div class="click-hint">Click to view content</div>
                            </div>
                            ` : ''}
                            ${latestPage.brandTone ? `
                            <div class="info-item">
                                <div class="info-label">Brand Tone</div>
                                <div class="info-value brand-tone">${latestPage.brandTone}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sections Grid -->
            <div class="sections-grid">
                ${latestPage.sections && latestPage.sections.length > 0 ? latestPage.sections.map((section: any, index: number) => {
                    const sectionTitle = section.title || section.name || `Section ${index + 1}`;
                    const icon = sectionTitle ? sectionTitle.charAt(0).toUpperCase() : 'S';
                    const sectionType = section.type || 'section';
                    const sectionContent = section.content ? section.content.substring(0, 60) + (section.content.length > 60 ? '...' : '') : 'Click to view content';
                    
                    return `
                    <div class="section-card" onclick="openSectionModal(${JSON.stringify(section).replace(/"/g, '&quot;')})">
                        <div class="section-card-header">
                            <div class="section-icon">${icon}</div>
                            <h2 class="section-title">${sectionTitle}</h2>
                        </div>
                        <div class="section-card-content">
                            <div class="section-content">${sectionContent}</div>
                        </div>
                    </div>
                    `;
                }).join('') : `
                    <div class="empty-state">
                        <div class="empty-icon">📄</div>
                        <h2 class="empty-title">No Sections Available</h2>
                        <p class="empty-description">This landing page doesn't have any sections yet. Add sections to showcase your services and content.</p>
                    </div>
                `}
            </div>
        </div>
    </div>

    <!-- Section Content Modal -->
    <div id="sectionModal" class="section-modal" style="display: none;">
        <div class="section-modal-content">
            <div class="section-modal-header">
                <div class="section-modal-title">
                    <div class="section-modal-icon" id="modalIcon">S</div>
                    <span id="modalTitle">Section Title</span>
                </div>
                <button class="close-button" onclick="closeSectionModal()">×</button>
            </div>
            <div class="section-modal-body" id="modalContent">
                Section content will appear here...
            </div>
            <div class="section-modal-footer">
                <span style="color: #64748b; font-size: 0.9rem;">Click outside or press Escape to close</span>
                <button class="copy-button" onclick="copySectionContent()">
                    <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <span class="copy-text">Copy Content</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Business Details Modal -->
    <div id="businessModal" class="section-modal" style="display: none;">
        <div class="section-modal-content">
            <div class="section-modal-header">
                <div class="section-modal-title">
                    <div class="section-modal-icon" id="businessModalIcon">🏢</div>
                    <span id="businessModalTitle">Business Details</span>
                </div>
                <button class="close-button" onclick="closeBusinessModal()">×</button>
            </div>
            <div class="section-modal-body" id="businessModalContent">
                Business content will appear here...
            </div>
            <div class="section-modal-footer">
                <span style="color: #64748b; font-size: 0.9rem;">Click outside or press Escape to close</span>
                <button class="copy-button" onclick="copyBusinessContent()">
                    <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                    <span class="copy-text">Copy Content</span>
                </button>
            </div>
        </div>
    </div>

    <script>
        function openSectionModal(section) {
            const modal = document.getElementById('sectionModal');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalContent = document.getElementById('modalContent');
            
            // Set modal content
            const sectionTitle = section.title || section.name || 'Section Title';
            modalIcon.textContent = sectionTitle ? sectionTitle.charAt(0).toUpperCase() : 'S';
            modalTitle.textContent = sectionTitle;
            
            // Build detailed content with components
            let contentHTML = '';
            
            // Main section content
            if (section.content) {
                contentHTML += '<div class="section-main-content">';
                contentHTML += '<h4>Section Content</h4>';
                contentHTML += '<p>' + section.content + '</p>';
                contentHTML += '</div>';
            }
            
            // Section components
            if (section.components && Object.keys(section.components).length > 0) {
                contentHTML += '<div class="section-components-modal">';
                contentHTML += '<h4>Section Components</h4>';
                
                Object.entries(section.components).forEach(([key, value]) => {
                    if (value && (Array.isArray(value) ? value.length > 0 : String(value).trim())) {
                        contentHTML += '<div class="component-section">';
                        contentHTML += '<h5>' + key.charAt(0).toUpperCase() + key.slice(1) + '</h5>';
                        contentHTML += '<div class="component-items">';
                        
                        if (Array.isArray(value)) {
                            value.forEach(item => {
                                contentHTML += '<div class="component-item">' + item + '</div>';
                            });
                        } else {
                            contentHTML += '<div class="component-item">' + value + '</div>';
                        }
                        
                        contentHTML += '</div></div>';
                    }
                });
                
                contentHTML += '</div>';
            }
            
            if (!contentHTML) {
                contentHTML = '<p>No content available for this section.</p>';
            }
            
            modalContent.innerHTML = contentHTML;
            
            // Show modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        function closeSectionModal() {
            const modal = document.getElementById('sectionModal');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        
        function copySectionContent() {
            const modalContent = document.getElementById('modalContent');
            const copyButton = document.querySelector('.copy-button');
            const copyText = document.querySelector('.copy-text');
            
            if (modalContent && copyButton && copyText) {
                const content = modalContent.textContent || modalContent.innerText;
                
                // Copy to clipboard
                navigator.clipboard.writeText(content).then(() => {
                    // Show success state
                    copyButton.classList.add('copied');
                    copyText.textContent = 'Copied!';
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        copyText.textContent = 'Copy Content';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy content: ', err);
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = content;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        copyButton.classList.add('copied');
                        copyText.textContent = 'Copied!';
                        setTimeout(() => {
                            copyButton.classList.remove('copied');
                            copyText.textContent = 'Copy Content';
                        }, 2000);
                    } catch (fallbackErr) {
                        console.error('Fallback copy failed: ', fallbackErr);
                        copyText.textContent = 'Copy Failed';
                        setTimeout(() => {
                            copyText.textContent = 'Copy Content';
                        }, 2000);
                    }
                    document.body.removeChild(textArea);
                });
            }
        }
        
        // Close modal when clicking outside
        document.getElementById('sectionModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeSectionModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeSectionModal();
                closeBusinessModal();
            }
        });

        // Business Modal Functions
        function openBusinessModal(title, content) {
            const modal = document.getElementById('businessModal');
            const modalIcon = document.getElementById('businessModalIcon');
            const modalTitle = document.getElementById('businessModalTitle');
            const modalContent = document.getElementById('businessModalContent');
            
            // Set modal content
            modalIcon.textContent = title === 'Business Overview' ? '📋' : '🎯';
            modalTitle.textContent = title;
            modalContent.textContent = content;
            
            // Show modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        function closeBusinessModal() {
            const modal = document.getElementById('businessModal');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        
        function copyBusinessContent() {
            const modalContent = document.getElementById('businessModalContent');
            const copyButton = document.querySelector('#businessModal .copy-button');
            const copyText = document.querySelector('#businessModal .copy-text');
            
            if (modalContent && copyButton && copyText) {
                const content = modalContent.textContent || modalContent.innerText;
                
                // Copy to clipboard
                navigator.clipboard.writeText(content).then(() => {
                    // Show success state
                    copyButton.classList.add('copied');
                    copyText.textContent = 'Copied!';
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        copyButton.classList.remove('copied');
                        copyText.textContent = 'Copy Content';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy content: ', err);
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = content;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        copyButton.classList.add('copied');
                        copyText.textContent = 'Copied!';
                        setTimeout(() => {
                            copyButton.classList.remove('copied');
                            copyText.textContent = 'Copy Content';
                        }, 2000);
                    } catch (fallbackErr) {
                        console.error('Fallback copy failed: ', fallbackErr);
                        copyText.textContent = 'Copy Failed';
                        setTimeout(() => {
                            copyText.textContent = 'Copy Content';
                        }, 2000);
                    }
                    document.body.removeChild(textArea);
                });
            }
        }
        
        // Close business modal when clicking outside
        document.getElementById('businessModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeBusinessModal();
            }
        });
    </script>
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
        <div className="flex items-center justify-between md:p-4 py-1 px-3">
          {/* Left side - Icon and Title */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-b11 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-b2" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-b2 transition-colors duration-200 text-wrap">
                {page.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Updated {getTimeAgo(page.updatedAt)}
              </p>
            </div>
          </div>
          
          {/* Right side - Badge and Action Icons */}
          <div className="flex items-center space-x-2 flex-shrink-0 flex-col md:flex-row md:space-y-0 space-y-2">
            <Badge 
              variant={getBrandToneColor(page.brandTone)} 
              className="px-2 py-1 text-xs font-medium rounded-full bg-b12 text-b2 border-0"
            >
              {page.brandTone || 'Not Set'}
            </Badge>
            
            {/* Action Icons */}
            <div className="flex items-center space-x-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              <Tooltip content="Download Content Page" position="top">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="w-8 h-8 p-0 hover:bg-green-50 rounded-lg transition-all duration-300 group border"
                >
                  <div className="relative">
                    <Download className="w-4 h-4 text-green-600 group-hover:text-green-700 transition-all duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"></div>
                    </div>
                  </div>
                </Button>
              </Tooltip>
              <Tooltip content="Delete Landing Page" position="top">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="w-8 h-8 p-0 hover:bg-red-50 rounded-lg transition-all duration-300 group border"
                >
                  <div className="relative">
                    <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700 transition-all duration-300" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300"></div>
                    </div>
                  </div>
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
    </Card>
  )
}



