"use client"

import { useState, useEffect } from "react"
import { Upload, FileText, Link, Loader2, CheckCircle, Figma, FileImage, Sparkles, ArrowRight, X, AlertCircle, AlertTriangle, Eye, Download, ExternalLink, Globe, Calendar, Building2, EyeIcon, ListChecks, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip } from "@/components/ui/tooltip"
import { Divider } from "@/components/ui/divider"
import { UrlInputCard } from "@/components/ui/url-input-card"
import { FileUploadCard } from "@/components/ui/file-upload-card"
import { SectionHeader } from "@/components/ui/section-header"
import { BusinessDetailsForm } from "./BusinessDetailsForm"
import { ComprehensiveAnalysisDisplay } from "./ComprehensiveAnalysisDisplay"
import { FilteredAnalysisDisplay } from "./FilteredAnalysisDisplay"
import { GeneratedSectionsModal } from "./GeneratedSectionsModal"
import { api } from "@/lib/utils"
import { UploadFile } from "@/types"
import { PDFProcessor, PDFAnalysisResult, PDFSection } from "./PDFProcessor"
import { FigmaProcessor, FigmaAnalysisResult, FigmaSection } from "./FigmaProcessor"
import { apiService } from "@/lib/api"
import { filterDirectResponse } from "@/utils/filterAnalysis"
import React from "react"

// URL Analysis Types
interface URLAnalysisResult {
  success: boolean
  sections: URLSection[]
  sourceUrl: string
}

interface URLSection {
  name: string
  components: {
    title?: string
    subtitle?: string
    content?: string
    buttons?: string[]
    images?: string[]
    links?: string[]
    messages?: string[]
    items?: string[]
    forms?: string[]
    ctas?: string[]
    navigation?: string[]
    testimonials?: string[]
    pricing?: string[]
    features?: string[]
  }
}

interface UploadDesignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (landingPage: any) => void
}

