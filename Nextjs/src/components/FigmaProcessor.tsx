'use client'

import { useState, useEffect, useRef } from 'react'
import { Figma, CheckCircle, AlertCircle, Loader2, ExternalLink, FileText, Palette, Layout, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import apiService from '@/lib/api'

export interface FigmaSection {
  id: string
  title: string
  type: 'header' | 'hero' | 'features' | 'testimonials' | 'contact' | 'about' | 'cta' | 'content'
  content: string
  order: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  figmaNodeId: string
  depth: number
  parentSection: string | null
  // Add components field to store extracted component data
  components?: {
    [key: string]: any
  }
}

export interface FigmaDesignToken {
  name: string
  value: string
}

export interface FigmaLayoutAnalysis {
  layoutType: 'simple' | 'standard' | 'multi-section' | 'unknown'
  gridSystem: boolean
  responsive: boolean
  sections: number
  components: number
}

export interface FigmaAnalysisResult {
  designType: 'figma'
  fileKey: string
  fileName: string
  lastModified: Date
  version: string
  sections: FigmaSection[]
  designTokens: {
    colors: FigmaDesignToken[]
    typography: FigmaDesignToken[]
    spacing: FigmaDesignToken[]
    shadows: FigmaDesignToken[]
  }
  layoutAnalysis: FigmaLayoutAnalysis
  totalSections: number
  extractedAt: Date
  // Comprehensive analysis data
  comprehensiveVisualElements?: {
    textBlocks: any[]
    images: any[]
    buttons: any[]
    forms: any[]
  } | null
  comprehensiveContentMapping?: any | null
  comprehensiveLayoutAnalysis?: any | null
  comprehensiveDesignTokens?: any | null
  comprehensiveAnalysis?: {
    visualElementsCount: {
      textBlocks: number
      images: number
      buttons: number
      forms: number
    }
    contentMappingCount: {
      headlines: number
      bodyText: number
      ctaButtons: number
      navigation: number
      features: number
      testimonials: number
    }
    layoutAnalysis: {
      gridSystem: string
      responsiveBreakpoints: number
      alignment: string
      pageStructure: any
    }
    designTokensCount: {
      colors: number
      typography: number
      spacing: number
    }
  }
}

interface FigmaProcessorProps {
  figmaUrl: string
  onAnalysisComplete: (result: FigmaAnalysisResult) => void
  onError: (error: string) => void
}

export function FigmaProcessor({ figmaUrl, onAnalysisComplete, onError }: FigmaProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(true)
  const [progress, setProgress] = useState(0)
  const [analysis, setAnalysis] = useState<FigmaAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string>('Connecting to Figma...')
  const [processingStage, setProcessingStage] = useState<'validation' | 'api-connection' | 'extraction' | 'processing' | 'finalizing'>('validation')
  const [stageProgress, setStageProgress] = useState(0)
  
  // Add ref to track if processing has already started to prevent duplicate calls
  const hasStartedProcessing = useRef(false)
  const currentUrl = useRef<string | null>(null)
  const processingId = useRef<string | null>(null)

  useEffect(() => {
    
    // Only start processing if we haven't started yet or if the URL has changed
    if (!hasStartedProcessing.current || currentUrl.current !== figmaUrl) {
      hasStartedProcessing.current = true
      currentUrl.current = figmaUrl
      processingId.current = `figma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      processFigmaDesign()
    } else {
    }
    
    // Cleanup function to reset processing state when component unmounts
    return () => {
      hasStartedProcessing.current = false
    }
  }, [figmaUrl])

  const processFigmaDesign = async () => {
    
    // Prevent multiple simultaneous processing calls
    if (isProcessing && progress > 0) {
      return
    }
    
    // Additional duplicate prevention - check for ongoing requests globally
    const requestKey = `figma-processing-${figmaUrl}`;
    if ((window as any)[requestKey]) {
      return
    }
    
    // Mark as processing globally
    (window as any)[requestKey] = true;
    
    try {
      setIsProcessing(true)
      setProgress(0)
      setStageProgress(0)
      setError(null)
      setProcessingStage('validation')

      // Step 1: Validate Figma URL
      setCurrentStep('Validating Figma URL...')
      setProgress(5)
      setStageProgress(0)
      
      if (!isValidFigmaUrl(figmaUrl)) {
        throw new Error('Invalid Figma URL. Please provide a valid Figma file URL.')
      }

      // Simulate validation progress
      await simulateProgress(20, 1000)
      setProgress(15)
      setStageProgress(100)
      
      // Step 2: Extract file key
      setCurrentStep('Extracting file information...')
      setProgress(20)
      setProcessingStage('api-connection')
      setStageProgress(0)
      
      const fileKey = extractFileKeyFromUrl(figmaUrl)
      if (!fileKey) {
        throw new Error('Could not extract file key from Figma URL.')
      }

      // Simulate file key extraction
      await simulateProgress(40, 800)
      setProgress(35)
      setStageProgress(100)

      // Step 3: Connect to Figma API
      setCurrentStep('Connecting to Figma API...')
      setProgress(40)
      setProcessingStage('extraction')
      setStageProgress(0)
      
      // Simulate API connection
      await simulateProgress(60, 1200)
      setProgress(55)
      setStageProgress(100)
      
      // Step 4: Extract design information
      setCurrentStep('Extracting design sections...')
      setProgress(60)
      setProcessingStage('processing')
      setStageProgress(0)
      
      const response = await apiService.extractFigmaDesign(figmaUrl)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to extract Figma design')
      }
      
      if (!response.sections || !Array.isArray(response.sections)) {
        throw new Error('Invalid API response: sections not found')
      }

      setProgress(85)
      setStageProgress(100)
      setProcessingStage('finalizing')
      setCurrentStep('Processing design data...')
      
      // The new API returns sections directly, not wrapped in data
      // Transform the new response format to match frontend types
      const transformedSections = response.sections.map((section: any, index: number) => {
        const transformed = {
          id: `figma-section-${index + 1}`,
          title: section.name || `Section ${index + 1}`,
          type: 'content' as const,
          content: Object.values(section.components || {}).join(' ').substring(0, 200) || 'Design section from Figma',
          order: index + 1,
          boundingBox: { x: 0, y: index * 200, width: 800, height: 200 },
          figmaNodeId: `node-${index}`,
          depth: 0,
          parentSection: null,
          // Store the original components data for the sections review
          components: section.components
        }
        return transformed
      })
      
      const analysisResult: FigmaAnalysisResult = {
        designType: 'figma',
        fileKey: extractFileKeyFromUrl(figmaUrl) || 'unknown',
        fileName: 'Figma Design',
        lastModified: new Date(),
        version: '1.0',
        sections: transformedSections,
        designTokens: {
          colors: [],
          typography: [],
          spacing: [],
          shadows: []
        },
        layoutAnalysis: {
          layoutType: 'multi-section',
          gridSystem: false,
          responsive: false,
          sections: response.sections.length,
          components: response.sections.reduce((total: number, section: any) => {
            return total + (section.components ? Object.keys(section.components).length : 0)
          }, 0)
        },
        totalSections: response.sections.length,
        extractedAt: new Date()
      }

      // Step 5: Complete processing
      setCurrentStep('Analysis complete!')
      setProgress(100)
      setStageProgress(100)
      
      setAnalysis(analysisResult)
      setIsProcessing(false)
      
      onAnalysisComplete(analysisResult)
      
      // Clean up global processing flag on success
      const requestKey = `figma-processing-${figmaUrl}`;
      delete (window as any)[requestKey];
    } catch (err) {
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to process Figma design'
      setError(errorMessage)
      setIsProcessing(false)
      onError(errorMessage)
    } finally {
      // Clean up global processing flag
      const requestKey = `figma-processing-${figmaUrl}`;
      delete (window as any)[requestKey];
    }
  }

  // Helper function to simulate realistic progress
  const simulateProgress = (targetProgress: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const startProgress = progress
      const progressDiff = targetProgress - startProgress
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progressRatio = Math.min(elapsed / duration, 1)
        const currentProgress = startProgress + (progressDiff * progressRatio)
        
        setStageProgress(Math.round(currentProgress))
        
        if (progressRatio >= 1) {
          clearInterval(interval)
          resolve()
        }
      }, 50)
    })
  }

  const isValidFigmaUrl = (url: string): boolean => {
    return url.includes('figma.com') && (url.includes('/file/') || url.includes('/community/file/') || url.includes('/design/'))
  }

  const extractFileKeyFromUrl = (url: string): string | null => {
    // Handle multiple Figma URL formats:
    // Standard: https://www.figma.com/file/abc123/Design-Name
    // Community: https://www.figma.com/community/file/abc123/Design-Name
    // Design: https://www.figma.com/design/abc123/Design-Name
    const match = url.match(/figma\.com\/(?:community\/)?(?:file|design)\/([a-zA-Z0-9]+)/)
    return match ? match[1] : null
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "hero": return "🎯"
      case "features": return "✨"
      case "testimonials": return "💬"
      case "cta": return "🚀"
      case "about": return "ℹ️"
      case "contact": return "📞"
      case "header": return "📋"
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
      case "header": return "from-gray-500 to-gray-600"
      default: return "from-gray-500 to-gray-600"
    }
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto mt-6 bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Figma Processing Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-red-200">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-800"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isProcessing) {
    return (
      <Card className="max-w-2xl mx-auto mt-6 bg-gradient-to-br from-blue-50 to-purple-50/50 border border-blue-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-800 flex items-center">
            <Figma className="w-5 h-5 mr-2" />
            Processing your Figma File 
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {/* Modern Animated Processing Container */}
            <div className="relative mx-auto w-24 h-24 mb-6">
              {/* Outer ring with rotation */}
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
              
              {/* Inner ring with reverse rotation */}
              <div className="absolute inset-2 border-4 border-purple-300 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              
              {/* Center icon with pulse */}
              <div className="absolute inset-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Figma className="w-8 h-8 text-white" />
              </div>
              
              {/* Floating particles */}
              <div className="absolute -top-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
              <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
              <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎨 AI-Powered Figma Analysis in Progress
            </h3>
            
            <p className="text-gray-600 mb-6 text-base max-w-lg mx-auto leading-relaxed">
              Our advanced AI is intelligently analyzing your Figma design to extract sections, 
              identify design patterns, and classify content elements.
            </p>

            {/* Modern Progress Section */}
            <div className="max-w-md mx-auto space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                {/* Overall Progress Bar */}
                <div className="relative mb-4">
                  <div className="w-full h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{ width: `${progress}%` }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" 
                           style={{ animationDuration: '2s' }} />
                    </div>
                  </div>
                  
                  {/* Progress percentage with modern styling */}
                  <div className="absolute -top-8 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    {progress}%
                  </div>
                </div>
                
                {/* Current step indicator */}
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 font-medium mb-1">Current Step</p>
                  <p className="text-base text-gray-800 font-semibold">{currentStep}</p>
                </div>

                {/* Detailed Progress Breakdown */}
                <div className="space-y-3">
                  {/* Stage-specific progress */}
                  <div className={`rounded-lg p-3 border transition-all duration-300 ${
                    processingStage === 'validation' ? 'bg-blue-50 border-blue-200' :
                    processingStage === 'api-connection' ? 'bg-purple-50 border-purple-200' :
                    processingStage === 'extraction' ? 'bg-indigo-50 border-indigo-200' :
                    processingStage === 'processing' ? 'bg-green-50 border-green-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${
                        processingStage === 'validation' ? 'text-blue-700' :
                        processingStage === 'api-connection' ? 'text-purple-700' :
                        processingStage === 'extraction' ? 'text-indigo-700' :
                        processingStage === 'processing' ? 'text-green-700' :
                        'text-gray-700'
                      }`}>
                        {processingStage === 'validation' ? 'URL Validation' :
                         processingStage === 'api-connection' ? 'API Connection' :
                         processingStage === 'extraction' ? 'Design Extraction' :
                         processingStage === 'processing' ? 'AI Processing' :
                         'Finalizing'}
                      </span>
                      <span className={`text-sm ${
                        processingStage === 'validation' ? 'text-blue-600' :
                        processingStage === 'api-connection' ? 'text-purple-600' :
                        processingStage === 'extraction' ? 'text-indigo-600' :
                        processingStage === 'processing' ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {stageProgress}%
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${
                      processingStage === 'validation' ? 'bg-blue-200' :
                      processingStage === 'api-connection' ? 'bg-purple-200' :
                      processingStage === 'extraction' ? 'bg-indigo-200' :
                      processingStage === 'processing' ? 'bg-green-200' :
                      'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          processingStage === 'validation' ? 'bg-blue-500' :
                          processingStage === 'api-connection' ? 'bg-purple-500' :
                          processingStage === 'extraction' ? 'bg-indigo-500' :
                          processingStage === 'processing' ? 'bg-green-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${
                      processingStage === 'validation' ? 'text-blue-600' :
                      processingStage === 'api-connection' ? 'text-purple-600' :
                      processingStage === 'extraction' ? 'text-indigo-600' :
                      processingStage === 'processing' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {processingStage === 'validation' ? 'Validating Figma URL format and accessibility' :
                       processingStage === 'api-connection' ? 'Establishing connection to Figma API' :
                       processingStage === 'extraction' ? 'Extracting design structure and components' :
                       processingStage === 'processing' ? 'AI analysis of design patterns and content' :
                       'Organizing extracted data and finalizing results'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Steps Visualization */}
            <div className="mt-6 grid grid-cols-5 gap-2 max-w-lg mx-auto">
              {['validation', 'api-connection', 'extraction', 'processing', 'finalizing'].map((stage, index) => (
                <div key={stage} className={`text-center p-2 rounded-lg transition-all duration-500 ${
                  processingStage === stage || ['validation', 'api-connection', 'extraction', 'processing', 'finalizing'].indexOf(processingStage) > index
                    ? 'bg-green-100 border-2 border-green-300' 
                    : 'bg-gray-100 border-2 border-gray-200'
                }`}>
                  <div className={`w-4 h-4 mx-auto mb-1 rounded-full flex items-center justify-center text-xs font-bold ${
                    processingStage === stage || ['validation', 'api-connection', 'extraction', 'processing', 'finalizing'].indexOf(processingStage) > index
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {processingStage === stage || ['validation', 'api-connection', 'extraction', 'processing', 'finalizing'].indexOf(processingStage) > index ? '✓' : index + 1}
                  </div>
                  <p className="text-xs text-gray-600 capitalize">{stage.replace('-', ' ')}</p>
                </div>
              ))}
            </div>

            {/* Figma Link Info */}
            <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full">
                  <ExternalLink className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-gray-800 font-semibold">Processing Figma Design</p>
                  <p className="text-sm text-gray-600 truncate max-w-xs">{figmaUrl}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    🔗 Connecting to Figma API
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return null
  }

  return (
    <Card className="max-w-4xl mx-auto mt-6 bg-green-50 border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-green-800 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Figma Design Analysis Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Design Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-600 font-medium">File Name</p>
            </div>
            <p className="text-lg font-bold text-green-800 truncate">
              {analysis.fileName}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center space-x-2 mb-2">
              <Layers className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-600 font-medium">Total Sections</p>
            </div>
            <p className="text-lg font-bold text-green-800">{analysis.totalSections}</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center space-x-2 mb-2">
              <Layout className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-600 font-medium">Layout Type</p>
            </div>
            <Badge variant="outline" className="capitalize bg-white text-green-700">
              {analysis.layoutAnalysis.layoutType.replace('-', ' ')}
            </Badge>
          </div>
        </div>

        {/* Design Tokens */}
        {(analysis.designTokens.colors.length > 0 || analysis.designTokens.typography.length > 0) && (
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <h4 className="text-sm text-green-600 font-medium mb-3 flex items-center">
              <Palette className="w-4 h-4 mr-2" />
              Design Tokens
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.designTokens.colors.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Colors ({analysis.designTokens.colors.length})</p>
                  <div className="space-y-1">
                    {analysis.designTokens.colors.slice(0, 3).map((color, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        <div className="w-3 h-3 bg-gray-300 rounded-full" />
                        <span className="text-gray-700">{color.name}</span>
                      </div>
                    ))}
                    {analysis.designTokens.colors.length > 3 && (
                      <p className="text-xs text-gray-500">+{analysis.designTokens.colors.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}
              
              {analysis.designTokens.typography.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Typography ({analysis.designTokens.typography.length})</p>
                  <div className="space-y-1">
                    {analysis.designTokens.typography.slice(0, 3).map((type, index) => (
                      <div key={index} className="text-xs text-gray-700">
                        {type.name}
                      </div>
                    ))}
                    {analysis.designTokens.typography.length > 3 && (
                      <p className="text-xs text-gray-500">+{analysis.designTokens.typography.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Extracted Sections */}
        <div className="bg-white rounded-lg p-4 border border-green-100">
          <h4 className="text-sm text-green-600 font-medium mb-3">
            Extracted Sections ({analysis.sections.length})
          </h4>
          <div className="space-y-3">
            {analysis.sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${getSectionColor(section.type)} rounded-lg flex items-center justify-center text-white text-lg shadow-sm`}>
                    {getSectionIcon(section.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">{section.title}</span>
                      <Badge variant="outline" className="text-xs bg-green-100 border-green-200 text-green-700">
                        {section.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {section.content.length > 60 ? section.content.substring(0, 60) + '...' : section.content}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Depth: {section.depth}</p>
                  <p className="text-xs text-gray-500">
                    {section.boundingBox.width}×{section.boundingBox.height}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Figma Link */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">View in Figma</h4>
              <p className="text-xs text-blue-600">Open the original design file</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(figmaUrl, '_blank')}
              className="text-blue-600 hover:text-blue-800 border-blue-300"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Figma
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
