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
  name?: string
  metadata?: any
  components?: any
}

interface GeneratedLandingPage {
  id?: string
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
  isEditable = true
}: GeneratedSectionsModalProps) {
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(true) // Start in editing mode by default
  const [editedSections, setEditedSections] = useState<LandingPageSection[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Helper function to get available content types from components
  const getAvailableContentTypes = (components: any) => {
    if (!components || typeof components !== 'object') return []
    
    console.log('getAvailableContentTypes - components:', components)
    const contentTypes = []
    
    if (components.title) contentTypes.push({ type: 'Title', icon: '📝', color: 'blue' })
    if (components.subtitle) contentTypes.push({ type: 'Subtitle', icon: '📄', color: 'purple' })
    if (components.buttons && Array.isArray(components.buttons) && components.buttons.length > 0) {
      contentTypes.push({ type: 'Buttons', icon: '🔘', color: 'orange' })
    }
    if (components.images && Array.isArray(components.images) && components.images.length > 0) {
      contentTypes.push({ type: 'Images', icon: '🖼️', color: 'indigo' })
    }
    if (components.links && Array.isArray(components.links) && components.links.length > 0) {
      contentTypes.push({ type: 'Links', icon: '🔗', color: 'cyan' })
    }
    if (components.messages && Array.isArray(components.messages) && components.messages.length > 0) {
      contentTypes.push({ type: 'Messages', icon: '💬', color: 'pink' })
    }
    if (components.items && Array.isArray(components.items) && components.items.length > 0) {
      contentTypes.push({ type: 'Items', icon: '📋', color: 'teal' })
    }
    if (components.forms && Array.isArray(components.forms) && components.forms.length > 0) {
      contentTypes.push({ type: 'Forms', icon: '📝', color: 'amber' })
    }
    if (components.ctas && Array.isArray(components.ctas) && components.ctas.length > 0) {
      contentTypes.push({ type: 'CTAs', icon: '🎯', color: 'red' })
    }
    
    console.log('getAvailableContentTypes - contentTypes:', contentTypes)
    return contentTypes
  }

  // Helper function to render section components with enhanced editing capabilities
  const renderSectionComponents = (components: any, sectionId?: string) => {
    if (!components || typeof components !== 'object' || Object.keys(components).length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-lg">📝</span>
          </div>
          <p className="text-sm text-gray-500 italic">No components extracted</p>
        </div>
      )
    }

    // Define all possible component types with their configurations
    const componentTypes = [
      { key: 'title', label: 'Title', icon: '📝', color: 'blue', bgColor: 'blue-50', textColor: 'blue-700' },
      { key: 'subtitle', label: 'Subtitle', icon: '📄', color: 'purple', bgColor: 'purple-50', textColor: 'purple-700' },
      { key: 'buttons', label: 'Buttons', icon: '🔘', color: 'orange', bgColor: 'orange-50', textColor: 'orange-700' },
      { key: 'images', label: 'Images', icon: '🖼️', color: 'indigo', bgColor: 'indigo-50', textColor: 'indigo-700' },
      { key: 'links', label: 'Links', icon: '🔗', color: 'cyan', bgColor: 'cyan-50', textColor: 'cyan-700' },
      { key: 'messages', label: 'Messages', icon: '💬', color: 'pink', bgColor: 'pink-50', textColor: 'pink-700' },
      { key: 'items', label: 'Items', icon: '📋', color: 'teal', bgColor: 'teal-50', textColor: 'teal-700' },
      { key: 'forms', label: 'Forms', icon: '📝', color: 'amber', bgColor: 'amber-50', textColor: 'amber-700' },
      { key: 'ctas', label: 'CTAs', icon: '🎯', color: 'red', bgColor: 'red-50', textColor: 'red-700' }
    ]

    // Filter to only show components that actually exist in the response
    const availableComponents = componentTypes.filter(({ key }) => {
      const value = components[key]
      return value !== undefined && value !== null && 
             (Array.isArray(value) ? value.length > 0 : String(value).trim() !== '')
    })

    // If no components are available, show the empty state
    if (availableComponents.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-gray-400 text-lg">📝</span>
          </div>
          <p className="text-sm text-gray-500 italic">No components available in this section</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {availableComponents.map(({ key, label, icon, color, bgColor, textColor }) => {
          const value = components[key]

          return (
            <div key={key} className={`bg-${bgColor} rounded-xl p-6 border border-${color}-200 hover:border-${color}-300 transition-all duration-200 shadow-sm hover:shadow-md`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                    <span className="text-xl">{icon}</span>
                  </div>
                  <div>
                    <h6 className={`font-bold text-${textColor} text-lg`}>{label}</h6>
                    <p className="text-sm text-gray-600">
                      {Array.isArray(value) ? `${value.length} ${label}${value.length === 1 ? '' : 's'}` : `1 ${label}`}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {isEditing && sectionId && !showPreview ? (
                  <div className="space-y-3">
                    {Array.isArray(value) ? (
                      value.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-3">
                          {typeof item === 'object' && item !== null ? (
                            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                              {/* Object-based editing */}
                              {item.title && (
                                <div>
                                  <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                    Title
                                  </Label>
                                  <Input
                                    value={String(item.title)}
                                    onChange={(e) => {
                                      const newValue = [...value]
                                      newValue[idx] = { ...item, title: e.target.value }
                                      handleComponentEdit(sectionId, key, newValue)
                                    }}
                                    className="text-sm"
                                    placeholder="Enter title..."
                                  />
                                </div>
                              )}
                              {item.content && (
                                <div>
                                  <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                    Content
                                  </Label>
                                  <Textarea
                                    value={String(item.content)}
                                    onChange={(e) => {
                                      const newValue = [...value]
                                      newValue[idx] = { ...item, content: e.target.value }
                                      handleComponentEdit(sectionId, key, newValue)
                                    }}
                                    className="min-h-[80px] text-sm"
                                    placeholder="Enter content..."
                                  />
                                </div>
                              )}
                              {item.author && (
                                <div>
                                  <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                    Author
                                  </Label>
                                  <Input
                                    value={String(item.author)}
                                    onChange={(e) => {
                                      const newValue = [...value]
                                      newValue[idx] = { ...item, author: e.target.value }
                                      handleComponentEdit(sectionId, key, newValue)
                                    }}
                                    className="text-sm"
                                    placeholder="Enter author..."
                                  />
                                </div>
                              )}
                              {item.role && (
                                <div>
                                  <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                    Role
                                  </Label>
                                  <Input
                                    value={String(item.role)}
                                    onChange={(e) => {
                                      const newValue = [...value]
                                      newValue[idx] = { ...item, role: e.target.value }
                                      handleComponentEdit(sectionId, key, newValue)
                                    }}
                                    className="text-sm"
                                    placeholder="Enter role..."
                                  />
                                </div>
                              )}
                              {item.plan_name && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                      Plan Name
                                    </Label>
                                    <Input
                                      value={String(item.plan_name)}
                                      onChange={(e) => {
                                        const newValue = [...value]
                                        newValue[idx] = { ...item, plan_name: e.target.value }
                                        handleComponentEdit(sectionId, key, newValue)
                                      }}
                                      className="text-sm"
                                      placeholder="Enter plan name..."
                                    />
                                  </div>
                                  <div>
                                    <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                      Price
                                    </Label>
                                    <Input
                                      value={String(item.price || '')}
                                      onChange={(e) => {
                                        const newValue = [...value]
                                        newValue[idx] = { ...item, price: e.target.value }
                                        handleComponentEdit(sectionId, key, newValue)
                                      }}
                                      className="text-sm"
                                      placeholder="Enter price..."
                                    />
                                  </div>
                                </div>
                              )}
                              {item.features && Array.isArray(item.features) && (
                                <div>
                                  <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                    Features
                                  </Label>
                                  <Textarea
                                    value={item.features.join('\n')}
                                    onChange={(e) => {
                                      const newValue = [...value]
                                      newValue[idx] = { ...item, features: e.target.value.split('\n').filter(f => f.trim()) }
                                      handleComponentEdit(sectionId, key, newValue)
                                    }}
                                    className="min-h-[100px] text-sm"
                                    placeholder="Enter features (one per line)..."
                                  />
                                </div>
                              )}
                              {item.description && (
                                <div>
                                  <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                    Description
                                  </Label>
                                  <Textarea
                                    value={String(item.description)}
                                    onChange={(e) => {
                                      const newValue = [...value]
                                      newValue[idx] = { ...item, description: e.target.value }
                                      handleComponentEdit(sectionId, key, newValue)
                                    }}
                                    className="min-h-[60px] text-sm"
                                    placeholder="Enter description..."
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                                {label} {idx + 1}
                              </Label>
                              <Textarea
                                value={String(item)}
                                onChange={(e) => {
                                  const newValue = [...value]
                                  newValue[idx] = e.target.value
                                  handleComponentEdit(sectionId, key, newValue)
                                }}
                                className="min-h-[60px] text-sm"
                                placeholder={`Enter ${label.toLowerCase()}...`}
                              />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <Label className={`text-sm font-medium text-${textColor} mb-2 block`}>
                          {label}
                        </Label>
                        <Textarea
                          value={String(value)}
                          onChange={(e) => handleComponentEdit(sectionId, key, e.target.value)}
                          className="min-h-[100px] text-sm"
                          placeholder={`Enter ${label.toLowerCase()}...`}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  // Display mode - show all content in an organized way
                  <div className="space-y-3">
                    {Array.isArray(value) ? (
                      value.map((item: any, idx: number) => {
                        if (typeof item === 'object' && item !== null) {
                          return (
                            <div key={idx} className={`bg-white rounded-lg p-4 border border-${color}-200 space-y-3 shadow-sm`}>
                              {item.title && (
                                <div className={`font-bold text-${textColor} text-base border-b border-${color}-100 pb-2`}>
                                  {String(item.title)}
                                </div>
                              )}
                              {item.content && (
                                <div className={`text-sm text-${textColor} leading-relaxed`}>
                                  {String(item.content)}
                                </div>
                              )}
                              {item.author && (
                                <div className={`text-sm text-${textColor} opacity-75 font-medium italic`}>
                                  — {String(item.author)}
                                </div>
                              )}
                              {item.role && (
                                <div className={`text-xs text-${textColor} opacity-60 bg-${color}-50 px-2 py-1 rounded inline-block`}>
                                  {String(item.role)}
                                </div>
                              )}
                              {item.plan_name && (
                                <div className={`font-semibold text-${textColor} text-sm bg-${color}-50 p-2 rounded`}>
                                  {String(item.plan_name)} - {String(item.users || '')} - {String(item.price || '')}
                                </div>
                              )}
                              {item.type && (
                                <div className={`text-xs text-${textColor} opacity-60`}>
                                  Type: {String(item.type)}
                                </div>
                              )}
                              {item.features && Array.isArray(item.features) && (
                                <div className="space-y-1">
                                  <div className={`text-sm font-medium text-${textColor} mb-2`}>Features:</div>
                                  {item.features.map((feature: any, fIdx: number) => (
                                    <div key={fIdx} className={`text-sm text-${textColor} opacity-80 flex items-start space-x-2`}>
                                      <span className="text-green-500 mt-1 font-bold">•</span>
                                      <span>{String(feature)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.description && (
                                <div className={`text-sm text-${textColor} opacity-80 italic`}>
                                  {String(item.description)}
                                </div>
                              )}
                            </div>
                          )
                        } else {
                          return (
                            <div key={idx} className={`bg-white rounded-lg p-4 border border-${color}-200 shadow-sm`}>
                              <div className={`text-sm text-${textColor} leading-relaxed`}>
                                {String(item)}
                              </div>
                            </div>
                          )
                        }
                      })
                    ) : (
                      <div className={`bg-white rounded-lg p-4 border border-${color}-200 shadow-sm`}>
                        <div className={`text-sm text-${textColor} leading-relaxed`}>
                          {String(value)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Initialize edited sections when landing page changes
  useEffect(() => {
    if (landingPage?.sections) {
      setEditedSections([...landingPage.sections])
    }
  }, [landingPage])

  // Refresh edited sections when modal opens to ensure we have the latest data
  useEffect(() => {
    if (isOpen && landingPage?.sections) {
      console.log('Modal opened, refreshing sections with latest data:')
      console.log('Landing page object:', landingPage)
      console.log('Landing page sections:', landingPage.sections)
      setEditedSections([...landingPage.sections])
    }
  }, [isOpen, landingPage?.sections])

  const copyToClipboard = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSectionId(sectionId)
      setTimeout(() => setCopiedSectionId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleSectionEdit = (sectionId: string, field: 'title' | 'content' | 'name', value: string) => {
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

  const handleComponentEdit = (sectionId: string, componentKey: string, value: any) => {
    setEditedSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { 
              ...section, 
              components: {
                ...section.components,
                [componentKey]: value
              }
            }
          : section
      )
    )
  }

  const validateSections = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    console.log('=== VALIDATION DEBUG ===')
    console.log('Validating sections:', editedSections.length)
    
    editedSections.forEach((section, index) => {
      console.log(`Section ${index + 1} (${section.id}):`, {
        title: section.title,
        content: section.content,
        type: section.type,
        hasComponents: section.components ? Object.keys(section.components).length : 0,
        components: section.components
      })
      
      // For generated sections, be very lenient with validation
      // Only validate if the user has explicitly started editing a section
      
      // Check if section has any meaningful content in components
      const hasComponents = section.components && Object.keys(section.components).length > 0
      const hasComponentContent = hasComponents && Object.values(section.components).some(component => {
        if (Array.isArray(component)) {
          return component.some(item => item && String(item).trim())
        }
        return component && String(component).trim()
      })
      
      // Only require title if:
      // 1. The section has meaningful component content AND
      // 2. The user has started editing (section has a title or name)
      const hasTitleOrName = (section.title && String(section.title).trim()) || (section.name && String(section.name).trim())
      
      if (hasComponentContent && !hasTitleOrName) {
        // Only show error if user has started editing this section
        // For now, let's be very lenient and not require titles
        console.log(`Section ${section.id} has components but no title - allowing (lenient validation)`)
      }
      
      // Don't validate content at the top level since sections use components
      // The components themselves handle their own validation
    })
    
    console.log('Validation errors:', errors)
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateSections()) {
      return
    }
    
    setIsSaving(true)
    try {
      console.log('=== SAVE SECTIONS DEBUG ===')
      console.log('Edited sections count:', editedSections.length)
      console.log('Edited sections:', editedSections)
      
      // Call the onSave callback to let parent component handle the API call
      if (onSave) {
        console.log('Calling parent onSave callback...')
        await onSave(editedSections)
        
        // Show success message
        setSaveMessage('All changes saved successfully!')
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveMessage(null)
        }, 3000)
        
        // Close the modal after successful save
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        throw new Error('No onSave callback provided')
      }
    } catch (error) {
      console.error('Save failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSaveMessage(`Error saving changes: ${errorMessage}`)
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveMessage(null)
      }, 5000)
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

  const getSectionIcon = (type: string | undefined) => {
    if (!type) {
      return '📝'
    }
    
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

  const getSectionColor = (type: string | undefined) => {
    if (!type) {
      return 'bg-gradient-to-r from-gray-400 to-gray-600'
    }
    
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
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-b2 flex items-center">
            <Edit3 className="h-6 w-6 mr-3" />
            Edit Landing Page Content
          </DialogTitle>
          
          {/* Success/Error Message */}
          {saveMessage && (
            <div className={`mt-3 p-3 rounded-lg text-sm animate-in slide-in-from-top-2 duration-300 ${
              saveMessage.includes('Error') 
                ? 'bg-red-100 border border-red-200 text-red-700' 
                : 'bg-green-100 border border-green-200 text-green-700'
            }`}>
              <div className="flex items-center">
                {saveMessage.includes('Error') ? (
                  <AlertCircle className="w-4 h-4 mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {saveMessage}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <div className="space-y-4 pr-2">
            {/* Section Counter */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-600">
                  Edit content across {landingPage.sections.length} sections
                </p>
              </div>
            </div>
                
            {editedSections.map((section, index) => (
              <Card key={section.id} className="group transition-all duration-300 ring-2 ring-blue-200 bg-gradient-to-br from-blue-50/30 to-purple-50/20 hover:ring-blue-400 hover:shadow-2xl">
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-4">
                    {/* Section Icon */}
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg ${
                        index % 6 === 0 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                        index % 6 === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        index % 6 === 2 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        index % 6 === 3 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                        index % 6 === 4 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        'bg-gradient-to-r from-indigo-500 to-indigo-600'
                      }`}>
                        {getSectionIcon(section.type)}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-b2 text-sm font-medium border shadow-lg bg-b12">
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Section Info */}
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`name-${section.id}`} className="text-base font-semibold text-gray-800 mb-2 block">
                              Section Name
                            </Label>
                            <Input
                              id={`name-${section.id}`}
                              value={section.title || section.name || ''}
                              onChange={(e) => handleSectionEdit(section.id, 'title', e.target.value)}
                              className={`text-base ${validationErrors[`${section.id}-title`] ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter section name"
                            />
                            {validationErrors[`${section.id}-title`] && (
                              <p className="text-red-500 text-sm mt-2 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                {validationErrors[`${section.id}-title`]}
                              </p>
                            )}
                          </div>
                           <div className="flex items-center space-x-2 flex-wrap">
                             {getAvailableContentTypes(section.components).map((contentType, idx) => (
                               <Badge 
                                 key={idx}
                                 variant="outline" 
                                 className={`text-xs px-2 py-1 bg-${contentType.color}-50 text-${contentType.color}-700 border-${contentType.color}-200`}
                               >
                                 <span className="mr-1">{contentType.icon}</span>
                                 {contentType.type}
                               </Badge>
                             ))}
                           </div>
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-xl font-bold text-foreground mb-2">
                            {section.title || section.name || `Section ${index + 1}`}
                          </CardTitle>
                           <CardDescription className="flex items-center space-x-2 flex-wrap mt-2">
                             {getAvailableContentTypes(section.components).map((contentType, idx) => (
                               <Badge 
                                 key={idx}
                                 variant="outline" 
                                 className={`text-xs px-2 py-1 bg-${contentType.color}-50 text-${contentType.color}-700 border-${contentType.color}-200`}
                               >
                                 <span className="mr-1">{contentType.icon}</span>
                                 {contentType.type}
                               </Badge>
                             ))}
                           </CardDescription>
                        </div>
                      )}
                    </div>
                    
                  </div>
                </CardHeader>
                
                {/* Section Components */}
                <CardContent>
                  {section.components && typeof section.components === 'object' ? 
                    renderSectionComponents(section.components, section.id) : 
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-gray-400 text-lg">📝</span>
                      </div>
                      <p className="text-sm text-gray-500 italic">No components available</p>
                    </div>
                  }
                </CardContent>
              </Card>
            ))}
            {/* Add some bottom padding to ensure last section is fully visible */}
            <div className="h-4"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t flex-shrink-0 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-5 py-2 border bg-white hover:bg-b2 hover:text-white transition-all duration-200 font-medium"
            >
              Close Without Saving
            </Button>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              className="px-5 py-2 bg-b2 text-white transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-b5"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving All Changes...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
