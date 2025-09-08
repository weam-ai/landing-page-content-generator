"use client"

import { useState, useEffect } from "react"
import { 
  Sparkles, 
  Download, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Globe, 
  Building2,
  Users,
  Palette,
  Settings,
  ArrowRight,
  Play,
  Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GeneratedSectionsModal } from "@/components/GeneratedSectionsModal"
import { api } from "@/lib/utils"
// Removed tooltip imports as they're not available

interface BusinessInfo {
  businessName: string
  businessOverview: string
  targetAudience: string
  brandTone?: string
  websiteUrl?: string
}

interface ExtractedData {
  sections: any[]
  designType: string
  metadata: any
  visualElements?: any
  contentMapping?: any
  layoutAnalysis?: any
  designTokens?: any
}

interface LandingPageSection {
  id: string
  type: string
  title: string
  content: string
  order: number
  metadata?: any
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
  customCSS: string
  customJS: string
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
  downloadUrl?: string
}

interface CompleteLandingPageGeneratorProps {
  businessInfo: BusinessInfo
  extractedData: ExtractedData
  onGenerated?: (landingPage: GeneratedLandingPage) => void
  onSave?: (landingPage: GeneratedLandingPage) => void
}

export function CompleteLandingPageGenerator({ 
  businessInfo, 
  extractedData, 
  onGenerated,
  onSave 
}: CompleteLandingPageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedLandingPage, setGeneratedLandingPage] = useState<GeneratedLandingPage | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showSectionsModal, setShowSectionsModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [preferences, setPreferences] = useState({
    includeTestimonials: true,
    includeContactForm: true,
    includeSocialMedia: true,
    theme: 'modern',
    colorScheme: 'blue',
    layoutStyle: 'clean'
  })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const generateLandingPage = async () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    setError(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch(api('/ai/generate-dynamic-landing-page'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessInfo,
          extractedData,
          designType: extractedData.designType || 'pdf'
        })
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error('Failed to generate and save landing page')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Generation and save failed')
      }

      setGenerationProgress(100)
      
      // Extract sections from the nested response structure
      console.log('🔍 Extracting sections from response...')
      console.log('📊 Response data keys:', Object.keys(result.data))
      console.log('📊 LandingPageContent keys:', result.data.landingPageContent ? Object.keys(result.data.landingPageContent) : 'No landingPageContent')
      
      const sections = result.data.landingPageContent?.sections || 
                      result.data.sections || 
                      result.data.landingPageContent?.sections || 
                      []
      
      console.log('📝 Extracted sections:', sections)
      
      const landingPageData = {
        ...result.data,
        sections: sections,
        meta: result.data.landingPageContent?.meta || result.data.meta || {
          title: `${businessInfo.businessName} - Professional Services`,
          description: businessInfo.businessOverview,
          keywords: `${businessInfo.businessName}, services, ${businessInfo.targetAudience}`
        },
        generatedAt: new Date(),
        model: 'gemini-pro'
      }
      
      setGeneratedLandingPage(landingPageData)

      if (onGenerated) {
        onGenerated(landingPageData)
      }

      console.log('✅ Landing page generated and saved successfully:', landingPageData)
      console.log('🆔 Database ID:', result.data.id)
      console.log('📝 Sections found:', landingPageData.sections.length)
      console.log('📋 Sections data:', landingPageData.sections)
      console.log('🔍 Raw response structure:', result.data)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation and save failed')
      console.error('❌ Landing page generation and save failed:', err)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const downloadLandingPage = async () => {
    if (!generatedLandingPage) return

    try {
      // If we have a saved landing page with ID, use the download URL
      if (generatedLandingPage.id && generatedLandingPage.downloadUrl) {
        const response = await fetch(generatedLandingPage.downloadUrl, {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error('Download failed')
        }

        const htmlContent = await response.text()
        
        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `${businessInfo.businessName}-landing-page.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } else {
        // Fallback to the old method if no ID is available
        const response = await fetch(api('/ai/download-landing-page'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessInfo,
            extractedData,
            preferences
          })
        })

        if (!response.ok) {
          throw new Error('Download failed')
        }

        const htmlContent = await response.text()
        
        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `${businessInfo.businessName}-landing-page.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      }

    } catch (err) {
      console.error('Download failed:', err)
      setError('Download failed')
    }
  }

  const handleSectionsSave = async (editedSections: LandingPageSection[]) => {
    if (!generatedLandingPage) return

    // Update the generated landing page with edited sections
    const updatedLandingPage = {
      ...generatedLandingPage,
      sections: editedSections
    }

    setGeneratedLandingPage(updatedLandingPage)

    // Update localStorage with the edited sections
    localStorage.setItem('latestLandingPage', JSON.stringify({
      ...updatedLandingPage,
      lastUpdated: Date.now()
    }))

    console.log('✅ Sections updated successfully')
  }

  const saveToDatabase = async () => {
    if (!generatedLandingPage) return

    // Check for latest edited sections in localStorage before saving
    const savedData = localStorage.getItem('latestLandingPage')
    let finalLandingPage = generatedLandingPage
    
    if (savedData) {
      try {
        const latestData = JSON.parse(savedData)
        if (latestData.sections && Array.isArray(latestData.sections)) {
          finalLandingPage = {
            ...generatedLandingPage,
            sections: latestData.sections
          }
          console.log('✅ Using latest edited sections for database save:', latestData.sections.length)
        }
      } catch (error) {
        console.error('Failed to load latest sections from localStorage:', error)
      }
    }

    // If the landing page already has an ID, it's already saved
    if (finalLandingPage.id) {
      console.log('✅ Landing page already saved to database with ID:', finalLandingPage.id)
      if (onSave) {
        onSave(finalLandingPage)
      }
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(api('/landing-pages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalLandingPage)
      })

      if (!response.ok) {
        throw new Error('Failed to save landing page')
      }

      const result = await response.json()

      if (onSave) {
        onSave(finalLandingPage)
      }

      console.log('✅ Landing page saved successfully:', result)

    } catch (err) {
      console.error('Save failed:', err)
      setError('Failed to save landing page')
    } finally {
      setIsSaving(false)
    }
  }

  const renderSectionPreview = (section: LandingPageSection) => {
    return (
      <div key={section.id} className="mb-4 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900">{section.title}</h4>
          <Badge variant="secondary">{section.type}</Badge>
        </div>
        <div 
          className="text-sm text-gray-600 max-h-20 overflow-hidden"
          dangerouslySetInnerHTML={{ 
            __html: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : '') 
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle>Generate Complete Landing Page</CardTitle>
          </div>
          <CardDescription>
            Create a professional landing page based on your business information and extracted design data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Business: {businessInfo.businessName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Target: {businessInfo.targetAudience}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Tone: {businessInfo.brandTone || 'Professional'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Extracted Sections: {extractedData.sections?.length || 0}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Design Type: {extractedData.designType || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Generation Preferences</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.includeTestimonials}
                  onChange={(e) => setPreferences(prev => ({ ...prev, includeTestimonials: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Testimonials</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.includeContactForm}
                  onChange={(e) => setPreferences(prev => ({ ...prev, includeContactForm: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Contact Form</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={preferences.includeSocialMedia}
                  onChange={(e) => setPreferences(prev => ({ ...prev, includeSocialMedia: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Social Media</span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateLandingPage}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Landing Page...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Complete Landing Page
              </>
            )}
          </Button>

          {/* Progress */}
          {isGenerating && (
            <div className="mt-4">
              <Progress value={generationProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2 text-center">
                {generationProgress < 30 && "Analyzing business information..."}
                {generationProgress >= 30 && generationProgress < 60 && "Processing extracted data..."}
                {generationProgress >= 60 && generationProgress < 90 && "Generating section-wise content..."}
                {generationProgress >= 90 && "Finalizing landing page sections..."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Landing Page */}
      {generatedLandingPage && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Landing Page Generated & Saved Successfully</span>
                  </CardTitle>
                  <CardDescription>
                    {generatedLandingPage.sections.length} sections created with {generatedLandingPage.model}
                    {generatedLandingPage.id && (
                      <span className="ml-2 text-blue-600">• Saved to database (ID: {generatedLandingPage.id})</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSectionsModal(true)}
                    title="View generated sections"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Sections
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadLandingPage}
                    title="Download as HTML file"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>

                  <Button
                    size="sm"
                    onClick={saveToDatabase}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {generatedLandingPage.sections.length}
                    </div>
                    <div className="text-sm text-gray-600">Sections</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {generatedLandingPage.sections.filter(s => s.type === 'hero').length}
                    </div>
                    <div className="text-sm text-gray-600">Hero Sections</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {generatedLandingPage.sections.filter(s => s.type === 'cta').length}
                    </div>
                    <div className="text-sm text-gray-600">CTAs</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Generated Sections Preview</h4>
                  <div className="space-y-2">
                    {generatedLandingPage.sections.slice(0, 3).map(renderSectionPreview)}
                    {generatedLandingPage.sections.length > 3 && (
                      <div className="text-center text-sm text-gray-500">
                        +{generatedLandingPage.sections.length - 3} more sections
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Step: View Generated Sections */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-800">
                <Sparkles className="h-5 w-5" />
                <span>Step 2: Review Generated Content</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Your AI-generated landing page sections are ready! Click below to view all generated content in a beautiful, organized format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Generated Sections Ready</h4>
                      <p className="text-sm text-gray-600">
                        {generatedLandingPage.sections.length} sections with AI-generated content for {businessInfo.businessName}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowSectionsModal(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View All Sections
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {generatedLandingPage.sections.slice(0, 4).map((section, index) => (
                    <div key={section.id} className="bg-white p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{section.type}</Badge>
                      </div>
                      <h5 className="font-medium text-sm text-gray-900 mb-1">{section.title}</h5>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {section.content.substring(0, 60)}...
                      </p>
                    </div>
                  ))}
                  {generatedLandingPage.sections.length > 4 && (
                    <div className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          +{generatedLandingPage.sections.length - 4}
                        </div>
                        <div className="text-xs text-gray-600">More sections</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Generated Sections Modal */}
      <GeneratedSectionsModal
        isOpen={showSectionsModal}
        onClose={() => setShowSectionsModal(false)}
        landingPage={generatedLandingPage}
        businessInfo={businessInfo}
        isEditable={true}
        onSave={handleSectionsSave}
      />
    </div>
  )
}
