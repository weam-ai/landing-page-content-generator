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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30">
        <DialogHeader className="pb-6 border-b border-slate-200/60">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 md:bg-b12 rounded-lg flex items-center justify-center md:border">
              <Building2 className="h-6 w-6 text-b2" />
            </div>
            <div>
              <DialogTitle className="md:text-2xl text-lgfont-bold text-slate-800 flex items-center max-md:text-left">
                Business Information & Overview
              </DialogTitle>
              <DialogDescription className="md:text-sm text-xs text-slate-600 mt-1 max-md:text-left">
                Manage and update your business details to create compelling landing pages
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh] pr-2 py-6">
          <div className="space-y-4">
            {/* Business Name and Brand Tone */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-700 flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center mr-1">
                    <Building2 className="h-4 w-4 text-b5" />
                  </div>
                  Business Name *
                </Label>
                <Input
                  placeholder="Enter your business name"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className={` ${
                    errors.businessName 
                      ? 'border-red-300 focus:border-red-500 bg-red-50' 
                      : 'border-slate-200 bg-white'
                  }`}
                />
                {errors.businessName && (
                  <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.businessName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-700 flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center mr-1">
                    <Sparkles className="h-4 w-4 text-b5" />
                  </div>
                  Brand Tone
                </Label>
                <Select 
                  value={formData.brandTone || ''} 
                  onValueChange={(value: string) => handleInputChange("brandTone", value)}
                >
                  <SelectTrigger className="">
                    <SelectValue placeholder="Select brand tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700 flex items-center">
                <div className="w-8 h-8 flex items-center justify-center mr-1">
                  <Users className="h-4 w-4 text-b5" />
                </div>
                Target Audience *
              </Label>
              <Textarea
                placeholder="Describe your target audience (e.g., small business owners, tech professionals, etc.)"
                value={formData.targetAudience}
                onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                className={`min-h-[120px] resize-none ${
                  errors.targetAudience 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : ''
                }`}
              />
              {errors.targetAudience && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.targetAudience}</span>
                </div>
              )}
            </div>

            {/* Website URL */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700 flex items-center">
                <div className="w-8 h-8 flex items-center justify-center mr-1">
                  <Globe className="h-4 w-4 text-b5" />
                </div>
                Website URL
              </Label>
              <Input
                placeholder="https://your-website.com"
                value={formData.websiteUrl || ''}
                onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                className={` ${
                  errors.websiteUrl 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : ''
                }`}
              />
              {errors.websiteUrl && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.websiteUrl}</span>
                </div>
              )}
            </div>

            {/* Business Overview */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-700 flex items-center">
                <div className="w-8 h-8 flex items-center justify-center mr-1">
                  <FileText className="h-4 w-4 text-b5" />
                </div>
                Business Overview *
              </Label>
              <Textarea
                placeholder="Provide a comprehensive overview of your business, services, and value proposition"
                value={formData.businessOverview}
                onChange={(e) => handleInputChange("businessOverview", e.target.value)}
                className={`min-h-[180px] resize-none ${
                  errors.businessOverview 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : ''
                }`}
              />
              {errors.businessOverview && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.businessOverview}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-blue-50/30 -mx-6 px-6 py-4">
          <div className="flex items-center space-x-3">
            {saveStatus === 'success' && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Saved successfully!</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error saving. Please try again.</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saveStatus === 'saving'}
              className="border bg-white hover:bg-b2 hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="bg-b2 text-white hover:bg-b5"
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
