"use client"

import { useState } from "react"
import { ArrowLeft, Building2, Users, MessageSquare, Globe, Sparkles, CheckCircle, AlertCircle, Shield, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import { SectionHeader } from "@/components/ui/section-header"
import { BusinessDetails } from "@/types"
import { apiService } from "@/lib/api"

interface BusinessDetailsFormProps {
  onSubmit: (details: BusinessDetails) => void
  onBack: () => void
  extractedSections?: any[]
}

export function BusinessDetailsForm({ onSubmit, onBack, extractedSections = [] }: BusinessDetailsFormProps) {
  const [formData, setFormData] = useState<BusinessDetails>({
    businessName: "",
    businessOverview: "",
    targetAudience: "",
    brandTone: "professional",
    websiteUrl: "",
    contentLength: "custom",
    customContentLength: 150
  })

  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessDetails, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoGenerateMessage, setAutoGenerateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [inputMethod, setInputMethod] = useState<'manual' | 'url'>('url')

  const handleInputChange = (field: keyof BusinessDetails, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleInputMethodChange = (method: 'manual' | 'url') => {
    setInputMethod(method)
    // Clear auto-generate message when switching methods
    setAutoGenerateMessage(null)
    // Clear errors when switching methods
    setErrors({})
    
    // If switching to manual, clear URL
    if (method === 'manual') {
      setFormData(prev => ({ ...prev, websiteUrl: '' }))
    }
    // If switching to URL, clear manual fields
    else if (method === 'url') {
      setFormData(prev => ({ 
        ...prev, 
        businessName: '', 
        businessOverview: '', 
        targetAudience: '' 
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Partial<Record<keyof BusinessDetails, string>> = {}
    
    if (inputMethod === 'manual') {
      // Validate manual input fields
      if (!formData.businessName.trim()) {
        newErrors.businessName = "Business name is required"
      }
      
      if (!formData.businessOverview.trim()) {
        newErrors.businessOverview = "Business overview is required"
      } else if (formData.businessOverview.length < 20) {
        newErrors.businessOverview = "Business overview should be at least 20 characters"
      }
      
      if (!formData.targetAudience.trim()) {
        newErrors.targetAudience = "Target audience is required"
      }
    } else if (inputMethod === 'url') {
      // Validate URL input
      if (!formData.websiteUrl || !formData.websiteUrl.trim()) {
        newErrors.websiteUrl = "Website URL is required"
      } else if (!isValidUrl(formData.websiteUrl)) {
        newErrors.websiteUrl = "Please enter a valid URL"
      }
      
      // Check if auto-generation was successful
      if (!formData.businessName.trim() || !formData.businessOverview.trim() || !formData.targetAudience.trim()) {
        newErrors.websiteUrl = "Please click 'Auto-generate' to extract business information from your website"
      }
    }
    
    if (!formData.customContentLength || formData.customContentLength < 10 || formData.customContentLength > 1000) {
      newErrors.customContentLength = "Content length must be between 10 and 1000 words"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleAutoGenerate = async () => {
    if (!formData.websiteUrl) return
    
    console.log('🚀 Starting auto-generation for URL:', formData.websiteUrl)
    setIsAutoGenerating(true)
    
    try {
      // Clear previous messages
      setAutoGenerateMessage(null)
      
      // Show initial progress message
      setAutoGenerateMessage({
        type: 'success',
        text: '🔄 Analyzing website content... This may take up to 60 seconds.'
      })
      
      console.log('📡 Calling API with data:', {
        websiteUrl: formData.websiteUrl,
        businessName: formData.businessName || "Auto-generated Business",
        businessOverview: formData.businessOverview || "Business overview will be auto-generated",
        targetAudience: formData.targetAudience || "Target audience will be auto-generated",
        brandTone: formData.brandTone,
        tags: []
      })
      
      // Call the backend API to auto-generate business details
      const response = await apiService.autoGenerateBusinessInfo({
        websiteUrl: formData.websiteUrl,
        businessName: formData.businessName || "Auto-generated Business",
        businessOverview: formData.businessOverview || "Business overview will be auto-generated",
        targetAudience: formData.targetAudience || "Target audience will be auto-generated",
        brandTone: formData.brandTone,
        tags: []
      })

      console.log('✅ API Response received:', response)
      
      if (response.success && response.data) {
        console.log('📊 Updating form with auto-generated data')
        
        // Extract auto-generated content
        const autoGeneratedContent = response.data.autoGenerated?.generatedContent || {}
        
        console.log('🔍 Extracted auto-generated content:', autoGeneratedContent)
        
        // Update form with auto-generated content, prioritizing AI-generated data
        setFormData(prev => {
          // Prepare the form updates
          const businessName = autoGeneratedContent.businessDescription ? 
            autoGeneratedContent.businessDescription.split('.')[0].split(' is ')[0].split(' is an ')[0].trim() :
            response.data.businessName || prev.businessName
          
          const businessOverview = autoGeneratedContent.businessDescription || 
            response.data.businessOverview || prev.businessOverview
          
          const targetAudience = autoGeneratedContent.valueProposition ? 
            `Businesses looking for ${autoGeneratedContent.valueProposition.toLowerCase()}` :
            response.data.targetAudience || prev.targetAudience
          
          console.log('📝 Form updates:', { businessName, businessOverview, targetAudience })
          
          return {
            ...prev,
            businessName,
            businessOverview,
            targetAudience,
            brandTone: response.data.brandTone || prev.brandTone,
            websiteUrl: formData.websiteUrl
          }
        })

        // Show success message
        setAutoGenerateMessage({
          type: 'success',
          text: 'Business information auto-generated successfully!'
        })
        
        // Log the auto-generated data for debugging
        if (response.data.autoGenerated && response.data.autoGenerated.generatedContent) {
          console.log('🤖 Auto-generated content:', response.data.autoGenerated.generatedContent)
        }
      } else {
        console.log('❌ API response indicates failure:', response)
      }
    } catch (error: any) {
      console.error('❌ Auto-generation failed:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      })
      
      // Show user-friendly error message
      let userFriendlyMessage = 'Failed to auto-generate business information. Please try again.'
      
      // Check for specific error types
      if (error.message && (
        error.message.includes('Request timeout') ||
        error.message.includes('timeout') ||
        error.message.includes('AbortError')
      )) {
        userFriendlyMessage = 'The request timed out. The website may be slow to respond or the AI analysis is taking longer than expected. Please try again or use a different website.'
      } else if (error.message && (
        error.message.includes('blocking automated access') ||
        error.message.includes('403 Forbidden') ||
        error.message.includes('blocked') ||
        error.message.includes('security') ||
        error.message.includes('HTTP error') ||
        error.message.includes('status: 500') ||
        error.message.includes('status: 403')
      )) {
        userFriendlyMessage = 'Due to security restrictions on your provided URL, we were not able to generate business information automatically. Please try a different website or provide your business details manually.'
      } else if (error.message && (
        error.message.includes('Network error') ||
        error.message.includes('fetch')
      )) {
        userFriendlyMessage = 'Network error occurred. Please check your internet connection and ensure the backend server is running.'
      }
      
      setAutoGenerateMessage({
        type: 'error',
        text: userFriendlyMessage
      })
    } finally {
      setIsAutoGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      onSubmit(formData)
      setIsSubmitting(false)
    }, 1000)
  }

  const isFormValid = inputMethod === 'manual' 
    ? (formData.businessName && formData.businessOverview && formData.targetAudience)
    : (formData.websiteUrl && formData.businessName && formData.businessOverview && formData.targetAudience)

  const brandToneOptions = [
    { value: "professional", label: "Professional & Formal", description: "Corporate, trustworthy, authoritative" },
    { value: "friendly", label: "Friendly & Approachable", description: "Warm, helpful, customer-focused" },
    { value: "playful", label: "Playful & Creative", description: "Fun, innovative, energetic" },
    { value: "authoritative", label: "Authoritative & Trustworthy", description: "Expert, reliable, confident" },
    { value: "casual", label: "Casual & Conversational", description: "Relaxed, relatable, down-to-earth" }
  ]

  return (
    <div className="space-y-8">

      <SectionHeader
        icon={<Building2 className="w-8 h-8" />}
        title="Tell us about your business"
        description="This information helps our AI generate relevant, compelling content that perfectly matches your brand and business goals"
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Info Fields - Show only when manual input is selected */}
        {inputMethod === 'manual' && (
          <>
            {/* Business Name and Brand Tone - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-b2" />
                  Business Name *
                </label>
                <Input
                  placeholder="Enter your business name"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  required
                />
                {errors.businessName && (
                  <div className="flex items-center space-x-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.businessName}</span>
                  </div>
                )}
              </div>

              {/* Brand Tone */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-b2" />
                  Brand Tone
                </label>
                <Select
                  value={formData.brandTone}
                  onValueChange={(value) => handleInputChange("brandTone", value)}
                >
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select brand tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandToneOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Business Overview */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Business Overview *
              </label>
              <Textarea
                placeholder="Describe what your business does, your mission, key value propositions, and what makes you unique..."
                value={formData.businessOverview}
                onChange={(e) => handleInputChange("businessOverview", e.target.value)}
                rows={5}
                className={`text-sm ${errors.businessOverview ? 'border-destructive focus:border-destructive' : ''}`}
                required
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Be specific about your services, products, and what makes you unique. Minimum 20 characters.
                </p>
                <span className={`text-xs ${formData.businessOverview.length < 20 ? 'text-destructive' : 'text-green-600'}`}>
                  {formData.businessOverview.length}
                </span>
              </div>
              {errors.businessOverview && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.businessOverview}</span>
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground flex items-center">
                <Users className="h-4 w-4 mr-2 text-b2" />
                Target Audience *
              </label>
              <Textarea
                placeholder="Who is your ideal customer? Describe their demographics, needs, pain points, and what motivates them..."
                value={formData.targetAudience}
                onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                rows={4}
                className={`text-sm ${errors.targetAudience ? 'border-destructive focus:border-destructive' : ''}`}
                required
              />
              {errors.targetAudience && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.targetAudience}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* OR Divider with Toggle */}
        <div className="flex items-center justify-center my-8">
          <div className="flex items-center space-x-4 bg-muted/30 rounded-full p-2 md:flex-row flex-col">
            <button
              type="button"
              onClick={() => handleInputMethodChange('manual')}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                inputMethod === 'manual'
                  ? 'bg-b2 text-white shadow-md'
                  : 'text-muted-foreground bg-b12 hover:text-foreground hover:bg-b11'
              }`}
            >
              <Building2 className="h-4 w-4 mr-2 inline" />
              Provide Manually
            </button>
            <div className="text-muted-foreground font-medium">OR</div>
            <button
              type="button"
              onClick={() => handleInputMethodChange('url')}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                inputMethod === 'url'
                  ? 'bg-b2 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Globe className="h-4 w-4 mr-2 inline" />
              Auto-Generate from URL
            </button>
          </div>
        </div>

        {/* Website URL - Show only when URL input method is selected */}
        {inputMethod === 'url' && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center">
              <Globe className="h-4 w-4 mr-2 text-b2" />
              Website URL *
            </label>
            <div className="flex md:space-x-3 md:flex-row flex-col space-y-3 md:space-y-0">
              <Input
                type="url"
                placeholder="https://yourwebsite.com"
                value={formData.websiteUrl}
                onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                className={`flex-1 text-sm ${errors.websiteUrl ? 'border-destructive focus:border-destructive' : ''}`}
                required
              />
              <Tooltip content="We can automatically extract business details from your existing website" maxWidth="350px">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoGenerate}
                  disabled={!formData.websiteUrl || isAutoGenerating}
                  className="whitespace-nowrap hover:bg-b2 hover:text-white"
                >
                  {isAutoGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Auto-generate
                    </>
                  )}
                </Button>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              We can automatically extract business details from your existing website to save you time
            </p>
            
            {/* Auto-generate message */}
            {autoGenerateMessage && (
              <div className={`flex items-center space-x-3 text-sm p-4 rounded-lg border-2 ${
                autoGenerateMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}>
                {autoGenerateMessage.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="relative">
                    <AlertTriangle className="h-5 w-5 text-red-600 animate-bounce" />
                    <div className="absolute -top-1 -right-1">
                      <Shield className="h-3 w-3 text-red-500 animate-ping" />
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <span className="font-medium">{autoGenerateMessage.text}</span>
                  {autoGenerateMessage.type === 'error' && autoGenerateMessage.text.includes('Due to security restrictions') && (
                    <div className="mt-1 text-xs text-red-600 opacity-80">
                      💡 Try a different website or provide business information manually
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {errors.websiteUrl && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.websiteUrl}</span>
              </div>
            )}
          </div>
        )}

        {/* Generated Business Info - Show after successful auto-generation */}
        {inputMethod === 'url' && autoGenerateMessage?.type === 'success' && (formData.businessName || formData.businessOverview || formData.targetAudience) && (
          <div className="space-y-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-green-800">Generated Business Information</h4>
                <p className="text-sm text-green-600">Review and edit the information extracted from your website</p>
              </div>
            </div>

            {/* Business Name and Brand Tone - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-b2" />
                  Business Name *
                </label>
                <Input
                  placeholder="Enter your business name"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className={`text-sm ${errors.businessName ? 'border-destructive focus:border-destructive' : ''}`}
                  required
                />
                {errors.businessName && (
                  <div className="flex items-center space-x-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.businessName}</span>
                  </div>
                )}
              </div>

              {/* Brand Tone */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-b2" />
                  Brand Tone
                </label>
                <Select
                  value={formData.brandTone}
                  onValueChange={(value) => handleInputChange("brandTone", value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select brand tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandToneOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Business Overview */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Business Overview *
              </label>
              <Textarea
                placeholder="Describe what your business does, your mission, key value propositions, and what makes you unique..."
                value={formData.businessOverview}
                onChange={(e) => handleInputChange("businessOverview", e.target.value)}
                rows={5}
                className={`text-sm ${errors.businessOverview ? 'border-destructive focus:border-destructive' : ''}`}
                required
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Be specific about your services, products, and what makes you unique. Minimum 20 characters.
                </p>
                <span className={`text-xs ${formData.businessOverview.length < 20 ? 'text-destructive' : 'text-green-600'}`}>
                  {formData.businessOverview.length}
                </span>
              </div>
              {errors.businessOverview && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.businessOverview}</span>
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground flex items-center">
                <Users className="h-4 w-4 mr-2 text-b2" />
                Target Audience *
              </label>
              <Textarea
                placeholder="Who is your ideal customer? Describe their demographics, needs, pain points, and what motivates them..."
                value={formData.targetAudience}
                onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                rows={4}
                className={`text-sm ${errors.targetAudience ? 'border-destructive focus:border-destructive' : ''}`}
                required
              />
              {errors.targetAudience && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.targetAudience}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
              <Sparkles className="h-4 w-4" />
              <span>You can edit any of the generated information above before proceeding</span>
            </div>
          </div>
        )}

        {/* Content Length */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground flex items-center">
            <MessageSquare className="h-4 w-4 mr-2 text-b2" />
            Content Length for Sections
          </label>
          <Input
            type="number"
            placeholder="Enter word count (e.g., 150)"
            value={formData.customContentLength || ''}
            onChange={(e) => handleInputChange("customContentLength", e.target.value)}
            className="text-sm"
            min="10"
            max="1000"
          />
          <p className="text-sm text-muted-foreground">
            Specify the approximate word count for each section content
          </p>
          {errors.customContentLength && (
            <div className="flex items-center space-x-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.customContentLength}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-6">
          <div className="flex md:space-x-4 md:flex-row flex-col space-y-4 md:space-y-0">
            {/* Back Button - 30% width */}
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border px-4 py-2 text-sm bg-white text-b2 hover:bg-b2 hover:text-white transition-all duration-200"
            >
              <ArrowLeft className="h-auto w-4 mr-1" />
              Back
            </Button>
            
            {/* Generate Landing Page Button - 70% width */}
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="bg-b2 text-white hover:bg-b5 transition-all duration-200"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Generating Landing Page...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Landing Page
                </>
              )}
            </Button>
          </div>
          
          {!isFormValid && (
            <p className="text-sm text-muted-foreground text-center mt-3">
              Please fill in all required fields to continue
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
