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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30">
        <DialogHeader className="pb-6 border-b border-slate-200/60">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-bold text-slate-800 flex items-center">
                Business Information & Overview
              </DialogTitle>
              <DialogDescription className="text-lg text-slate-600 mt-1">
                Manage and update your business details to create compelling landing pages
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh] pr-2 py-6">
          <div className="space-y-8">
            {/* Business Name and Brand Tone */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-slate-700 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  Business Name *
                </Label>
                <Input
                  placeholder="Enter your business name"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className={`text-lg h-12 border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 ${
                    errors.businessName 
                      ? 'border-red-300 focus:border-red-500 bg-red-50' 
                      : 'border-slate-200 focus:border-blue-500 bg-white hover:border-slate-300'
                  }`}
                />
                {errors.businessName && (
                  <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.businessName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold text-slate-700 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                  Brand Tone
                </Label>
                <Select
                  value={formData.brandTone || 'professional'}
                  onChange={(e) => handleInputChange("brandTone", e.target.value)}
                  className="text-lg h-12 border-2 border-slate-200 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white hover:border-slate-300"
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
            <div className="space-y-4">
              <Label className="text-base font-semibold text-slate-700 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                Target Audience *
              </Label>
              <Textarea
                placeholder="Describe your target audience (e.g., small business owners, tech professionals, etc.)"
                value={formData.targetAudience}
                onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                className={`text-base min-h-[120px] border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-green-500/20 resize-none ${
                  errors.targetAudience 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : 'border-slate-200 focus:border-green-500 bg-white hover:border-slate-300'
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
            <div className="space-y-4">
              <Label className="text-base font-semibold text-slate-700 flex items-center">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <Globe className="h-4 w-4 text-orange-600" />
                </div>
                Website URL
              </Label>
              <Input
                placeholder="https://your-website.com"
                value={formData.websiteUrl || ''}
                onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                className={`text-lg h-12 border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-orange-500/20 ${
                  errors.websiteUrl 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : 'border-slate-200 focus:border-orange-500 bg-white hover:border-slate-300'
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
            <div className="space-y-4">
              <Label className="text-base font-semibold text-slate-700 flex items-center">
                <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-cyan-600" />
                </div>
                Business Overview *
              </Label>
              <Textarea
                placeholder="Provide a comprehensive overview of your business, services, and value proposition"
                value={formData.businessOverview}
                onChange={(e) => handleInputChange("businessOverview", e.target.value)}
                className={`text-base min-h-[180px] border-2 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-cyan-500/20 resize-none ${
                  errors.businessOverview 
                    ? 'border-red-300 focus:border-red-500 bg-red-50' 
                    : 'border-slate-200 focus:border-cyan-500 bg-white hover:border-slate-300'
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
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saveStatus === 'saving'}
              className="h-11 px-6 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
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
