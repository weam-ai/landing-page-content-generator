"use client"

import { useState, useEffect } from "react"
import { Edit3, RotateCcw, Save, Eye, CheckCircle, ArrowLeft, Sparkles, FileText, Users, MessageSquare, Zap, Globe, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LandingPage, LandingPageSection } from "@/types"

interface LandingPageEditorProps {
  landingPage: LandingPage
  onSave: (updatedPage: LandingPage) => void
  onCancel: () => void
}

export function LandingPageEditor({ landingPage, onSave, onCancel }: LandingPageEditorProps) {
  const [sections, setSections] = useState<LandingPageSection[]>(landingPage.sections)

  // Only use real data from the landing page
  useEffect(() => {
    console.log('Landing page sections from database:', landingPage.sections)
    setSections(landingPage.sections)
  }, [landingPage.sections])

  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)
  const [showOverviewModal, setShowOverviewModal] = useState(false)
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [selectedSection, setSelectedSection] = useState<LandingPageSection | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set())

  // Ensure editingContent is updated when selectedSection changes
  useEffect(() => {
    if (selectedSection && showSectionModal) {
      console.log('Modal opened, updating editing content for section:', selectedSection)
      const sectionContent = selectedSection.content && selectedSection.content.trim() !== '' 
        ? selectedSection.content 
        : `Content for ${selectedSection.title} section. This section contains information about ${selectedSection.title.toLowerCase()}.`
      
      console.log('Setting editing content to:', sectionContent)
      setEditingContent(sectionContent)
    }
  }, [selectedSection, showSectionModal])

  // Log when sections change
  useEffect(() => {
    console.log('=== SECTIONS STATE CHANGED ===')
    console.log('Sections state updated:', sections)
    console.log('Sections count:', sections.length)
    sections.forEach((section, index) => {
      console.log(`Section ${index + 1}:`, {
        id: section.id,
        title: section.title,
        content: section.content,
        contentLength: section.content?.length || 0,
        isModified: modifiedSections.has(section.id)
      })
    })
  }, [sections, modifiedSections])

  const handleEditSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (section) {
      setEditingSection(sectionId)
      setEditingContent(section.content)
    }
  }

  const handleOpenSectionModal = (section: LandingPageSection) => {
    console.log('Opening section modal for:', section)
    console.log('Section content:', section.content)
    console.log('Section content type:', typeof section.content)
    console.log('Section content length:', section.content?.length)
    
    setSelectedSection(section)
    // Ensure content is properly set, fallback to title if content is empty
    const sectionContent = section.content && section.content.trim() !== '' 
      ? section.content 
      : `Content for ${section.title} section. This section contains information about ${section.title.toLowerCase()}.`
    
    console.log('Setting editing content to:', sectionContent)
    setEditingContent(sectionContent)
    setShowSectionModal(true)
  }

  const handleSaveSection = (sectionId: string) => {
    console.log('=== SAVE SECTION DEBUG ===')
    console.log('Saving section:', sectionId)
    console.log('New content:', editingContent)
    console.log('Current sections before update:', sections)
    
    // Find the section title before updating
    const sectionTitle = sections.find(s => s.id === sectionId)?.title || 'Unknown Section'
    
    // Update the sections state with the new content
    setSections(prev => {
      const updatedSections = prev.map(s => 
        s.id === sectionId ? { ...s, content: editingContent } : s
      )
      console.log('Updated sections after save:', updatedSections)
      
      // Verify the update worked
      const updatedSection = updatedSections.find(s => s.id === sectionId)
      console.log('Updated section verification:', {
        id: updatedSection?.id,
        title: updatedSection?.title,
        content: updatedSection?.content,
        contentLength: updatedSection?.content?.length || 0
      })
      
      return updatedSections
    })
    
    // Mark this section as modified
    setModifiedSections(prev => new Set([...Array.from(prev), sectionId]))
    
    // Show success message using the section title we found earlier
    setSaveSuccess(`Content updated for ${sectionTitle}. Click "Save All Changes" to persist to database.`)
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(null)
    }, 3000)
    
    // Don't clear editingContent immediately - let the modal handle it
    // setEditingSection(null)
    // setEditingContent("")
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
    setEditingContent("")
  }

  const handleRegenerateSection = async (sectionId: string) => {
    setIsRegenerating(sectionId)
    
    // Simulate API call to regenerate content
    setTimeout(() => {
      const newContent = `Newly generated content for ${sections.find(s => s.id === sectionId)?.title}. This content has been created using advanced AI technology to better match your business requirements and brand voice. The updated content is more engaging, relevant, and optimized for conversion.`
      
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, content: newContent } : s
      ))
      setIsRegenerating(null)
    }, 2000)
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setSaveProgress(0)
    
    console.log('=== SAVE ALL DEBUG ===')
    console.log('Original landing page:', landingPage)
    console.log('Current sections state:', sections)
    console.log('Modified sections:', Array.from(modifiedSections))
    console.log('Sections count:', sections.length)
    
    // Check if sections have content
    sections.forEach((section, index) => {
      console.log(`Section ${index + 1}:`, {
        id: section.id,
        title: section.title,
        content: section.content,
        contentLength: section.content?.length || 0,
        isModified: modifiedSections.has(section.id)
      })
    })
    
    // Simulate save operation with progress
    const interval = setInterval(() => {
      setSaveProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          const updatedPage = {
            ...landingPage,
            sections,
            updatedAt: new Date()
          }
          console.log('=== FINAL SAVE DATA ===')
          console.log('Updated page object:', updatedPage)
          console.log('Sections in updated page:', updatedPage.sections)
          console.log('Calling onSave with:', updatedPage)
          
          onSave(updatedPage)
          setIsSaving(false)
          // Clear modified sections after successful save
          setModifiedSections(new Set())
          console.log('=== SAVE COMPLETE ===')
          return 100
        }
        return prev + 25
      })
    }, 300)
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "hero": return "🎯"
      case "features": return "✨"
      case "testimonials": return "💬"
      case "cta": return "🚀"
      case "about": return "ℹ️"
      case "contact": return "📞"
      default: return "📄"
    }
  }

  const getSectionColor = (type: string) => {
    switch (type) {
      case "hero": return "from-blue-500 to-purple-600"
      case "features": return "from-green-500 to-blue-600"
      case "testimonials": return "from-orange-500 to-red-600"
      case "cta": return "from-purple-500 to-pink-600"
      case "about": return "from-indigo-500 to-blue-600"
      case "contact": return "from-teal-500 to-green-600"
      default: return "from-gray-500 to-gray-600"
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-center relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel} 
            className="absolute left-0 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          {/* Save All Changes Button */}
          <Button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="absolute right-0 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">{landingPage.title}</h1>
            <p className="text-muted-foreground text-base">
              Review and customize your generated landing page
            </p>
            {/* Success Message */}
            {saveSuccess && (
              <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded-lg text-green-700 text-sm animate-in slide-in-from-top-2 duration-300">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                {saveSuccess}
              </div>
            )}
            
            {/* Unsaved Changes Warning */}
            {modifiedSections.size > 0 && (
              <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded-lg text-orange-700 text-sm animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <span>
                    ⚠️ {modifiedSections.size} section{modifiedSections.size === 1 ? '' : 's'} have unsaved changes
                  </span>
                  <Button 
                    size="sm" 
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1 h-6"
                  >
                    {isSaving ? 'Saving...' : 'Save Now'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <div className="max-w-4xl mx-auto space-y-8">


          {/* Business Overview */}
          <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center text-primary">
                <FileText className="h-6 w-6 mr-3" />
                Business Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setShowOverviewModal(true)}
              >
                <p className="text-foreground leading-relaxed line-clamp-3">
                  {landingPage.businessOverview}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Landing Page Sections */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Landing Page Sections</h2>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {sections.length} sections
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mb-4 text-center">
              Scroll to view all sections
            </div>
            
            <div className="max-h-[45vh] overflow-y-auto scrollbar-thin sections-scrollbar pr-4 border-l-2 border-gray-200 pl-6 bg-gray-50/50 rounded-r-lg">
              {sections.length > 0 ? (
                sections.map((section) => (
                  <Card 
                    key={section.id} 
                    className={`group hover:shadow-lg transition-all duration-300 bg-white border-0 shadow-sm mb-4 last:mb-0 cursor-pointer hover:bg-gray-50 ${
                      modifiedSections.has(section.id) ? 'ring-2 ring-orange-300 bg-orange-50/30' : ''
                    }`}
                    onClick={() => handleOpenSectionModal(section)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-r ${getSectionColor(section.type)} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
                          {getSectionIcon(section.type)}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
                          <CardDescription className="capitalize text-sm text-muted-foreground">
                            {section.type} section
                            {modifiedSections.has(section.id) && (
                              <span className="ml-2 text-orange-600 font-medium">• Modified</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        <p className="text-foreground leading-relaxed text-base line-clamp-3">
                          {section.content}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="bg-gradient-to-r from-gray-50 via-slate-50 to-zinc-50 p-8 rounded-2xl border border-gray-200/50 shadow-lg backdrop-blur-sm">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-r from-gray-400 to-slate-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <FileText className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">No Sections Available</h3>
                    <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                      This landing page doesn't have any sections yet. Sections will appear here when they are added to the database.
                    </p>
                    <div className="flex items-center justify-center space-x-4">
                      <Badge variant="outline" className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-700 px-4 py-2">
                        <FileText className="h-4 w-4 mr-2" />
                        Ready for sections
                      </Badge>
                      <Badge variant="outline" className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-700 px-4 py-2">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Customizable
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Save Progress Bar */}
        {isSaving && (
          <div className="mt-4 px-6">
            <div className="max-w-md mx-auto">
              <Progress value={saveProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center mt-2">
                Saving changes... {Math.round(saveProgress)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Business Overview Modal */}
      <Dialog open={showOverviewModal} onOpenChange={setShowOverviewModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center">
              <Building2 className="h-6 w-6 mr-3" />
              Business Information & Overview
            </DialogTitle>
            <DialogDescription className="text-base">
              Complete details about {landingPage.businessName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[70vh] pr-2">
            <div className="space-y-6">
              {/* Business Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-semibold text-foreground">{landingPage.businessName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Brand Tone</p>
                      <Badge variant="outline" className="capitalize bg-white">
                        {landingPage.brandTone || 'Not Set'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                                      <div>
                    <p className="text-sm text-muted-foreground">Target Audience</p>
                    <div className="bg-white p-2 rounded border border-green-100 max-h-[20vh] overflow-y-auto">
                      <p className="font-semibold text-foreground text-sm leading-relaxed">
                        {landingPage.targetAudience}
                      </p>
                    </div>
                  </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <p className="font-semibold text-foreground text-sm">
                        {landingPage.websiteUrl ? (
                          <a href={landingPage.websiteUrl} target="_blank" rel="noopener noreferrer" 
                             className="text-primary hover:underline">
                            View Website
                          </a>
                        ) : (
                          "Not provided"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Business Overview - Improved for long content */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg border border-indigo-200">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                  Business Overview
                </h3>
                <div className="bg-white p-4 rounded-lg border border-indigo-100 max-h-[40vh] overflow-y-auto">
                  <p className="text-foreground leading-relaxed text-base whitespace-pre-wrap">
                    {landingPage.businessOverview}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Edit Modal */}
      <Dialog open={showSectionModal} onOpenChange={setShowSectionModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">

          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <div className="space-y-6">
              {/* Section Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-12 h-12 bg-gradient-to-r ${selectedSection ? getSectionColor(selectedSection.type) : 'from-gray-500 to-gray-600'} rounded-xl flex items-center justify-center text-white text-xl shadow-lg`}>
                    {selectedSection ? getSectionIcon(selectedSection.type) : '📄'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{selectedSection?.title}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{selectedSection?.type} section</p>
                  </div>
                </div>
              </div>
              
              {/* Content Editor */}
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h4 className="font-semibold text-foreground mb-3">Section Content</h4>
                <Textarea
                  value={editingContent || ''}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={8}
                  className="min-h-[200px] text-base resize-none"
                  placeholder="Enter your section content here..."
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline"
                onClick={() => {
                  if (selectedSection) {
                    handleRegenerateSection(selectedSection.id)
                  }
                }}
                disabled={isRegenerating === selectedSection?.id}
                className="hover:bg-green-50 hover:border-green-200"
              >
                {isRegenerating === selectedSection?.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 text-green-600" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowSectionModal(false)
                  setSelectedSection(null)
                  setEditingContent("")
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedSection) {
                    console.log('Save button clicked for section:', selectedSection.id)
                    console.log('Content to save:', editingContent)
                    
                    // First save the section content
                    handleSaveSection(selectedSection.id)
                    
                    // Wait a bit for state to update, then close modal
                    setTimeout(() => {
                      console.log('Closing modal after save')
                      setShowSectionModal(false)
                      setSelectedSection(null)
                      setEditingContent("")
                    }, 100)
                  }
                }}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
