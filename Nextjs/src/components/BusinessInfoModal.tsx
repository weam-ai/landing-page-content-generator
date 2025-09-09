"use client"

import { useState, useEffect } from "react"
import { 
  Building2, 
  Users, 
  Sparkles, 
  Globe, 
  FileText, 
  Save, 
  X,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/utils"

interface BusinessInfo {
  businessName: string
  businessOverview: string
  targetAudience: string
  brandTone?: string
  websiteUrl?: string
}

interface BusinessInfoModalProps {
  isOpen: boolean
  onClose: () => void
  businessInfo: BusinessInfo
  onSave: (updatedInfo: BusinessInfo) => void
  landingPageId?: string
}

export function BusinessInfoModal({ 
  isOpen, 
  onClose, 
  businessInfo, 
  onSave,
  landingPageId 
}: BusinessInfoModalProps) {
  const [formData, setFormData] = useState<BusinessInfo>(businessInfo)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessInfo, string>>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // Update form data when businessInfo prop changes
  useEffect(() => {
    setFormData(businessInfo)
  }, [businessInfo])

  const handleInputChange = (field: keyof BusinessInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = () => {
    const newErrors: Partial<Record<keyof BusinessInfo, string>> = {}

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required"
    }

    if (!formData.businessOverview.trim()) {
      newErrors.businessOverview = "Business overview is required"
    }

    if (!formData.targetAudience.trim()) {
      newErrors.targetAudience = "Target audience is required"
    }

    if (formData.websiteUrl && formData.websiteUrl.trim()) {
      const urlPattern = /^https?:\/\/.+\..+/
      if (!urlPattern.test(formData.websiteUrl)) {
        newErrors.websiteUrl = "Please enter a valid URL (starting with http:// or https://)"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setSaveStatus('saving')

    try {
      // Call the onSave callback with updated data
      await onSave(formData)
      setSaveStatus('success')
      
      // Close modal after a brief success indication
      setTimeout(() => {
        onClose()
        setSaveStatus('idle')
      }, 1000)
    } catch (error) {
      console.error('Error saving business info:', error)
      setSaveStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (saveStatus === 'saving') return // Prevent closing while saving
    setSaveStatus('idle')
    setErrors({})
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center">
            <Building2 className="h-6 w-6 mr-3" />
            Business Information & Overview
          </DialogTitle>
          <DialogDescription className="text-base">
            Edit and manage all your business information in one place
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh] pr-2">
          <div className="space-y-6">
            {/* Business Name and Brand Tone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                  Business Name *
                </Label>
                <Input
                  placeholder="Enter your business name"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className={`text-lg ${errors.businessName ? 'border-destructive focus:border-destructive' : ''}`}
                />
                {errors.businessName && (
                  <div className="flex items-center space-x-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.businessName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                  Brand Tone
                </Label>
                <Select
                  value={formData.brandTone || 'professional'}
                  onChange={(e) => handleInputChange("brandTone", e.target.value)}
                  className="text-lg"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="playful">Playful</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="casual">Casual</option>
                </Select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center">
                <Users className="h-4 w-4 mr-2 text-green-600" />
                Target Audience *
              </Label>
              <Textarea
                placeholder="Describe your target audience (e.g., small business owners, tech professionals, etc.)"
                value={formData.targetAudience}
                onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                className={`text-base min-h-[100px] ${errors.targetAudience ? 'border-destructive focus:border-destructive' : ''}`}
              />
              {errors.targetAudience && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.targetAudience}</span>
                </div>
              )}
            </div>

            {/* Website URL */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center">
                <Globe className="h-4 w-4 mr-2 text-orange-600" />
                Website URL
              </Label>
              <Input
                placeholder="https://your-website.com"
                value={formData.websiteUrl || ''}
                onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                className={`text-lg ${errors.websiteUrl ? 'border-destructive focus:border-destructive' : ''}`}
              />
              {errors.websiteUrl && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.websiteUrl}</span>
                </div>
              )}
            </div>

            {/* Business Overview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center">
                <FileText className="h-4 w-4 mr-2 text-cyan-600" />
                Business Overview *
              </Label>
              <Textarea
                placeholder="Provide a comprehensive overview of your business, services, and value proposition"
                value={formData.businessOverview}
                onChange={(e) => handleInputChange("businessOverview", e.target.value)}
                className={`text-base min-h-[150px] ${errors.businessOverview ? 'border-destructive focus:border-destructive' : ''}`}
              />
              {errors.businessOverview && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.businessOverview}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {saveStatus === 'success' && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Saved successfully!</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error saving. Please try again.</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saveStatus === 'saving'}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="bg-primary hover:bg-primary/90"
            >
              {saveStatus === 'saving' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