export function UploadDesignModal({ isOpen, onClose, onSuccess }: UploadDesignModalProps) {
  const [step, setStep] = useState<"upload" | "sections-review" | "business-details" | "preview" | "sections-view" | "complete">("upload")
  const [uploadFile, setUploadFile] = useState<UploadFile | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [pdfAnalysis, setPdfAnalysis] = useState<PDFAnalysisResult | null>(null)
  const [extractedSections, setExtractedSections] = useState<PDFSection[]>([])
  const [figmaAnalysis, setFigmaAnalysis] = useState<FigmaAnalysisResult | null>(null)
  const [extractedFigmaSections, setExtractedFigmaSections] = useState<FigmaSection[]>([])
  const [urlAnalysis, setUrlAnalysis] = useState<URLAnalysisResult | null>(null)
  const [extractedUrlSections, setExtractedUrlSections] = useState<URLSection[]>([])
  const [error, setError] = useState<string | null>(null)
  const [finalSections, setFinalSections] = useState<any[]>([])
  const [businessDetails, setBusinessDetails] = useState<any>(null)

  const handleFileUpload = async (file: File) => {
    
    // Always treat as PDF for now since we're focusing on PDF processing
    setUploadFile({ type: "pdf", file })
    setIsProcessing(true)
    setProcessingProgress(0)
    
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
      await processPDFDesign(file)
    } else {
      // Use same timing as PDF processing for consistency
      simulateProcessing()
    }
  }

  const processPDFDesign = async (file: File) => {
    // Set processing state and let PDFProcessor handle the actual processing
    setIsProcessing(true)
    setProcessingProgress(0)
    
    // The PDFProcessor component will handle the actual processing
    // We just need to stay in the processing step
  }

  const handleFigmaUrl = (url: string) => {
    setUploadFile({ type: "figma", url })
    setIsProcessing(true) // Start processing immediately - same as PDF
    setProcessingProgress(0)
  }

  const handleWebsiteUrl = (url: string) => {
    setUploadFile({ type: "url", url })
    setIsProcessing(true) // Start processing immediately - same as PDF
    setProcessingProgress(0)
  }

  const handlePDFAnalysisComplete = (result: PDFAnalysisResult) => {
    console.log('PDF Analysis Complete - Result:', result)
    console.log('PDF Analysis Complete - Sections:', result.sections)
    
    setPdfAnalysis(result)
    setIsProcessing(false) // Processing complete
    
    // Preserve all sections from the analysis
    if (result.sections && result.sections.length > 0) {
      console.log('Setting extracted sections:', result.sections)
      // Store all sections without filtering
      setExtractedSections(result.sections)
    } else {
      console.log('No sections found in result')
      setExtractedSections([])
    }
    
    // Auto-progress to sections review after processing is complete
    setStep("sections-review")
  }

  const handlePDFAnalysisError = (error: string) => {
    setError(error)
    setIsProcessing(false) // Processing failed
    // Set empty sections on error
    setExtractedSections([])
    // Still allow user to continue to sections review
    setStep("sections-review")
  }

  const handleFigmaAnalysisComplete = (result: FigmaAnalysisResult) => {
    
    setFigmaAnalysis(result)
    setExtractedFigmaSections(result.sections)
    setIsProcessing(false) // Processing complete
    
    setError(null) // Clear any previous errors
    
    // Auto-progress to sections review after processing is complete
    setStep("sections-review")
  }

  const handleFigmaAnalysisError = (error: string) => {
    setError(error)
    setIsProcessing(false) // Processing failed
    // Set empty sections on error
    setExtractedFigmaSections([])
    // Still allow user to continue to sections review
    setStep("sections-review")
  }

  const handleURLAnalysisComplete = (result: URLAnalysisResult) => {
    console.log('URL Analysis Complete - Result:', result)
    console.log('URL Analysis Complete - Sections:', result.sections)
    
    setUrlAnalysis(result)
    setIsProcessing(false) // Processing complete
    
    // Preserve all sections from the analysis
    if (result.sections && result.sections.length > 0) {
      console.log('Setting extracted URL sections:', result.sections)
      // Store all sections without filtering
      setExtractedUrlSections(result.sections)
      
      // Save to localStorage for landing page generation
      try {
        const designStructure = {
          sections: result.sections,
          sectionTypes: result.sections.map((section: any) => section.name),
          sourceType: 'url',
          sourceUrl: result.sourceUrl,
          extractedAt: new Date().toISOString()
        }
        localStorage.setItem('extractedDesignStructure', JSON.stringify(designStructure))
        console.log('URL analysis results saved to localStorage')
      } catch (error) {
        console.error('Failed to save URL analysis to localStorage:', error)
      }
    } else {
      console.log('No sections found in URL result')
      setExtractedUrlSections([])
    }
    
    // Auto-progress to sections review after processing is complete
    setStep("sections-review")
  }

  const handleURLAnalysisError = (error: string) => {
    setError(error)
    setIsProcessing(false) // Processing failed
    // Set empty sections on error
    setExtractedUrlSections([])
    // Still allow user to continue to sections review
    setStep("sections-review")
  }

  const simulateProcessing = () => {
    // This function is no longer needed since we use real PDF/Figma processors
    // Auto-progression is handled by the actual analysis completion handlers
  }

  const handleBusinessDetailsSubmit = async (details: any) => {
    // Store business details for later use in createLandingPage
    setBusinessDetails(details)
    
    // Store in window context for PreviewStep to access
    ;(window as any).modalBusinessDetails = details
    ;(window as any).modalExtractedData = {
      sections: uploadFile?.type === 'figma' ? extractedFigmaSections : 
                uploadFile?.type === 'url' ? extractedUrlSections : 
                extractedSections
    }
    ;(window as any).modalDesignType = uploadFile?.type || 'unknown'
    
    // Move directly to preview step
    setStep("preview")
  }


  const createLandingPage = async () => {
    try {
      
      // Get the actual extracted sections from the appropriate source
      let extractedSectionsData = uploadFile?.type === 'figma' ? extractedFigmaSections : extractedSections
      
      // Process and enhance sections with business information
      const enhancedSections = await processSectionsWithBusinessInfo(extractedSectionsData, businessDetails)
      
      // Create landing page with real data
      const newPage = {
        id: Date.now().toString(),
        title: businessDetails?.businessName ? 
          (businessDetails.businessName.length > 80 ? 
            `${businessDetails.businessName.substring(0, 80)}... Landing Page` : 
            `${businessDetails.businessName} Landing Page`).substring(0, 100) : 
          `Landing Page ${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Include business details
        businessName: businessDetails?.businessName || '',
        businessOverview: businessDetails?.businessOverview || '',
        targetAudience: businessDetails?.targetAudience || '',
        brandTone: businessDetails?.brandTone || 'professional',
        customContentLength: businessDetails?.customContentLength || 150,
        // Use enhanced sections with real content
        sections: enhancedSections,
        designSource: {
          type: uploadFile?.type || 'unknown',
          url: uploadFile?.url || '',
          fileName: uploadFile?.file?.name || '',
          processedAt: new Date()
        },
        // Include analysis metadata
        analysisData: {
          pdfAnalysis: pdfAnalysis,
          figmaAnalysis: figmaAnalysis,
          totalSections: enhancedSections.length,
          designType: uploadFile?.type
        }
      }
      
      
      // Call onSuccess to create the landing page
      onSuccess(newPage)
      
    } catch (error) {
      // Create a fallback landing page with available data
      const fallbackSections = createFallbackSections(businessDetails, uploadFile?.type)
      
      const newPage = {
        id: Date.now().toString(),
        title: businessDetails?.businessName ? 
          (businessDetails.businessName.length > 80 ? 
            `${businessDetails.businessName.substring(0, 80)}... Landing Page` : 
            `${businessDetails.businessName} Landing Page`).substring(0, 100) : 
          `Landing Page ${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        businessName: businessDetails?.businessName || '',
        businessOverview: businessDetails?.businessOverview || '',
        targetAudience: businessDetails?.targetAudience || '',
        brandTone: businessDetails?.brandTone || 'professional',
        sections: fallbackSections,
        designSource: {
          type: uploadFile?.type || 'unknown',
          url: uploadFile?.url || '',
          fileName: uploadFile?.file?.name || '',
          processedAt: new Date()
        }
      }
      
      onSuccess(newPage)
    }
  }

  // Helper function to process sections with business information
  const processSectionsWithBusinessInfo = async (sections: any[], businessInfo: any) => {
    
    if (!sections || sections.length === 0) {
      return createBusinessFocusedSections(businessInfo)
    }
    
    return sections.map((section, index) => {
      // Enhance section content with business information
      const enhancedContent = enhanceSectionContent(section, businessInfo)
      
      return {
        id: section.id || `section-${index + 1}`,
        type: section.type || 'content',
        title: section.title || section.name || `Section ${index + 1}`,
        content: enhancedContent,
        order: section.order || index + 1,
        pageNumber: section.pageNumber || 1,
        depth: section.depth || 1,
        // Preserve original section data
        originalData: section,
        // Add business context
        businessContext: {
          businessName: businessInfo?.businessName,
          targetAudience: businessInfo?.targetAudience,
          brandTone: businessInfo?.brandTone
        }
      }
    })
  }

  // Helper function to enhance section content with business information
  const enhanceSectionContent = (section: any, businessInfo: any) => {
    if (!section.content || section.content.trim().length === 0) {
      // Create content based on section type and business info
      return generateContentForSection(section, businessInfo)
    }
    
    // Check if content is a generic placeholder that should be replaced
    const isGenericPlaceholder = /^Content for .+ section$/i.test(section.content.trim())
    
    if (isGenericPlaceholder) {
      // Replace generic placeholder with business-specific content
      return generateContentForSection(section, businessInfo)
    }
    
    // Enhance existing content with business context
    let enhancedContent = section.content
    
    // Replace generic placeholders with business-specific content
    if (businessInfo?.businessName) {
      enhancedContent = enhancedContent.replace(/\[Business Name\]/g, businessInfo.businessName)
      enhancedContent = enhancedContent.replace(/\[Company Name\]/g, businessInfo.businessName)
    }
    
    if (businessInfo?.businessOverview) {
      enhancedContent = enhancedContent.replace(/\[Business Overview\]/g, businessInfo.businessOverview)
      enhancedContent = enhancedContent.replace(/\[Company Description\]/g, businessInfo.businessOverview)
    }
    
    if (businessInfo?.targetAudience) {
      enhancedContent = enhancedContent.replace(/\[Target Audience\]/g, businessInfo.targetAudience)
    }
    
    return enhancedContent
  }

  // Helper function to generate content for sections without content
  const generateContentForSection = (section: any, businessInfo: any) => {
    const businessName = businessInfo?.businessName || 'Your Business'
    const businessOverview = businessInfo?.businessOverview || 'We provide excellent services to our customers'
    const targetAudience = businessInfo?.targetAudience || 'our valued customers'
    const targetWordCount = businessInfo?.customContentLength || 150
    
    // Base content templates
    const baseContent = {
      hero: `Welcome to ${businessName}! ${businessOverview}. We're here to serve ${targetAudience} with exceptional quality and service.`,
      about: `About ${businessName}: ${businessOverview}. We are committed to providing the best experience for ${targetAudience}.`,
      services: `Our Services: At ${businessName}, we offer a comprehensive range of services designed to meet the needs of ${targetAudience}. ${businessOverview}.`,
      contact: `Contact ${businessName}: Ready to get started? We'd love to hear from ${targetAudience}. Get in touch with us today!`,
      features: `Why Choose ${businessName}? We provide exceptional value to ${targetAudience} through our commitment to quality and innovation.`,
      default: `${businessName} - ${businessOverview}. We're dedicated to serving ${targetAudience} with excellence.`
    }
    
    // Get base content for section type
    const sectionType = section.type?.toLowerCase() as keyof typeof baseContent
    let content = baseContent[sectionType] || baseContent.default
    
    // Adjust content length based on target word count
    const currentWordCount = content.split(' ').length
    
    if (currentWordCount < targetWordCount) {
      // Expand content to reach target word count
      const additionalWords = targetWordCount - currentWordCount
      const expansion = ` Our team is dedicated to delivering exceptional results and exceeding expectations. We pride ourselves on our commitment to quality, innovation, and customer satisfaction. With years of experience and expertise, we ensure that every project meets the highest standards.`
      
      // Add expansion text to reach target length
      const expansionWords = expansion.split(' ')
      const wordsToAdd = Math.min(additionalWords, expansionWords.length)
      const additionalText = expansionWords.slice(0, wordsToAdd).join(' ')
      
      content = content + additionalText
    } else if (currentWordCount > targetWordCount) {
      // Truncate content to target word count
      const words = content.split(' ')
      content = words.slice(0, targetWordCount).join(' ')
    }
    
    return content
  }

  // Helper function to create business-focused sections when no sections are extracted
  const createBusinessFocusedSections = (businessInfo: any) => {
    const businessName = businessInfo?.businessName || 'Your Business'
    const businessOverview = businessInfo?.businessOverview || 'We provide excellent services to our customers'
    const targetAudience = businessInfo?.targetAudience || 'our valued customers'
    
    // Create sections with proper content length
    const heroSection = {
      id: 'hero-section',
      type: 'hero',
      title: `Welcome to ${businessName}`,
      content: generateContentForSection({ type: 'hero' }, businessInfo),
      order: 1,
      pageNumber: 1,
      businessContext: {
        businessName: businessInfo?.businessName,
        targetAudience: businessInfo?.targetAudience,
        brandTone: businessInfo?.brandTone
      }
    }
    
    const aboutSection = {
      id: 'about-section',
      type: 'about',
      title: `About ${businessName}`,
      content: generateContentForSection({ type: 'about' }, businessInfo),
      order: 2,
      pageNumber: 1,
      businessContext: {
        businessName: businessInfo?.businessName,
        targetAudience: businessInfo?.targetAudience,
        brandTone: businessInfo?.brandTone
      }
    }
    
    const servicesSection = {
      id: 'services-section',
      type: 'services',
      title: 'Our Services',
      content: generateContentForSection({ type: 'services' }, businessInfo),
      order: 3,
      pageNumber: 1,
      businessContext: {
        businessName: businessInfo?.businessName,
        targetAudience: businessInfo?.targetAudience,
        brandTone: businessInfo?.brandTone
      }
    }
    
    const contactSection = {
      id: 'contact-section',
      type: 'contact',
      title: 'Contact Us',
      content: generateContentForSection({ type: 'contact' }, businessInfo),
      order: 4,
      pageNumber: 1,
      businessContext: {
        businessName: businessInfo?.businessName,
        targetAudience: businessInfo?.targetAudience,
        brandTone: businessInfo?.brandTone
      }
    }
    
    return [heroSection, aboutSection, servicesSection, contactSection]
  }

  // Helper function to create fallback sections
  const createFallbackSections = (businessInfo: any, designType?: string) => {
    return createBusinessFocusedSections(businessInfo)
  }

  const resetModal = () => {
    setStep("upload")
    setUploadFile(null)
    setIsProcessing(false)
    setProcessingProgress(0)
    setPdfAnalysis(null)
    setFigmaAnalysis(null)
    setExtractedSections([])
    setExtractedFigmaSections([])
    setBusinessDetails(null)
    setFinalSections([])
    setError(null) // Clear any errors
  }

  const handleClose = () => {
    onClose()
    resetModal()
  }

  const dismissError = () => {
    setError(null)
  }





  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="md:max-w-4xl rounded-md max-w-[calc(100%-30px)] max-h-[91vh] overflow-y-auto">
        <DialogHeader className="text-left p-3 border-b">
          <DialogTitle className="font-semibold flex items-center flex-wrap gap-x-1">
            Create New Landing Page
          </DialogTitle>
          {step === "upload" && (
            <DialogDescription className="">
              Upload your design file or provide a Figma URL to get started with AI-powered content generation
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Enhanced Progress Steps with Icons and Names */}
        <div className="hidden md:flex items-center space-x-4 justify-center py-6">
          {[
            { id: "upload", name: "Upload", icon: Upload },
            { id: "sections-review", name: "Review", icon: ListChecks },
            { id: "business-details", name: "Details", icon: Building2 },
            { id: "preview", name: "Generate", icon: EyeIcon },
            { id: "sections-view", name: "Complete", icon: CheckCircle2 }
          ].map((stepConfig, index) => {
            const stepName = stepConfig.id;
            const stepDisplayName = stepConfig.name;
            const StepIcon = stepConfig.icon;
            const isCompleted = step === "complete" || ["upload", "sections-review", "business-details", "preview", "sections-view"].indexOf(step) > index;
            const isCurrent = step === stepName;
            const isPrevious = ["upload", "sections-review", "business-details", "preview", "sections-view"].indexOf(step) > index;
            
            return (
              <div key={stepName} className="flex items-center">
                <div className="flex flex-col items-center">
                  {/* Step Circle with Icon */}
                  <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 transform ${
                    isCurrent
                      ? "bg-b2 text-white scale-110 shadow-lg" 
                      : isCompleted
                      ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <StepIcon className={`w-5 h-auto ${isCurrent ? '' : ''}`} />
                    )}
                    
                  </div>
                  
                  {/* Step Name */}
                  <span className={`text-xs font-medium mt-2 transition-all duration-300 text-center max-w-20 leading-tight ${
                    isCurrent 
                      ? "text-b2 font-semibold" 
                      : isCompleted 
                      ? "text-gray-500" 
                      : "text-gray-500"
                  }`}>
                    {stepDisplayName}
                  </span>
                </div>
                
                {/* Connector Line */}
                {index < 4 && (
                  <div className={`w-20 bg-gray-200 h-1 mx-4 rounded-full transition-all duration-700 ${
                    isCompleted
                      ? "bg-gradient-to-r from-green-500 to-emerald-600"
                      : "bg-gray-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {step === "upload" && (
          <UploadStep
            onFileUpload={handleFileUpload}
            onFigmaUrl={handleFigmaUrl}
            onWebsiteUrl={handleWebsiteUrl}
            isProcessingFile={isProcessingFile}
            setIsProcessingFile={setIsProcessingFile}
            uploadFile={uploadFile}
            isProcessing={isProcessing}
            progress={processingProgress}
            pdfAnalysis={pdfAnalysis}
            figmaAnalysis={figmaAnalysis}
            urlAnalysis={urlAnalysis}
            onPDFAnalysisComplete={handlePDFAnalysisComplete}
            onPDFAnalysisError={handlePDFAnalysisError}
            onFigmaAnalysisComplete={handleFigmaAnalysisComplete}
            onFigmaAnalysisError={handleFigmaAnalysisError}
            onURLAnalysisComplete={handleURLAnalysisComplete}
            onURLAnalysisError={handleURLAnalysisError}
          />
        )}

        {step === "sections-review" && (
          <SectionsReviewStep
            pdfAnalysis={pdfAnalysis}
            figmaAnalysis={figmaAnalysis}
            urlAnalysis={urlAnalysis}
            extractedSections={extractedSections}
            onBack={() => setStep("upload")}
            onNext={() => {
              // User must manually click to proceed to business details
              setStep("business-details")
            }}
          />
        )}

        {step === "business-details" && (
          <BusinessDetailsForm
            onSubmit={(details) => {
              // User must manually click to proceed to preview step
              handleBusinessDetailsSubmit(details)
            }}
            onBack={() => setStep("sections-review")}
            extractedSections={uploadFile?.type === 'figma' ? extractedFigmaSections : extractedSections}
          />
        )}

        {step === "preview" && (
          <PreviewStep 
            onBack={() => setStep("business-details")}
            onNext={() => setStep("sections-view")}
          />
        )}

        {step === "sections-view" && (
          <SectionsViewStep 
            onBack={() => setStep("preview")}
            onNext={() => setStep("complete")}
          />
        )}

        {step === "complete" && (
          <CompleteStep 
            onClose={handleClose}
            onComplete={onSuccess}
            completionData={(() => {
            // Get the latest landing page data from localStorage
            try {
              const savedData = localStorage.getItem('latestLandingPage')
              return savedData ? JSON.parse(savedData) : null
            } catch (error) {
              console.error('Failed to load data from localStorage:', error)
              return null
            }
            })()}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}function UploadStep({ 
  onFileUpload, 
  onFigmaUrl,
  onWebsiteUrl,
  isProcessingFile,
  setIsProcessingFile,
  uploadFile,
  isProcessing,
  progress,
  pdfAnalysis,
  figmaAnalysis,
  urlAnalysis,
  onPDFAnalysisComplete,
  onPDFAnalysisError,
  onFigmaAnalysisComplete,
  onFigmaAnalysisError,
  onURLAnalysisComplete,
  onURLAnalysisError,
}: { 
  onFileUpload: (file: File) => void
  onFigmaUrl: (url: string) => void
  onWebsiteUrl: (url: string) => void
  isProcessingFile: boolean
  setIsProcessingFile: (isProcessing: boolean) => void
  uploadFile: UploadFile | null
  isProcessing: boolean
  progress: number
  pdfAnalysis?: PDFAnalysisResult | null
  figmaAnalysis?: FigmaAnalysisResult | null
  urlAnalysis?: URLAnalysisResult | null
  onPDFAnalysisComplete: (result: PDFAnalysisResult) => void
  onPDFAnalysisError: (error: string) => void
  onFigmaAnalysisComplete: (result: FigmaAnalysisResult) => void
  onFigmaAnalysisError: (error: string) => void
  onURLAnalysisComplete: (result: URLAnalysisResult) => void
  onURLAnalysisError: (error: string) => void
}) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [figmaUrl, setFigmaUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [processingStage, setProcessingStage] = React.useState<'upload' | 'ai-processing' | 'finalizing'>('upload')
  const [stageProgress, setStageProgress] = React.useState(0)
  const [currentStep, setCurrentStep] = React.useState('Initializing...')

  React.useEffect(() => {
    if (isProcessing && uploadFile) {
      // Real processing stages with actual timing - same for PDF and Figma
      const stages = [
        { name: 'upload', duration: 2000, step: 'Uploading file...' },
        { name: 'ai-processing', duration: 4000, step: 'AI analyzing design...' },
        { name: 'finalizing', duration: 2000, step: 'Finalizing sections...' }
      ]

      let currentStageIndex = 0
      const startStage = (stageIndex: number) => {
        if (stageIndex >= stages.length) return
        
        const stage = stages[stageIndex]
        setProcessingStage(stage.name as any)
        setCurrentStep(stage.step)
        setStageProgress(0)
        
        const interval = setInterval(() => {
          setStageProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval)
              if (stageIndex < stages.length - 1) {
                startStage(stageIndex + 1)
              }
              return 100
            }
            return prev + 2 // Consistent progress increment
          })
        }, stage.duration / 50) // Consistent timing
      }

      startStage(0)
    }
  }, [isProcessing, uploadFile])

  // Calculate real overall progress based on actual processing stages - same for PDF and Figma
  const overallProgress = React.useMemo(() => {
    if (!isProcessing) return 0
    
    const stageWeights = { upload: 0.25, 'ai-processing': 0.55, finalizing: 0.20 }
    const currentStageIndex = Object.keys(stageWeights).indexOf(processingStage)
    
    if (currentStageIndex === 0) {
      // Upload stage: 0-25%
      return (stageProgress / 100) * 25
    } else if (currentStageIndex === 1) {
      // AI Processing stage: 25-80%
      return 25 + (stageProgress / 100) * 55
    } else if (currentStageIndex === 2) {
      // Finalizing stage: 80-100%
      return 80 + (stageProgress / 100) * 20
    }
    
    return 0
  }, [isProcessing, processingStage, stageProgress])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      // Accept any file for now, let the processor handle it
      setSelectedFile(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
    }
  }

  const handleFileSubmit = async () => {
    if (selectedFile) {
      setIsProcessingFile(true)
      try {
        await onFileUpload(selectedFile)
        // Auto-progress to processing step is handled by onFileUpload
      } catch (error) {
        // Don't break the flow, just reset the processing state
        setIsProcessingFile(false)
      }
    }
  }

  const handleFigmaSubmit = () => {
    if (figmaUrl.trim()) {
      onFigmaUrl(figmaUrl.trim())
      // Auto-progress to processing step is handled by onFigmaUrl
    }
  }

  const handleWebsiteSubmit = () => {
    if (websiteUrl.trim()) {
      onWebsiteUrl(websiteUrl.trim())
      // Auto-progress to processing step is handled by onWebsiteUrl
    }
  }

  // Show processing UI when processing is active
  if (isProcessing) {
    // Check if analysis is complete but still in processing step
    const isAnalysisComplete = (pdfAnalysis && uploadFile?.type === 'pdf') || 
                              (figmaAnalysis && uploadFile?.type === 'figma') ||
                              (urlAnalysis && uploadFile?.type === 'url')
    
    if (isAnalysisComplete) {
      // Check if any sections were actually extracted
      const hasSections = uploadFile?.type === 'pdf' 
        ? (pdfAnalysis?.sections && pdfAnalysis.sections.length > 0)
        : uploadFile?.type === 'figma'
        ? (figmaAnalysis?.sections && figmaAnalysis.sections.length > 0)
        : (urlAnalysis?.sections && urlAnalysis.sections.length > 0)
      
      if (hasSections) {
        // Show compact success state when sections were extracted
        return (
          <div className="px-6 pb-6">
            <Card className="max-w-lg mx-auto bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-200 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-3 md:flex-row flex-col">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="md:text-left text-center">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {uploadFile?.type === 'figma' ? 'Figma' : uploadFile?.type === 'url' ? 'Website' : 'PDF'} Analysis Complete!
                      </h3>
                      <p className="text-sm text-gray-600">
                        Successfully extracted {
                          uploadFile?.type === 'pdf' ? pdfAnalysis?.sections.length 
                          : uploadFile?.type === 'figma' ? figmaAnalysis?.sections.length
                          : urlAnalysis?.sections.length
                        } sections
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-white/40">
                    <p className="text-sm text-gray-700">
                      Ready to review extracted sections and continue to the next step.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      } else {
        // Show compact warning state when no sections were extracted
        return (
          <div className="px-6 pb-6">
            <Card className="max-w-lg mx-auto bg-gradient-to-br from-yellow-50 to-orange-50/50 border border-yellow-200 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-orange-200 rounded-full flex items-center justify-center shadow-lg">
                      <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-800">
                        No Content Found
                      </h3>
                      <p className="text-sm text-gray-600">
                        No sections extracted from {
                          uploadFile?.type === 'figma' ? 'Figma design' 
                          : uploadFile?.type === 'url' ? 'website' 
                          : 'PDF'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-white/40">
                    <p className="text-sm text-gray-700">
                      The file might be empty, contain only images, or have text that couldn't be extracted. You can still continue.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
    }
    
    // Show compact processing state
    return (
      <div className="px-6 pb-6">
        <Card className="max-w-lg mx-auto bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {/* Compact Processing Header */}
              <div className="flex items-center justify-center space-x-3">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-2 border-gray-200 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-1 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}>
                    <div className="w-full h-full rounded-full" style={{
                      background: 'conic-gradient(from 0deg, #565656, #565656, #dddddd)',
                      padding: '2px'
                    }}>
                      <div className="w-full h-full bg-b12 rounded-full"></div>
                    </div>
                  </div>
                  <div className="absolute inset-2 bg-b12 rounded-full flex items-center justify-center">
                    {uploadFile?.type === 'figma' ? (
                      <Figma className="w-4 h-4 text-b2" />
                    ) : (
                      <FileText className="w-4 h-4 text-b2" />
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Processing {uploadFile?.type === 'figma' ? 'Figma' : 'PDF'} Design
                  </h3>
                  <p className="text-sm text-gray-600">{currentStep}</p>
                </div>
              </div>
              
              {/* Compact Progress Bar */}
              <div className="space-y-2">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gray-800 to-gray-900 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>{Math.round(overallProgress)}% Complete</span>
                  <span className="capitalize">{processingStage.replace('-', ' ')}</span>
                </div>
              </div>
              
              {/* File Info */}
              <div className="bg-white/60 rounded-lg p-3 border border-white/40">
                <div className="flex items-center space-x-2 text-sm">
                  {uploadFile?.type === 'figma' ? (
                    <Figma className="w-4 h-4 text-gray-600" />
                  ) : uploadFile?.type === 'url' ? (
                    <Globe className="w-4 h-4 text-gray-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-gray-700 font-medium">
                    {uploadFile?.type === 'figma' || uploadFile?.type === 'url' ? uploadFile.url : uploadFile?.file?.name}
                  </span>
                  {uploadFile?.file && (
                    <span className="text-gray-500">({(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Hidden Processors - Handle actual processing without visual interference */}
        {isProcessing && uploadFile && (
          <div className="hidden">
            {uploadFile.type === "figma" && uploadFile.url && (
              <FigmaProcessor
                figmaUrl={uploadFile.url}
                onAnalysisComplete={onFigmaAnalysisComplete}
                onError={onFigmaAnalysisError}
              />
            )}
            
            {uploadFile.type === "pdf" && uploadFile.file && (
              <PDFProcessor
                file={uploadFile.file}
                onAnalysisComplete={onPDFAnalysisComplete}
                onError={onPDFAnalysisError}
              />
            )}

            {uploadFile.type === "url" && uploadFile.url && (
              <URLProcessor
                url={uploadFile.url}
                onAnalysisComplete={onURLAnalysisComplete}
                onError={onURLAnalysisError}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 md:px-6 pb-6">
      <UrlInputCard
        title="Website URL"
        description="Analyze any website to extract design structure and content"
        placeholder="https://example.com"
        value={websiteUrl}
        onChange={setWebsiteUrl}
        onSubmit={handleWebsiteSubmit}
        buttonText="Analyze"
        buttonIcon={<Globe className="h-4 w-4 mr-2" />}
        infoText="Our AI will scrape and analyze the website to extract design sections"
        icon={<Globe className="w-5 h-5 text-b2" />}
      />

      <Divider />

      <UrlInputCard
        title="Figma Design URL"
        description="Import your Figma design to extract layout and design elements"
        placeholder="https://www.figma.com/file/..."
        value={figmaUrl}
        onChange={setFigmaUrl}
        onSubmit={handleFigmaSubmit}
        buttonText="Import"
        buttonIcon={<Link className="h-4 w-4 mr-2" />}
        infoText="Our AI will scrape and analyze the website to extract design sections"
        icon={<Figma className="w-5 h-5 text-b2" />}
      />

      <Divider />

      <FileUploadCard
        title="Upload PDF File"
        description="Drag and drop your PDF or browse to upload"
        selectedFile={selectedFile}
        dragActive={dragActive}
        isProcessing={isProcessingFile}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onFileInput={handleFileInput}
        onFileSubmit={handleFileSubmit}
        onRemoveFile={() => setSelectedFile(null)}
        maxSizeText="Supports PDF files up to 10MB"
        icon={<FileImage className="w-5 h-5 text-b2" />}
      />
    </div>
  )
}


function SectionsReviewStep({
  pdfAnalysis,
  figmaAnalysis,
  urlAnalysis,
  extractedSections,
  onBack,
  onNext
}: {
  pdfAnalysis?: PDFAnalysisResult | null;
  figmaAnalysis?: FigmaAnalysisResult | null;
  urlAnalysis?: URLAnalysisResult | null;
  extractedSections?: any[];
  onBack: () => void;
  onNext: () => void;
}): JSX.Element {
  // Debug logging
  console.log('SectionsReviewStep - pdfAnalysis:', pdfAnalysis)
  console.log('SectionsReviewStep - figmaAnalysis:', figmaAnalysis)
  console.log('SectionsReviewStep - urlAnalysis:', urlAnalysis)
  
  // State for search/filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSections, setFilteredSections] = useState<any[]>([])
  
  // Filter sections based on search term
  useEffect(() => {
    const sections = pdfAnalysis?.sections || figmaAnalysis?.sections || urlAnalysis?.sections || extractedSections || []
    if (!searchTerm.trim()) {
      setFilteredSections(sections)
    } else {
      const filtered = sections.filter((section: any) => 
        section.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(section.components || {}).toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSections(filtered)
    }
  }, [searchTerm, pdfAnalysis, figmaAnalysis, urlAnalysis, extractedSections])
  
  // Helper function to count actual components with values
  const countActualComponents = (components: any) => {
    if (!components || typeof components !== 'object') return 0
    return Object.values(components).filter(value => 
      value !== null && 
      value !== undefined && 
      value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length
  }

  // Helper function to render section components
  const renderSectionComponents = (components: any) => {
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

    const componentTypes = [
      { key: 'title', label: 'Title', icon: '📝', color: 'gray', bgColor: 'gray-50', textColor: 'gray-700' },
      { key: 'subtitle', label: 'Subtitle', icon: '📄', color: 'purple', bgColor: 'purple-50', textColor: 'purple-700' },
      { key: 'content', label: 'Content', icon: '📋', color: 'green', bgColor: 'green-50', textColor: 'green-700' },
      { key: 'buttons', label: 'Buttons', icon: '🔘', color: 'orange', bgColor: 'orange-50', textColor: 'orange-700' },
      { key: 'images', label: 'Images', icon: '🖼️', color: 'indigo', bgColor: 'indigo-50', textColor: 'indigo-700' },
      { key: 'links', label: 'Links', icon: '🔗', color: 'cyan', bgColor: 'cyan-50', textColor: 'cyan-700' },
      { key: 'messages', label: 'Messages', icon: '💬', color: 'pink', bgColor: 'pink-50', textColor: 'pink-700' },
      { key: 'items', label: 'Items', icon: '📋', color: 'teal', bgColor: 'teal-50', textColor: 'teal-700' },
      { key: 'forms', label: 'Forms', icon: '📝', color: 'amber', bgColor: 'amber-50', textColor: 'amber-700' },
      { key: 'ctas', label: 'CTAs', icon: '🎯', color: 'red', bgColor: 'red-50', textColor: 'red-700' },
      { key: 'navigation', label: 'Navigation', icon: '🧭', color: 'violet', bgColor: 'violet-50', textColor: 'violet-700' },
      { key: 'testimonials', label: 'Testimonials', icon: '⭐', color: 'yellow', bgColor: 'yellow-50', textColor: 'yellow-700' },
      { key: 'pricing', label: 'Pricing', icon: '💰', color: 'emerald', bgColor: 'emerald-50', textColor: 'emerald-700' },
      { key: 'features', label: 'Features', icon: '✨', color: 'sky', bgColor: 'sky-50', textColor: 'sky-700' }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {componentTypes.map(({ key, label, icon, color, bgColor, textColor }) => {
          const value = components[key]
          if (!value) return null

          return (
            <div key={key} className={`bg-${bgColor} rounded-xl p-4 border border-${color}-200 hover:border-${color}-300 transition-colors duration-200`}>
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-8 h-8 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                  <span className="text-lg">{icon}</span>
                </div>
                <div>
                  <h6 className={`font-semibold text-${textColor} text-sm`}>{label}</h6>
                  <p className="text-xs text-gray-500">
                    {Array.isArray(value) ? `${value.length} items` : '1 item'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                {Array.isArray(value) ? (
                  <div className="space-y-2">
                    {value.map((item: any, idx: number) => {
                      // Handle complex objects (like items with title, content, author, etc.)
                      if (typeof item === 'object' && item !== null) {
                        return (
                          <div key={idx} className={`bg-white rounded-lg p-3 border border-${color}-200 space-y-2`}>
                            {item.title && (
                              <div className={`font-semibold text-${textColor} text-sm`}>
                                {String(item.title)}
                              </div>
                            )}
                            {item.content && (
                              <div className={`text-sm text-${textColor} opacity-90`}>
                                {String(item.content)}
                              </div>
                            )}
                            {item.author && (
                              <div className={`text-xs text-${textColor} opacity-75 font-medium`}>
                                — {String(item.author)}
                              </div>
                            )}
                            {item.role && (
                              <div className={`text-xs text-${textColor} opacity-60`}>
                                {String(item.role)}
                              </div>
                            )}
                            {item.plan_name && (
                              <div className={`font-semibold text-${textColor} text-sm`}>
                                {String(item.plan_name)} - {String(item.users || '')} - {String(item.price || '')}
                              </div>
                            )}
                            {item.type && (
                              <div className={`text-xs text-${textColor} opacity-60 mb-2`}>
                                Type: {String(item.type)}
                              </div>
                            )}
                            {item.features && Array.isArray(item.features) && (
                              <div className="space-y-1">
                                {item.features.map((feature: any, fIdx: number) => (
                                  <div key={fIdx} className={`text-xs text-${textColor} opacity-80 flex items-start space-x-2`}>
                                    <span className="text-green-500 mt-1">•</span>
                                    <span>{String(feature)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.buttons && Array.isArray(item.buttons) && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.buttons.map((btn: any, bIdx: number) => (
                                  <span key={bIdx} className={`text-xs bg-${color}-100 text-${textColor} px-2 py-1 rounded-full`}>
                                    {String(btn)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.question && (
                              <div className={`font-semibold text-${textColor} text-sm mb-1`}>
                                Q: {String(item.question)}
                              </div>
                            )}
                            {item.answer && (
                              <div className={`text-sm text-${textColor} opacity-90 ml-4`}>
                                A: {String(item.answer)}
                              </div>
                            )}
                          </div>
                        )
                      }
                      // Handle simple strings
                      return (
                        <div key={idx} className={`text-sm text-${textColor} bg-white rounded-lg p-3 border border-${color}-200`}>
                          {String(item)}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={`text-sm text-${textColor} bg-white rounded-lg p-3 border border-${color}-200 whitespace-pre-wrap`}>
                    {Array.isArray(value) ? (
                      <div className="space-y-2">
                        {value.map((item: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-gray-200 pl-3">
                            {String(item)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      String(value)
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

  return (
    <div>
      <SectionHeader
        icon={<ListChecks className="w-8 h-8" />}
        title="Review Extracted Sections"
        description="Review all the sections and design elements extracted from your design file before proceeding to the next step."
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* PDF Analysis Results */}
        {pdfAnalysis && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 md:bg-b12 rounded-xl flex items-center justify-center">
                    <FileText className="w-7 h-7 text-b2" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold">PDF Analysis Results</h4>
                    <p className="text-green-100 text-sm">Design sections extracted from your PDF</p>
                  </div>
                </div>
                <Badge className="bg-b12 text-b2 px-3 py-1.5 text-sm font-normal">
                  {pdfAnalysis.sections?.length || 0} Sections Found
              </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {!pdfAnalysis.sections || pdfAnalysis.sections.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-lg">No sections extracted from PDF</p>
                  <p className="text-sm text-gray-400 mt-2">The AI couldn't identify any sections in this file</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Section Counter and Search */}
                  <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-semibold text-gray-700">
                        {searchTerm ? `${filteredSections.length} of ${pdfAnalysis.sections.length}` : `All ${pdfAnalysis.sections.length}`} Sections Extracted
                      </h5>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>Scroll to view all sections</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search sections or components..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      />
                      <div className="absolute left-3 top-2.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {filteredSections.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-medium text-lg">No sections found</p>
                      <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms</p>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    filteredSections.map((section: any, index: number) => (
                    <div key={`${section.name || 'section'}-${index}`} className="group relative">
                      {/* Section Card */}
                      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
                        {/* Section Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center space-x-4 flex-wrap">
                            {/* Section Icon */}
                            <div className="relative">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-black text-xl font-bold shadow-xl border-2 group-hover:scale-110 transition-transform duration-300">
                                {section.name ? String(section.name).charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-b8 font-bold shadow-lg border">
                                {index + 1}
                              </div>
                            </div>
                            
                            {/* Section Info */}
                            <div className="flex-1">
                                <h6 className="text-xl font-bold text-gray-800 group-hover:text-green-700 transition-colors duration-200">
                                  {String(section.name || `Section ${index + 1}`)}
                                </h6>
                                <p className="text-sm text-gray-500 mt-1">
                                  {section.components && typeof section.components === 'object' 
                                    ? `${countActualComponents(section.components)} components extracted`
                                    : 'No components available'
                                  }
                                </p>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-gray-600 font-medium">Active</span>
                            </div>
                        </div>
                    </div>
                        
                        {/* Section Components */}
                        <div className="p-6">
                          {section.components && typeof section.components === 'object' ? 
                            renderSectionComponents(section.components) : 
                            <div className="text-center py-8">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-gray-400 text-lg">📝</span>
                </div>
                              <p className="text-sm text-gray-500 italic">No components available</p>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Figma Analysis Results */}
        {figmaAnalysis && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-semibold text-gray-800 flex items-center">
                <Figma className="w-6 h-6 mr-3 text-gray-600" />
                Figma Analysis Results
              </h4>
              <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                {figmaAnalysis.sections?.length || 0} Sections
              </Badge>
            </div>

            {/* All Sections List */}
            <div className="space-y-4">
              <h5 className="text-lg font-semibold text-gray-700 mb-4">Extracted Design Sections</h5>
              {!figmaAnalysis.sections || figmaAnalysis.sections.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Figma className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No sections extracted from Figma</p>
                  <p className="text-sm text-gray-400">The AI couldn't identify any sections in this design</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {figmaAnalysis.sections.map((section: any, index: number) => (
                    <div key={`figma-${section.id || section.name || section.title || 'section'}-${index}`} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-b12 rounded-lg flex items-center justify-center text-b2 text-sm font-bold">
                              {(section.title || section.name) ? (section.title || section.name).charAt(0).toUpperCase() : 'S'}
                            </div>
                            <h6 className="text-lg font-semibold text-gray-800">{section.title || section.name || `Section ${index + 1}`}</h6>
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                          
                          {/* Section Content */}
                          {section.content && (
                            <div className="ml-11">
                              <div className="flex items-start space-x-2">
                                <span className="text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded">Content:</span>
                                <span className="text-sm text-gray-700 line-clamp-2">{section.content}</span>
                          </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* URL Analysis Results */}
        {urlAnalysis && (
          <div className="bg-white rounded-2xl md:shadow-xl md:border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="md:px-6 md:pt-6">
              <div className="flex md:items-center items-start md:justify-between md:flex-row flex-col">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 md:bg-b12 rounded-xl flex items-center justify-center">
                    <Globe className="w-7 h-7 text-b2" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Website Analysis Results</h4>
                    <p className="text-b2 text-sm">Design sections extracted from {urlAnalysis.sourceUrl}</p>
                  </div>
                </div>
                <Badge className="bg-b12 text-b2 px-3 py-1.5 text-sm font-normal my-2 md:my-0">
                  {urlAnalysis.sections?.length || 0} Sections Found
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="md:p-8 p-2">
              {!urlAnalysis.sections || urlAnalysis.sections.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Globe className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-lg">No sections extracted from website</p>
                  <p className="text-sm text-gray-400 mt-2">The AI couldn't identify any sections on this website</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Search/Filter */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        placeholder="Search sections..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />                      
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="border bg-white text-b2 px-4 py-2 rounded-md hover:bg-b2 hover:text-white transition-all duration-200 text-sm"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>

                  {/* Sections List */}
                  {filteredSections.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No sections match your search criteria</p>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    filteredSections.map((section: any, index: number) => (
                      <div key={`${section.name || 'section'}-${index}`} className="group relative">
                        {/* Section Card */}
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
                          {/* Section Header */}
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center space-x-4 flex-wrap">
                              {/* Section Icon */}
                              <div className="relative">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-black text-xl font-bold shadow-xl border-2 group-hover:scale-110 transition-transform duration-300"
                                >
                                  {section.name ? String(section.name).charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-b8 font-bold shadow-lg border">
                                  {index + 1}
                                </div>
                              </div>
                              
                              {/* Section Info */}
                              <div className="flex-1">
                                <h6 className="text-xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-200">
                                  {String(section.name || `Section ${index + 1}`)}
                                </h6>
                                <p className="text-sm text-gray-500 mt-1">
                                  {section.components && typeof section.components === 'object' 
                                    ? `${countActualComponents(section.components)} components extracted`
                                    : 'No components available'
                                  }
                                </p>
                              </div>
                              
                              {/* Status Indicator */}
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Section Components */}
                          <div className="md:p-6 p-3">
                            {section.components && typeof section.components === 'object' ? 
                              renderSectionComponents(section.components) : 
                              <div className="text-center py-8">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <span className="text-gray-400 text-lg">📝</span>
                                </div>
                                <p className="text-sm text-gray-500 italic">No components available</p>
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Fallback: Show sections if they exist but main display failed */}
        {(!pdfAnalysis && !figmaAnalysis && !urlAnalysis) && extractedSections && extractedSections.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 md:bg-b12 rounded-xl flex items-center justify-center">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Extracted Sections</h4>
                    <p className="text-b2 text-sm">Design sections from your uploaded file</p>
                  </div>
                </div>
                <Badge className="bg-b12 px-3 py-1.5 text-sm font-normal">
                  {extractedSections.length} Sections Found
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Section Counter */}
                <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h5 className="text-lg font-semibold text-gray-700">
                      All {extractedSections.length} Sections Extracted
                    </h5>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>Scroll to view all sections</span>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                {extractedSections.map((section: any, index: number) => (
                  <div key={`extracted-${section.name || 'section'}-${index}`} className="group relative">
                    {/* Section Card */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 hover:border-gray-400 transition-all duration-300 hover:shadow-lg overflow-hidden">
                      {/* Section Header */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center space-x-4 flex-wrap">
                          {/* Section Icon */}
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-black text-xl font-bold shadow-xl border-2 group-hover:scale-110 transition-transform duration-300">
                              {section.name ? String(section.name).charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-b8 font-bold shadow-lg border">
                              {index + 1}
                            </div>
                          </div>
                          
                          {/* Section Info */}
                          <div className="flex-1">
                            <h6 className="text-xl font-bold text-gray-800 group-hover:text-gray-700 transition-colors duration-200">
                              {String(section.name || `Section ${index + 1}`)}
                            </h6>
                            <p className="text-sm text-gray-500 mt-1">
                              {section.components && typeof section.components === 'object' 
                                ? `${countActualComponents(section.components)} components extracted`
                                : 'No components available'
                              }
                            </p>
                          </div>
                          
                          {/* Status Indicator */}
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-gray-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-gray-600 font-medium">Active</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Section Components */}
                      <div className="p-6">
                        {section.components && typeof section.components === 'object' ? 
                          renderSectionComponents(section.components) : 
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="text-gray-400 text-lg">📝</span>
                            </div>
                            <p className="text-sm text-gray-500 italic">No components available</p>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Analysis Results */}
        {!pdfAnalysis && !figmaAnalysis && !urlAnalysis && (!extractedSections || extractedSections.length === 0) && (
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-gray-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No Analysis Results</h4>
              <p className="text-gray-600 mb-4">No design analysis results are available at the moment.</p>
              <p className="text-sm text-gray-500">You can still proceed to the next step to continue with your landing page creation.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-center md:space-x-4 flex-col md:flex-row space-y-4 md:space-y-0">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="px-5 py-2 border bg-white hover:bg-b2 hover:text-white transition-all duration-200 font-medium"
        >
          ← Back to Upload
        </Button>
        <Button 
          onClick={onNext} 
          className="px-5 py-2 bg-b2 text-white transition-all duration-200 font-medium hover:bg-b5"
        >
          Go to Next Step →
        </Button>
      </div>
    </div>
  );
}



const PreviewStep = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generatedLandingPage, setGeneratedLandingPage] = useState<any>(null)
  const [generationComplete, setGenerationComplete] = useState(false)

  const handleGenerateLandingPage = async () => {
    setIsGenerating(true)
    try {
      // Get business details and extracted data from the modal context
      const businessDetails = (window as any).modalBusinessDetails || {}
      const extractedData = (window as any).modalExtractedData || {}
      const designType = (window as any).modalDesignType || 'unknown'
      
      // Get extracted design structure from localStorage if available
      const extractedDesignStructure = localStorage.getItem('extractedDesignStructure')
      if (extractedDesignStructure) {
        try {
          const designStructure = JSON.parse(extractedDesignStructure)
          // Merge the design structure with extracted data
          extractedData.sections = designStructure.sections
          extractedData.sectionTypes = designStructure.sectionTypes
        } catch (error) {
          console.error('Error parsing extracted design structure:', error)
        }
      }


      const response = await fetch(api('/ai/generate-dynamic-landing-page'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessInfo: businessDetails,
          extractedData: extractedData,
          designType: designType
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setGeneratedLandingPage(result.data.landingPageContent)
        setGenerationComplete(true)
        // Automatically save to localStorage for immediate access
        const previewData = {
          id: result.data.id || 'generated-landing-page', // Use the actual database ID
          title: result.data.landingPageContent.meta?.title || 'Generated Landing Page',
          businessName: (window as any).modalBusinessDetails?.businessName || 'Your Business',
          businessOverview: (window as any).modalBusinessDetails?.businessOverview || 'Professional services',
          targetAudience: (window as any).modalBusinessDetails?.targetAudience || 'General customers',
          brandTone: (window as any).modalBusinessDetails?.brandTone || 'Professional',
          sections: result.data.landingPageContent.sections || [],
          customCSS: result.data.landingPageContent.css || '',
          customJS: result.data.landingPageContent.js || '',
          meta: result.data.landingPageContent.meta || {},
          generatedAt: new Date().toISOString(),
          model: 'gemini-pro',
          completeHTML: result.data.landingPageContent.html || '',
          lastUpdated: Date.now()
        }
        
        // Use regular localStorage for now to avoid async import issues
        localStorage.setItem('latestLandingPage', JSON.stringify(previewData))
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    } catch (error) {
      alert('Failed to generate landing page. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = async () => {
    if (!generatedLandingPage) {
      alert('Please generate the landing page first!')
      return
    }

    setIsPreviewing(true)
    try {
      // Save the generated landing page to localStorage for preview
      const previewData = {
        id: 'generated-landing-page',
        title: generatedLandingPage.meta?.title || 'Generated Landing Page',
        businessName: (window as any).modalBusinessDetails?.businessName || 'Your Business',
        businessOverview: (window as any).modalBusinessDetails?.businessOverview || 'Professional services',
        targetAudience: (window as any).modalBusinessDetails?.targetAudience || 'General customers',
        brandTone: (window as any).modalBusinessDetails?.brandTone || 'Professional',
        sections: generatedLandingPage.sections || [],
        customCSS: generatedLandingPage.css || '',
        customJS: generatedLandingPage.js || '',
        meta: generatedLandingPage.meta || {},
        generatedAt: new Date().toISOString(),
        model: 'gemini-pro',
        // Store the complete HTML for preview
        completeHTML: generatedLandingPage.html || '',
        // Add timestamp to ensure fresh data
        lastUpdated: Date.now()
      }

      // Use regular localStorage for now to avoid async import issues
      localStorage.setItem('latestLandingPage', JSON.stringify(previewData))
      setPreviewUrl('/preview/landing-page')
    } catch (error) {
      console.error('Preview generation failed:', error)
    } finally {
      setIsPreviewing(false)
    }
  }


  return (
    <div className="text-center py-6 px-6">
      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4 shadow-lg">
        <Eye className="w-8 h-8 text-gray-600" />
      </div>
      
      <h3 className="text-2xl font-bold text-gray-800 mb-3">
        Generate & Preview Your Landing Page
      </h3>
      
      <p className="text-gray-600 mb-6 text-base max-w-lg mx-auto leading-relaxed">
        Generate a dynamic landing page using AI, then preview it before downloading.
      </p>

      <div className="max-w-md mx-auto space-y-4">
        {!generationComplete ? (
          <Button 
            onClick={handleGenerateLandingPage}
            disabled={isGenerating}
            className="border px-4 py-2 w-full bg-b2 text-white hover:bg-b5 hover:text-white transition-all duration-200"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Landing Page
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-center space-x-2 text-green-700 mb-3">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium max-md:text-left">Landing Page Generated!</span>
              </div>
              <p className="text-sm text-green-600 mb-3">
                Your dynamic landing page has been created using AI.
              </p>
            </div>
          </div>
        )}

        </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-center md:space-x-4 md:flex-row flex-col space-y-4 md:space-y-0">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="px-5 py-2 border bg-white hover:bg-b2 hover:text-white transition-all duration-200 font-medium"
        >
          ← Back to Business Details
        </Button>
        <Button 
          onClick={onNext}
          disabled={!generationComplete}
          className="px-5 py-2 bg-b2 text-white transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-b5"
        >
          <Eye className="h-4 w-4 mr-2" />
          Get Preview
        </Button>
      </div>
    </div>
  )
}

const SectionsViewStep = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  const [generatedLandingPage, setGeneratedLandingPage] = useState<any>(null)
  const [showSectionsModal, setShowSectionsModal] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Helper function to count actual components with values
  const countActualComponents = (components: any) => {
    if (!components || typeof components !== 'object') return 0
    return Object.values(components).filter(value => 
      value !== null && 
      value !== undefined && 
      value !== '' && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length
  }

  // Helper function to render section components
  const renderSectionComponents = (components: any) => {
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

    const componentTypes = [
      { key: 'title', label: 'Title', icon: '📝', color: 'gray', bgColor: 'gray-50', textColor: 'gray-700' },
      { key: 'subtitle', label: 'Subtitle', icon: '📄', color: 'purple', bgColor: 'purple-50', textColor: 'purple-700' },
      { key: 'content', label: 'Content', icon: '📋', color: 'green', bgColor: 'green-50', textColor: 'green-700' },
      { key: 'buttons', label: 'Buttons', icon: '🔘', color: 'orange', bgColor: 'orange-50', textColor: 'orange-700' },
      { key: 'images', label: 'Images', icon: '🖼️', color: 'indigo', bgColor: 'indigo-50', textColor: 'indigo-700' },
      { key: 'links', label: 'Links', icon: '🔗', color: 'cyan', bgColor: 'cyan-50', textColor: 'cyan-700' },
      { key: 'messages', label: 'Messages', icon: '💬', color: 'pink', bgColor: 'pink-50', textColor: 'pink-700' },
      { key: 'items', label: 'Items', icon: '📋', color: 'teal', bgColor: 'teal-50', textColor: 'teal-700' },
      { key: 'forms', label: 'Forms', icon: '📝', color: 'amber', bgColor: 'amber-50', textColor: 'amber-700' },
      { key: 'ctas', label: 'CTAs', icon: '🎯', color: 'red', bgColor: 'red-50', textColor: 'red-700' },
      { key: 'navigation', label: 'Navigation', icon: '🧭', color: 'violet', bgColor: 'violet-50', textColor: 'violet-700' },
      { key: 'testimonials', label: 'Testimonials', icon: '⭐', color: 'yellow', bgColor: 'yellow-50', textColor: 'yellow-700' },
      { key: 'pricing', label: 'Pricing', icon: '💰', color: 'emerald', bgColor: 'emerald-50', textColor: 'emerald-700' },
      { key: 'features', label: 'Features', icon: '✨', color: 'sky', bgColor: 'sky-50', textColor: 'sky-700' }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {componentTypes.map(({ key, label, icon, color, bgColor, textColor }) => {
          const value = components[key]
          if (!value) return null

          return (
            <div key={key} className={`bg-${bgColor} rounded-xl p-4 border border-${color}-200 hover:border-${color}-300 transition-colors duration-200`}>
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-8 h-8 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                  <span className="text-lg">{icon}</span>
                </div>
                <div>
                  <h6 className={`font-semibold text-${textColor} text-sm`}>{label}</h6>
                  <p className="text-xs text-gray-500">
                    {Array.isArray(value) ? `${value.length} items` : '1 item'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                {Array.isArray(value) ? (
                  <div className="space-y-2">
                    {value.map((item: any, idx: number) => {
                      // Handle complex objects (like items with title, content, author, etc.)
                      if (typeof item === 'object' && item !== null) {
                        return (
                          <div key={idx} className={`bg-white rounded-lg p-3 border border-${color}-200 space-y-2`}>
                            {item.title && (
                              <div className={`font-semibold text-${textColor} text-sm`}>
                                {String(item.title)}
                              </div>
                            )}
                            {item.content && (
                              <div className={`text-sm text-${textColor} opacity-90`}>
                                {String(item.content)}
                              </div>
                            )}
                            {item.author && (
                              <div className={`text-xs text-${textColor} opacity-75 font-medium`}>
                                — {String(item.author)}
                              </div>
                            )}
                            {item.role && (
                              <div className={`text-xs text-${textColor} opacity-60`}>
                                {String(item.role)}
                              </div>
                            )}
                            {item.plan_name && (
                              <div className={`font-semibold text-${textColor} text-sm`}>
                                {String(item.plan_name)} - {String(item.users || '')} - {String(item.price || '')}
                              </div>
                            )}
                            {item.type && (
                              <div className={`text-xs text-${textColor} opacity-60 mb-2`}>
                                Type: {String(item.type)}
                              </div>
                            )}
                            {item.features && Array.isArray(item.features) && (
                              <div className="space-y-1">
                                {item.features.map((feature: any, fIdx: number) => (
                                  <div key={fIdx} className={`text-xs text-${textColor} opacity-80 flex items-start space-x-2`}>
                                    <span className="text-green-500 mt-1">•</span>
                                    <span>{String(feature)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.description && (
                              <div className={`text-xs text-${textColor} opacity-80`}>
                                {String(item.description)}
                              </div>
                            )}
                          </div>
                        )
                      } else {
                        return (
                          <div key={idx} className={`bg-white rounded-lg p-3 border border-${color}-200`}>
                            <div className={`text-sm text-${textColor}`}>
                              {String(item)}
                            </div>
                          </div>
                        )
                      }
                    })}
                  </div>
                ) : (
                  <div className={`bg-white rounded-lg p-3 border border-${color}-200`}>
                    <div className={`text-sm text-${textColor}`}>
                      {String(value)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  const [downloadFormat, setDownloadFormat] = useState<'html' | 'zip'>('html')


  useEffect(() => {
    // Get the generated landing page data from localStorage
    const savedData = localStorage.getItem('latestLandingPage')
    if (savedData) {
      try {
        const landingPageData = JSON.parse(savedData)
        
        // Validate that we have the correct data structure
        if (landingPageData.sections && Array.isArray(landingPageData.sections)) {
          // Check if data is fresh (less than 1 hour old)
          const dataAge = Date.now() - (landingPageData.lastUpdated || 0)
          const oneHour = 60 * 60 * 1000
          
          if (dataAge > oneHour) {
            localStorage.removeItem('latestLandingPage')
            return
          }
          
          setGeneratedLandingPage(landingPageData)
        } else {
          localStorage.removeItem('latestLandingPage')
        }
      } catch (error) {
        // Clear corrupted data
        localStorage.removeItem('latestLandingPage')
      }
    }
  }, [])

  const handleSectionsSave = async (editedSections: any[]) => {
    if (!generatedLandingPage) return

    try {
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

      // Save to database if the landing page has an ID
      if (generatedLandingPage.id) {
        console.log('Saving sections to database for landing page:', generatedLandingPage.id)
        
        // Import the API service
        const { apiService } = await import('@/lib/api')
        
        // Transform sections to ensure they have the required fields for API validation
        const transformedSections = editedSections.map((section, index) => {
          // Ensure we have a valid ID
          const sectionId = section.id || `section-${index + 1}`
          
          // Ensure we have a name or title
          const sectionName = section.title || section.name || `Section ${index + 1}`
          
          // Ensure we have content
          let sectionContent = section.content || ''
          if (!sectionContent && section.components) {
            // Extract content from components if content field is empty
            const componentContent = Object.values(section.components)
              .filter(component => component && String(component).trim())
              .map(component => {
                if (Array.isArray(component)) {
                  return component.filter(item => item && String(item).trim()).join(' ')
                }
                return String(component).trim()
              })
              .join(' ')
            sectionContent = componentContent || `Content for ${sectionName}`
          }
          
          return {
            id: sectionId,
            name: sectionName,
            title: section.title || sectionName,
            type: section.type || 'content',
            content: sectionContent || `Content for ${sectionName}`,
            order: section.order || index + 1,
            pageNumber: section.pageNumber || 1,
            components: section.components || {},
            boundingBox: section.boundingBox || {
              x: 0,
              y: index * 200,
              width: 800,
              height: 200
            }
          }
        })
        
        console.log('Transformed sections for API:', transformedSections)
        
        // Call the API to update sections in the database
        let response
        try {
          response = await apiService.updateLandingPageSections(generatedLandingPage.id, transformedSections)
        } catch (apiError) {
          console.error('API call failed:', apiError)
          const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error'
          throw new Error(`API call failed: ${errorMessage}`)
        }
        
        if (response.success) {
          console.log('Successfully saved sections to database:', response.data)
          
          // Update the landing page with the response data from the database
          const dbUpdatedLandingPage = {
            ...updatedLandingPage,
            sections: response.data.sections,
            updatedAt: new Date()
          }
          
          setGeneratedLandingPage(dbUpdatedLandingPage)
          
          // Update localStorage with the database response
          localStorage.setItem('latestLandingPage', JSON.stringify({
            ...dbUpdatedLandingPage,
            lastUpdated: Date.now()
          }))
        } else {
          console.error('Failed to save sections to database:', response.error)
          console.error('Response details:', response)
          throw new Error(response.error || 'Failed to save sections to database')
        }
      } else {
        console.log('No landing page ID found, skipping database save')
      }
    } catch (error) {
      console.error('Error saving sections:', error)
      // Still update local state even if database save fails
      // The user can try to save again later
      throw error
    }
  }

  // Helper function to render section components for HTML download
  const renderSectionComponentsForHTML = (components: any) => {
    if (!components || typeof components !== 'object' || Object.keys(components).length === 0) {
      return '<div class="no-components">No components available</div>'
    }

    let html = '<div class="section-components">'
    
    // Define component types with their rendering logic
    const componentTypes = [
      { key: 'title', label: 'Title', icon: '📝', className: 'component-title' },
      { key: 'subtitle', label: 'Subtitle', icon: '📄', className: 'component-subtitle' },
      { key: 'content', label: 'Content', icon: '📋', className: 'component-content' },
      { key: 'buttons', label: 'Buttons', icon: '🔘', className: 'component-buttons' },
      { key: 'images', label: 'Images', icon: '🖼️', className: 'component-images' },
      { key: 'links', label: 'Links', icon: '🔗', className: 'component-links' },
      { key: 'messages', label: 'Messages', icon: '💬', className: 'component-messages' },
      { key: 'items', label: 'Items', icon: '📋', className: 'component-items' },
      { key: 'forms', label: 'Forms', icon: '📝', className: 'component-forms' },
      { key: 'ctas', label: 'CTAs', icon: '🎯', className: 'component-ctas' }
    ]

    componentTypes.forEach(({ key, label, icon, className }) => {
      const value = components[key]
      if (!value) return

      html += `<div class="component-group ${className}">`
      html += `<div class="component-header">`
      html += `<span class="component-icon">${icon}</span>`
      html += `<span class="component-label">${label}</span>`
      html += `</div>`
      html += `<div class="component-content">`

      if (Array.isArray(value)) {
        value.forEach((item: any, idx: number) => {
          if (typeof item === 'object' && item !== null) {
            html += `<div class="component-item">`
            
            // Handle different object structures
            if (item.title) {
              html += `<div class="item-title">${String(item.title).replace(/"/g, '&quot;')}</div>`
            }
            if (item.content) {
              html += `<div class="item-content">${String(item.content).replace(/"/g, '&quot;')}</div>`
            }
            if (item.description) {
              html += `<div class="item-description">${String(item.description).replace(/"/g, '&quot;')}</div>`
            }
            if (item.author) {
              html += `<div class="item-author">— ${String(item.author).replace(/"/g, '&quot;')}</div>`
            }
            if (item.role) {
              html += `<div class="item-role">${String(item.role).replace(/"/g, '&quot;')}</div>`
            }
            if (item.plan_name) {
              html += `<div class="item-plan">${String(item.plan_name).replace(/"/g, '&quot;')} - ${String(item.users || '').replace(/"/g, '&quot;')} - ${String(item.price || '').replace(/"/g, '&quot;')}</div>`
            }
            if (item.type) {
              html += `<div class="item-type">Type: ${String(item.type).replace(/"/g, '&quot;')}</div>`
            }
            if (item.features && Array.isArray(item.features)) {
              html += `<div class="item-features">`
              item.features.forEach((feature: any) => {
                html += `<div class="feature-item">• ${String(feature).replace(/"/g, '&quot;')}</div>`
              })
              html += `</div>`
            }
            if (item.buttons && Array.isArray(item.buttons)) {
              html += `<div class="item-buttons">`
              item.buttons.forEach((btn: any) => {
                html += `<span class="button-tag">${String(btn).replace(/"/g, '&quot;')}</span>`
              })
              html += `</div>`
            }
            if (item.question) {
              html += `<div class="item-question">Q: ${String(item.question).replace(/"/g, '&quot;')}</div>`
            }
            if (item.answer) {
              html += `<div class="item-answer">A: ${String(item.answer).replace(/"/g, '&quot;')}</div>`
            }
            if (item.url || item.src) {
              html += `<div class="item-url">URL: ${String(item.url || item.src).replace(/"/g, '&quot;')}</div>`
            }
            if (item.alt) {
              html += `<div class="item-alt">Alt: ${String(item.alt).replace(/"/g, '&quot;')}</div>`
            }
            
            html += `</div>`
          } else {
            // Handle simple strings
            html += `<div class="component-item simple">${String(item).replace(/"/g, '&quot;')}</div>`
          }
        })
      } else if (typeof value === 'string') {
        html += `<div class="component-item simple">${String(value).replace(/"/g, '&quot;')}</div>`
      } else if (typeof value === 'object' && value !== null) {
        html += `<div class="component-item">`
        if (value.title) {
          html += `<div class="item-title">${String(value.title).replace(/"/g, '&quot;')}</div>`
        }
        if (value.content) {
          html += `<div class="item-content">${String(value.content).replace(/"/g, '&quot;')}</div>`
        }
        if (value.description) {
          html += `<div class="item-description">${String(value.description).replace(/"/g, '&quot;')}</div>`
        }
        html += `</div>`
      }

      html += `</div></div>`
    })

    html += '</div>'
    return html
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Get the generated landing page data from localStorage
      const savedData = localStorage.getItem('latestLandingPage')
      if (!savedData) {
        throw new Error('No generated landing page found')
      }

      const landingPageData = JSON.parse(savedData)
      
      // Create HTML content with the same beautiful design as page.tsx
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${landingPageData.title || landingPageData.businessName || 'Landing Page'}</title>
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
            height: 180px; /* Optimized height */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            text-align: center;
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
            margin-bottom: 0.5rem;
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

        .section-card:hover .section-title {
            color: #000000;
            transform: translateY(-2px);
        }

        .section-card-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
        }

        .section-card-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            flex: 1;
            width: 100%;
        }

        .section-content {
            font-size: 0.85rem;
            color: #64748b;
            text-align: center;
            line-height: 1.4;
            position: relative;
            z-index: 2;
            margin-top: 0.75rem;
            max-width: 100%;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            padding: 0 0.5rem;
            word-wrap: break-word;
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
            padding: 1rem;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #000000;
        }

        .section-components-modal {
            margin-top: 2rem;
        }

        .section-components-modal h4 {
            color: #2d3748;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
        }

        .component-section {
            margin-bottom: 1.5rem;
            padding: 1rem;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .component-section h5 {
            color: #374151;
            margin-bottom: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
        }

        .component-item-modal {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
            line-height: 1.5;
        }

        .component-item-modal.simple {
            background: #f3f4f6;
            color: #374151;
        }

        .component-item-modal strong {
            color: #1f2937;
            font-weight: 600;
        }

        .component-item-modal em {
            color: #6b7280;
            font-style: italic;
        }

        .component-item-modal small {
            color: #9ca3af;
            font-size: 0.8rem;
        }

        .component-item-modal ul {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
        }

        .component-item-modal li {
            margin-bottom: 0.25rem;
        }

        .button-tag-modal {
            background: #dbeafe;
            color: #1e40af;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
            margin-right: 0.5rem;
            margin-bottom: 0.25rem;
            display: inline-block;
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
                height: 160px; /* Reduced height for tablet */
            }
            
            .section-icon {
                width: 45px;
                height: 45px;
                font-size: 1.1rem;
                margin-bottom: 0.5rem;
            }
            
            .section-title {
                font-size: 1.1rem;
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
                height: 140px; /* Reduced height for mobile */
            }
            
            .section-icon {
                width: 40px;
                height: 40px;
                font-size: 1rem;
                margin-bottom: 0.5rem;
            }
            
            .section-title {
                font-size: 1rem;
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
            <h1 class="business-name">${landingPageData.businessName || 'Your Business'}</h1>
        </header>

        <div class="content-section">
            <!-- Business Details Section -->
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
                            ${landingPageData.businessOverview ? `
                            <div class="info-item clickable" onclick="openBusinessModal('Business Overview', '${landingPageData.businessOverview.replace(/'/g, "\\'")}')">
                                <div class="info-label">Business Overview</div>
                                <div class="click-hint">Click to view content</div>
                            </div>
                            ` : ''}
                            ${landingPageData.targetAudience ? `
                            <div class="info-item clickable" onclick="openBusinessModal('Target Audience', '${landingPageData.targetAudience.replace(/'/g, "\\'")}')">
                                <div class="info-label">Target Audience</div>
                                <div class="click-hint">Click to view content</div>
                            </div>
                            ` : ''}
                            ${landingPageData.brandTone ? `
                            <div class="info-item">
                                <div class="info-label">Brand Tone</div>
                                <div class="info-value brand-tone">${landingPageData.brandTone}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sections Grid -->
            <div class="sections-grid">
                ${landingPageData.sections && landingPageData.sections.length > 0 ? landingPageData.sections.map((section: any, index: number) => {
                    let icon = (section.title || section.name) ? (section.title || section.name).charAt(0).toUpperCase() : 'S';
                    let sectionType = section.type || 'section';
                    
                    // Render section components if available
                    const componentsHTML = section.components ? renderSectionComponentsForHTML(section.components) : '';
                    
                    return `
                    <div class="section-card" onclick="openSectionModal(${JSON.stringify(section).replace(/"/g, '&quot;')})">
                        <div class="section-card-header">
                            <div class="section-icon">${icon}</div>
                            <h2 class="section-title">${section.title || section.name || 'Section Title'}</h2>
                        </div>
                        <div class="section-card-content">
                            <div class="section-content">${section.content ? section.content.substring(0, 60) + (section.content.length > 60 ? '...' : '') : 'Click to view content'}</div>
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
            modalIcon.textContent = (section.title || section.name) ? (section.title || section.name).charAt(0).toUpperCase() : 'S';
            modalTitle.textContent = section.title || section.name || 'Section Title';
            
            // Build content with components
            let contentHTML = '';
            
            // Add main content
            if (section.content) {
                contentHTML += '<div class="section-main-content">' + section.content + '</div>';
            }
            
            // Add components if available
            if (section.components && typeof section.components === 'object') {
                contentHTML += '<div class="section-components-modal">';
                contentHTML += '<h4>Section Components:</h4>';
                
                // Render components similar to the main page
                Object.entries(section.components).forEach(([key, value]) => {
                    if (!value) return;
                    
                    const componentLabels = {
                        title: 'Title',
                        subtitle: 'Subtitle', 
                        content: 'Content',
                        buttons: 'Buttons',
                        images: 'Images',
                        links: 'Links',
                        messages: 'Messages',
                        items: 'Items',
                        forms: 'Forms',
                        ctas: 'CTAs'
                    };
                    
                    contentHTML += '<div class="component-section">';
                    contentHTML += '<h5>' + (componentLabels[key] || key) + ':</h5>';
                    
                    if (Array.isArray(value)) {
                        value.forEach((item, idx) => {
                            if (typeof item === 'object' && item !== null) {
                                contentHTML += '<div class="component-item-modal">';
                                if (item.title) contentHTML += '<strong>' + item.title + '</strong><br>';
                                if (item.content) contentHTML += item.content + '<br>';
                                if (item.description) contentHTML += '<em>' + item.description + '</em><br>';
                                if (item.author) contentHTML += '<small>— ' + item.author + '</small><br>';
                                if (item.role) contentHTML += '<small>' + item.role + '</small><br>';
                                if (item.plan_name) contentHTML += '<strong>' + item.plan_name + '</strong> - ' + (item.users || '') + ' - ' + (item.price || '') + '<br>';
                                if (item.type) contentHTML += '<small>Type: ' + item.type + '</small><br>';
                                if (item.features && Array.isArray(item.features)) {
                                    contentHTML += '<ul>';
                                    item.features.forEach(feature => {
                                        contentHTML += '<li>' + feature + '</li>';
                                    });
                                    contentHTML += '</ul>';
                                }
                                if (item.buttons && Array.isArray(item.buttons)) {
                                    item.buttons.forEach(btn => {
                                        contentHTML += '<span class="button-tag-modal">' + btn + '</span> ';
                                    });
                                    contentHTML += '<br>';
                                }
                                if (item.question) contentHTML += '<strong>Q: ' + item.question + '</strong><br>';
                                if (item.answer) contentHTML += 'A: ' + item.answer + '<br>';
                                if (item.url || item.src) contentHTML += '<small>URL: ' + (item.url || item.src) + '</small><br>';
                                if (item.alt) contentHTML += '<small>Alt: ' + item.alt + '</small><br>';
                                contentHTML += '</div>';
                            } else {
                                contentHTML += '<div class="component-item-modal simple">' + item + '</div>';
                            }
                        });
                    } else if (typeof value === 'string') {
                        contentHTML += '<div class="component-item-modal simple">' + value + '</div>';
                    } else if (typeof value === 'object' && value !== null) {
                        contentHTML += '<div class="component-item-modal">';
                        if (value.title) contentHTML += '<strong>' + value.title + '</strong><br>';
                        if (value.content) contentHTML += value.content + '<br>';
                        if (value.description) contentHTML += '<em>' + value.description + '</em><br>';
                        contentHTML += '</div>';
                    }
                    
                    contentHTML += '</div>';
                });
                
                contentHTML += '</div>';
            }
            
            // Set the content
            if (contentHTML) {
                modalContent.innerHTML = contentHTML;
            } else {
                modalContent.textContent = 'No content available for this section.';
            }
            
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

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${(landingPageData.businessName || landingPageData.title || 'landing-page').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-landing-page.html`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      URL.revokeObjectURL(url)
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Download failed:', error)
      alert('Download failed. Please try again.')
    } finally {
      setIsDownloading(false)
    }
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
      return 'bg-gradient-to-r from-gray-500 to-gray-700'
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

  // Helper function to generate content from components structure
  const generateContentFromComponents = (components: any) => {
    if (!components || typeof components !== 'object') {
      return ''
    }

    const contentParts: string[] = []
    
    // Extract content from different component types
    Object.entries(components).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item: any) => {
          if (typeof item === 'string') {
            contentParts.push(item)
          } else if (typeof item === 'object' && item !== null) {
            const obj = item as any
            if (obj.title) contentParts.push(obj.title)
            if (obj.content) contentParts.push(obj.content)
            if (obj.description) contentParts.push(obj.description)
            if (obj.text) contentParts.push(obj.text)
          }
        })
      } else if (typeof value === 'string') {
        contentParts.push(value)
      } else if (typeof value === 'object' && value !== null) {
        const obj = value as any
        if (obj.title) contentParts.push(obj.title)
        if (obj.content) contentParts.push(obj.content)
        if (obj.description) contentParts.push(obj.description)
        if (obj.text) contentParts.push(obj.text)
      }
    })

    return contentParts.join(' ').trim() || 'Content generated from components'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Generated Sections Results */}
      {generatedLandingPage && generatedLandingPage.sections && generatedLandingPage.sections.length > 0 ? (
        <div className="bg-white rounded-2xl md:shadow-xl md:border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="md:px-6 md:pt-6">
            <div className="flex md:items-center items-start md:justify-between justify-start md:flex-row flex-col">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 md:bg-b12 rounded-xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-b2" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Generated Landing Page Sections</h4>
                  <p className="text-b2 text-sm">AI-generated content for your landing page</p>
                </div>
              </div>
              <Badge className="bg-b12 text-b2 border px-4 py-2 text-sm font-medium my-2 md:my-0">
                {generatedLandingPage.sections.length} Sections Generated
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="md:p-8 p-2">
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Section Counter and Search */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-lg font-semibold text-gray-700">
                    All {generatedLandingPage.sections.length} Generated Sections
                  </h5>
                  <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                    <span>Scroll to view all sections</span>
                  </div>
                </div>
              </div>
              
              {generatedLandingPage.sections.map((section: any, index: number) => (
                <div key={section.id || index} className="group relative">
                  {/* Section Card */}
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
                    {/* Section Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center space-x-4 flex-wrap">
                        {/* Section Icon */}
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-black text-xl font-bold shadow-xl border-2 group-hover:scale-110 transition-transform duration-300">
                            {section.title || section.name ? String(section.title || section.name).charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-b8 font-bold shadow-lg border">
                            {index + 1}
                          </div>
                        </div>
                        
                        {/* Section Info */}
                        <div className="flex-1">
                          <h6 className="text-xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-200">
                            {String(section.title || section.name || `Section ${index + 1}`)}
                          </h6>
                          <p className="text-sm text-gray-500 mt-1">
                            {section.components && typeof section.components === 'object' 
                              ? `${Object.keys(section.components).length} components generated`
                              : 'No components available'
                            }
                          </p>
                        </div>
                        
                        {/* Status Indicator */}
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-gray-600 font-medium">Generated</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Section Components */}
                    <div className="md:p-6 p-3">
                      {section.components && typeof section.components === 'object' ? 
                        renderSectionComponents(section.components) : 
                        <div className="text-center py-8">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-gray-400 text-lg">📝</span>
                          </div>
                          <p className="text-sm text-gray-500 italic">No components available</p>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-gray-500" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">No Generated Sections</h4>
            <p className="text-gray-600 mb-4">No generated sections are available at the moment.</p>
            <p className="text-sm text-gray-500">Please go back and generate the landing page first.</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {generatedLandingPage && generatedLandingPage.sections && generatedLandingPage.sections.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex justify-center items-center md:flex-row flex-col md:space-x-2 md:space-y-0 space-y-2">
            {/* View All Sections Button */}
              <Button 
                onClick={() => setShowSectionsModal(true)}
                className="border bg-white px-4 py-2 text-b2 hover:bg-b2 hover:text-white transition-all duration-200"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Eye className="h-4 w-4" />
                  </div>
                  <span>View All {generatedLandingPage.sections.length} Sections</span>
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="border bg-white px-4 py-2 text-b2 hover:bg-b2 hover:text-white transition-all duration-200"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Landing Page
                  </>
                )}
              </Button>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="px-5 py-2 border bg-white hover:bg-b2 hover:text-white transition-all duration-200 font-medium"
        >
          ← Back to Preview
        </Button>
        <Button 
          onClick={async () => {
            // Ensure we're using the latest edited sections from localStorage
            const savedData = localStorage.getItem('latestLandingPage')
            if (savedData) {
              try {
                const latestData = JSON.parse(savedData)
                if (latestData.sections && Array.isArray(latestData.sections)) {
                  setGeneratedLandingPage(latestData)
                }
              } catch (error) {
                console.error('Failed to load latest sections from localStorage:', error)
              }
            }
            onNext()
          }}
          disabled={!generatedLandingPage || !generatedLandingPage.sections || generatedLandingPage.sections.length === 0}
          className="px-4 py-2 bg-b2 text-white hover:bg-b5 hover:text-white transition-all duration-200"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete
        </Button>
      </div>

      {/* Sections Modal */}
      <GeneratedSectionsModal
        isOpen={showSectionsModal}
        onClose={() => setShowSectionsModal(false)}
        landingPage={generatedLandingPage}
        businessInfo={{
          businessName: generatedLandingPage?.businessName || 'Your Business',
          businessOverview: generatedLandingPage?.businessOverview || '',
          targetAudience: generatedLandingPage?.targetAudience || '',
          brandTone: generatedLandingPage?.brandTone || 'professional',
          websiteUrl: generatedLandingPage?.websiteUrl || ''
        }}
        isEditable={true}
        onSave={handleSectionsSave}
      />
    </div>
  )
}

const DownloadStep = ({ onBack, onNext }: { onBack: () => void; onNext: () => void }) => {
  const [isPreparing, setIsPreparing] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadFormat, setDownloadFormat] = useState<'html' | 'zip'>('html')
  const [downloadComplete, setDownloadComplete] = useState(false)

  const handleDownload = async () => {
    setIsPreparing(true)
    try {
      // Get the generated landing page data
      const savedData = localStorage.getItem('latestLandingPage')
      if (!savedData) {
        throw new Error('No generated landing page found')
      }

      const landingPageData = JSON.parse(savedData)
      
      if (downloadFormat === 'html') {
        // Create HTML file with embedded CSS and JS
        const htmlContent = landingPageData.completeHTML || `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${landingPageData.meta?.title || landingPageData.title || 'Landing Page'}</title>
    <meta name="description" content="${landingPageData.meta?.description || ''}">
    <meta name="keywords" content="${landingPageData.meta?.keywords || ''}">
    <style>
        ${landingPageData.customCSS || ''}
    </style>
</head>
<body>
    ${landingPageData.sections?.map((section: any) => section.content).join('\n') || `
    <div class="container">
        <h1>${landingPageData.businessName || 'Your Business'}</h1>
        <p>${landingPageData.businessOverview || 'Professional services'}</p>
          </div>
    `}
    <script>
        ${landingPageData.customJS || ''}
    </script>
</body>
</html>`

        // Create blob and download
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `${(landingPageData.meta?.title || landingPageData.businessName || 'landing-page').toLowerCase().replace(/\s+/g, '-')}.html`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        setDownloadUrl(url)
        setDownloadComplete(true)
      } else {
        // For ZIP format, we would need to create a zip file with HTML, CSS, and JS files
        // For now, just download the HTML file
        alert('ZIP download not yet implemented. Downloading HTML file instead.')
        handleDownload()
        return
      }
    } catch (error) {
      console.error('Download preparation failed:', error)
      alert('Failed to prepare download. Please try again.')
    } finally {
      setIsPreparing(false)
    }
  }

  const handleDownloadFile = () => {
    if (downloadUrl) {
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `landing-page.${downloadFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return (
    <div className="text-center py-8 px-6">
      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6 shadow-xl">
        <Download className="w-10 h-10 text-blue-600" />
        </div>
      
      <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
        Download Your Landing Page
      </h3>
      
      <p className="text-gray-600 mb-8 text-lg max-w-2xl mx-auto leading-relaxed">
        Your professional landing page is ready! Choose your preferred format and download it to use on your website.
      </p>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Format Selection */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Choose Download Format</h4>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant={downloadFormat === 'html' ? 'default' : 'outline'}
              onClick={() => setDownloadFormat('html')}
              className={`h-12 ${downloadFormat === 'html' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : ''}`}
            >
              <div className="text-center">
                <div className="font-semibold">HTML</div>
                <div className="text-xs opacity-75">Single file</div>
              </div>
            </Button>
            <Button 
              variant={downloadFormat === 'zip' ? 'default' : 'outline'}
              onClick={() => setDownloadFormat('zip')}
              className={`h-12 ${downloadFormat === 'zip' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' : ''}`}
            >
              <div className="text-center">
                <div className="font-semibold">ZIP</div>
                <div className="text-xs opacity-75">Multiple files</div>
              </div>
            </Button>
          </div>
        </div>

        <Button 
          onClick={handleDownload}
          disabled={isPreparing}
          className="w-full h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-lg font-semibold"
        >
          {isPreparing ? (
            <>
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
              Preparing Download...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-3" />
              Download Landing Page
            </>
          )}
        </Button>

      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-center space-x-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="px-5 py-2 border bg-white hover:bg-b2 hover:text-white transition-all duration-200 font-medium"
        >
          ← Back to Preview
        </Button>
        <Button 
          onClick={onNext}
          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-medium"
        >
          Complete →
        </Button>
      </div>
    </div>
  )
}

const CompleteStep = ({ onClose, onComplete, completionData }: { onClose: () => void; onComplete?: (data: any) => void; completionData?: any }) => {
  const [progress, setProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(true)
  const [currentStage, setCurrentStage] = useState('Finalizing Landing Page...')
  const [completionTime, setCompletionTime] = useState<Date | null>(null)

  useEffect(() => {
    // Simple completion animation since database update is handled in SectionsViewStep
    const stages = [
      { name: 'Finalizing landing page...', duration: 2000 },
      { name: 'Landing page ready!', duration: 1000 }
    ]

    const startStage = (stageIndex: number) => {
      if (stageIndex >= stages.length) {
        setIsGenerating(false)
        setCurrentStage('Complete!')
        setCompletionTime(new Date())
        // Defer onComplete callback to avoid setState during render
        if (onComplete) {
          setTimeout(() => {
            onComplete(completionData)
          }, 0)
        }
        // Wait a moment then close
        setTimeout(() => {
          onClose()
        }, 1000)
        return
      }
      
      const stage = stages[stageIndex]
      setCurrentStage(stage.name)
      
      const stageProgress = 100 / stages.length
      const increment = stageProgress / (stage.duration / 50)
      
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + increment, (stageIndex + 1) * stageProgress)
          if (newProgress >= (stageIndex + 1) * stageProgress) {
            clearInterval(interval)
            startStage(stageIndex + 1)
            return newProgress
          }
          return newProgress
        })
      }, 50)
    }

    startStage(0)
  }, [])

  return (
    <div className="text-center py-8">
      {/* Icon */}
      <div className="mx-auto w-20 h-20 bg-b12 rounded-full flex items-center justify-center mb-6">
        {isGenerating ? (
          <Loader2 className="w-12 h-12 text-b2 animate-spin" />
        ) : (
        <CheckCircle className="w-12 h-12 text-green-600" />
        )}
      </div>
      
      {/* Message */}
      <h3 className="text-2xl font-bold text-gray-800 mb-3">
        {isGenerating ? 'Creating Your Landing Page' : 'Landing Page Created Successfully!'}
      </h3>
      
      <p className="text-gray-600 mb-6">
        {isGenerating ? currentStage : 'Your landing page has been generated and saved successfully!'}
      </p>
      
      {/* Progress Bar */}
      <div className="mt-6 max-w-md mx-auto">
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-primary to-purple-600 h-3 rounded-full transition-all duration-100 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {isGenerating ? `${Math.round(progress)}% complete` : 'Complete!'}
        </p>
      </div>

    </div>
  )
}

// URL Processor Component
interface URLProcessorProps {
  url: string
  onAnalysisComplete: (result: URLAnalysisResult) => void
  onError: (error: string) => void
}

function URLProcessor({ url, onAnalysisComplete, onError }: URLProcessorProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)

  React.useEffect(() => {
    const processUrl = async () => {
      if (!url) return

      setIsProcessing(true)
      try {
        console.log('Starting URL analysis for:', url)
        const result = await apiService.extractDesignFromUrl(url)
        console.log('URL analysis result:', result)
        
        if (result.success && result.sections) {
          onAnalysisComplete(result)
        } else {
          onError('Failed to extract design sections from URL')
        }
      } catch (error) {
        console.error('URL analysis error:', error)
        onError(error instanceof Error ? error.message : 'Failed to analyze URL')
      } finally {
        setIsProcessing(false)
      }
    }

    processUrl()
  }, [url, onAnalysisComplete, onError])

  return null // This component doesn't render anything
}



