"use client"

import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Copy, 
  Download, 
  Eye, 
  FileText, 
  Globe, 
  Calendar,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Edit3,
  Save,
  X,
  AlertCircle
} from "lucide-react"

interface LandingPageSection {
  id: string
  type: string
  title: string
  content: string
  order: number
  metadata?: any
}

interface GeneratedLandingPage {
  title: string
  businessName: string
  businessOverview: string
  targetAudience: string
  brandTone: string
  websiteUrl?: string
  sections: LandingPageSection[]
  meta: {
    title: string
    description: string
    keywords: string
    ogTitle: string
    ogDescription: string
    ogImage: string
  }
  generatedAt: Date
  model: string
}

interface GeneratedSectionsModalProps {
  isOpen: boolean
  onClose: () => void
  landingPage: GeneratedLandingPage | null
  businessInfo: {
    businessName: string
    businessOverview: string
    targetAudience: string
    brandTone?: string
    websiteUrl?: string
  }
  onSave?: (editedSections: LandingPageSection[]) => void
  isEditable?: boolean
}

export function GeneratedSectionsModal({ 
  isOpen, 
  onClose, 
  landingPage, 
  businessInfo,
  onSave,
  isEditable = false
}: GeneratedSectionsModalProps) {
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSections, setEditedSections] = useState<LandingPageSection[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  // Initialize edited sections when landing page changes
  useEffect(() => {
    if (landingPage?.sections) {
      setEditedSections([...landingPage.sections])
    }
  }, [landingPage])

  const copyToClipboard = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSectionId(sectionId)
      setTimeout(() => setCopiedSectionId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleSectionEdit = (sectionId: string, field: 'title' | 'content', value: string) => {
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, [field]: value }
          : section
      )
    )
    
    // Clear validation error for this field
    if (validationErrors[`${sectionId}-${field}`]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`${sectionId}-${field}`]
        return newErrors
      })
    }
  }

  const validateSections = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    editedSections.forEach(section => {
      if (!section.title.trim()) {
        errors[`${section.id}-title`] = 'Title is required'
      }
      if (!section.content.trim()) {
        errors[`${section.id}-content`] = 'Content is required'
      }
    })
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateSections()) {
      return
    }
    
    setIsSaving(true)
    try {
      if (onSave) {
        await onSave(editedSections)
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (landingPage?.sections) {
      setEditedSections([...landingPage.sections])
    }
    setIsEditing(false)
    setValidationErrors({})
  }

  const getSectionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hero':
        return '🎯'
      case 'features':
        return '⭐'
      case 'about':
        return 'ℹ️'
      case 'testimonials':
        return '💬'
      case 'cta':
        return '🚀'
      case 'contact':
        return '📞'
      case 'footer':
        return '📄'
      case 'header':
        return '📋'
      default:
        return '📝'
    }
  }

  const getSectionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hero':
        return 'bg-gradient-to-r from-blue-500 to-purple-600'
      case 'features':
        return 'bg-gradient-to-r from-green-500 to-teal-600'
      case 'about':
        return 'bg-gradient-to-r from-orange-500 to-red-600'
      case 'testimonials':
        return 'bg-gradient-to-r from-purple-500 to-pink-600'
      case 'cta':
        return 'bg-gradient-to-r from-red-500 to-orange-600'
      case 'contact':
        return 'bg-gradient-to-r from-indigo-500 to-blue-600'
      case 'footer':
        return 'bg-gradient-to-r from-gray-500 to-gray-700'
      case 'header':
        return 'bg-gradient-to-r from-slate-500 to-gray-600'
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600'
    }
  }

  if (!landingPage) return null

  // Show loading state if no sections are available
  if (!landingPage.sections || landingPage.sections.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-2xl">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span>Generated Landing Page Sections</span>
            </DialogTitle>
            <DialogDescription className="text-lg">
              No sections available for <strong>{businessInfo.businessName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <FileText className="h-12 w-12 mx-auto mb-2" />
              <p>No sections were generated or found in the response.</p>
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <span>Generated Landing Page Sections</span>
          </DialogTitle>
          <DialogDescription className="text-lg">
            AI-generated content for <strong>{businessInfo.businessName}</strong> - {landingPage.sections.length} sections created
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Page Information Card */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <span>Page Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Title:</span>
                    <span className="text-gray-700">{landingPage.meta?.title || landingPage.title || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Description:</span>
                    <span className="text-gray-700 text-sm">{landingPage.meta?.description || businessInfo.businessOverview}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Generated:</span>
                    <span className="text-gray-700">{new Date(landingPage.generatedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Model:</span>
                    <Badge variant="secondary">{landingPage.model}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Generated Sections ({landingPage.sections.length})</span>
              </h3>
              <Badge variant="outline" className="text-sm">
                {landingPage.sections.length} sections ready
              </Badge>
            </div>

            <div className="grid gap-6">
              {editedSections.map((section, index) => (
                <Card 
                  key={section.id} 
                  className={`border-2 transition-all duration-200 ${
                    isEditing 
                      ? 'border-orange-300 hover:border-orange-400' 
                      : 'hover:border-blue-300'
                  } hover:shadow-lg`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${getSectionColor(section.type)}`}>
                          {getSectionIcon(section.type)}
                        </div>
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div>
                                <Label htmlFor={`title-${section.id}`} className="text-sm font-medium text-gray-700">
                                  Section Title
                                </Label>
                                <Input
                                  id={`title-${section.id}`}
                                  value={section.title}
                                  onChange={(e) => handleSectionEdit(section.id, 'title', e.target.value)}
                                  className={`mt-1 ${validationErrors[`${section.id}-title`] ? 'border-red-500' : ''}`}
                                  placeholder="Enter section title"
                                />
                                {validationErrors[`${section.id}-title`] && (
                                  <p className="text-red-500 text-xs mt-1 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {validationErrors[`${section.id}-title`]}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="text-xs">
                                  {section.type}
                                </Badge>
                                <span className="text-sm text-gray-500">Section {index + 1}</span>
                                <span className="text-sm text-gray-500">•</span>
                                <span className="text-sm text-gray-500">Order: {section.order}</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <CardTitle className="text-lg flex items-center space-x-2">
                                <span>{section.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {section.type}
                                </Badge>
                              </CardTitle>
                              <CardDescription className="flex items-center space-x-2 mt-1">
                                <span>Section {index + 1}</span>
                                <span>•</span>
                                <span>Order: {section.order}</span>
                              </CardDescription>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {isEditing ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(section.content, section.id)}
                            className="flex items-center space-x-1"
                          >
                            {copiedSectionId === section.id ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span className="text-xs">
                              {copiedSectionId === section.id ? 'Copied!' : 'Copy'}
                            </span>
                          </Button>
                        ) : (
                          <>
                            {isEditable && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="flex items-center space-x-1"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span className="text-xs">Edit</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(section.content, section.id)}
                              className="flex items-center space-x-1"
                            >
                              {copiedSectionId === section.id ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span className="text-xs">
                                {copiedSectionId === section.id ? 'Copied!' : 'Copy'}
                              </span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Section Content</span>
                      </h5>
                      {isEditing ? (
                        <div>
                          <Textarea
                            value={section.content}
                            onChange={(e) => handleSectionEdit(section.id, 'content', e.target.value)}
                            className={`min-h-[120px] ${validationErrors[`${section.id}-content`] ? 'border-red-500' : ''}`}
                            placeholder="Enter section content"
                          />
                          {validationErrors[`${section.id}-content`] && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {validationErrors[`${section.id}-content`]}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-2">
              {isEditable && !isEditing && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit All Sections</span>
                </Button>
              )}
              {isEditing && (
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                {isEditing ? 'Close Without Saving' : 'Close Preview'}
              </Button>
              
              {isEditing ? (
                <Button 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-medium px-6 py-3 rounded-lg border-0"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save All Changes'}
                </Button>
              ) : (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    // Copy all sections content
                    const allContent = editedSections.map(section => 
                      `${section.title}\n${section.content}\n`
                    ).join('\n---\n\n')
                    copyToClipboard(allContent, 'all-sections')
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All Content
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
