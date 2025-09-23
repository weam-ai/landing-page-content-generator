'use client'

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, AlertCircle, Loader2, Brain } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import apiService from '@/lib/api'
import { api } from '@/lib/utils'

export interface PDFSection {
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
  }
}

export interface PDFAnalysisResult {
  sections: PDFSection[]
  designName?: string
  designType?: string
  totalPages?: number
}

interface PDFProcessorProps {
  file: File
  onAnalysisComplete: (result: PDFAnalysisResult) => void
  onError: (error: string) => void
}

export function PDFProcessor({ file, onAnalysisComplete, onError }: PDFProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(true)
  const [progress, setProgress] = useState(0)
  const [analysis, setAnalysis] = useState<PDFAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string>('Initializing...')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [aiProgress, setAiProgress] = useState(0)
  const [processingStage, setProcessingStage] = useState<'upload' | 'ai-processing' | 'finalizing'>('upload')

  useEffect(() => {
    console.log('PDFProcessor mounted with file:', file.name)
    processPDF()
  }, [file])

  const processPDF = async () => {
    console.log('Starting PDF processing with Gemini AI for:', file.name)
    
    try {
      setIsProcessing(true)
      setProgress(0)
      setUploadProgress(0)
      setAiProgress(0)
      setError(null)
      setProcessingStage('upload')
      setCurrentStep('Preparing file for upload...')

      // Calculate file size for realistic progress
      const fileSizeMB = file.size / (1024 * 1024)
      const isLargeFile = fileSizeMB > 5 // Files larger than 5MB need more time
      
      // Step 1: Upload PDF file to backend with real progress
      setCurrentStep('Uploading PDF to backend...')
      
      const formData = new FormData()
      formData.append('pdf', file)
      
      // Create XMLHttpRequest for upload progress tracking
      const uploadPromise = new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const uploadPercent = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(uploadPercent)
            
            // Calculate overall progress: Upload is 40% of total process
            const overallProgress = Math.round((uploadPercent * 0.4))
            setProgress(overallProgress)
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText)
              resolve(result.data?.filePath)
            } catch (e) {
              reject(new Error('Invalid response format'))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'))
        })
        
        xhr.open('POST', api('/upload/public'))
        xhr.send(formData)
      })

      // Wait for upload to complete
      const filePath = await uploadPromise
      
      if (!filePath) {
        throw new Error('No file path received from upload')
      }
      
      setProgress(40) // Upload complete
      setProcessingStage('ai-processing')
      setCurrentStep('Processing with Gemini AI...')

      // Step 2: Call backend Gemini AI API with realistic progress simulation
      const analysisStartTime = Date.now()
      const estimatedProcessingTime = isLargeFile ? 8000 : 4000 // 8s for large files, 4s for small
      
      // Start AI progress simulation
      const aiProgressInterval = setInterval(() => {
        setAiProgress(prev => {
          const elapsed = Date.now() - analysisStartTime
          const progressPercent = Math.min(Math.round((elapsed / estimatedProcessingTime) * 100), 95)
          
          // AI processing is 50% of total process (40% to 90%)
          const overallProgress = 40 + Math.round((progressPercent * 0.5))
          setProgress(overallProgress)
          
          return progressPercent
        })
      }, 100)

      // Call the actual AI API
      const analysisResponse = await apiService.extractPDFContent(filePath)
      
      // Clear the progress interval
      clearInterval(aiProgressInterval)
      
      // Check if the response has sections (new format) or success property (old format)
      if (analysisResponse.success === false) {
        throw new Error(analysisResponse.error || 'Failed to analyze PDF with Gemini AI')
      }
      
      // If no sections in response, it's an error
      if (!analysisResponse.sections || !Array.isArray(analysisResponse.sections)) {
        throw new Error('No sections found in API response')
      }

      setProgress(90)
      setProcessingStage('finalizing')
      setCurrentStep('Finalizing analysis...')

      // Step 3: Process the results
      console.log('Full API response:', analysisResponse)
      
      // The backend now returns the data directly with sections property
      const transformedResult: PDFAnalysisResult = {
        sections: analysisResponse.sections || [],
        designName: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        designType: 'pdf',
        totalPages: 1 // Default to 1, could be enhanced to extract actual page count
      }

      console.log('PDFProcessor - transformedResult:', transformedResult)
      console.log('PDFProcessor - sections count:', transformedResult.sections.length)

      setProgress(100)
      setCurrentStep('Analysis complete!')
      setAnalysis(transformedResult)
      setIsProcessing(false)

      // Call the success callback
      console.log('PDFProcessor - calling onAnalysisComplete with:', transformedResult)
      onAnalysisComplete(transformedResult)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      setIsProcessing(false)
      onError(errorMessage)
    }
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto mt-6 bg-gradient-to-r from-red-50 to-pink-50/50 border border-red-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-red-800 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Processing Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-red-100">
            <p className="text-red-700 mb-2 font-medium">Error Details:</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => {
                setError(null)
                setIsProcessing(true)
                processPDF()
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
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
            <FileText className="w-5 h-5 mr-2" />
            Processing PDF Design
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
                <FileText className="w-8 h-8 text-white" />
              </div>
              
              {/* Floating particles */}
              <div className="absolute -top-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
              <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
              <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              📄 AI-Powered PDF Analysis in Progress
            </h3>
            
            <p className="text-gray-600 mb-6 text-base max-w-lg mx-auto leading-relaxed">
              Our advanced Gemini AI is intelligently analyzing your PDF to extract sections, 
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
                  {/* Upload Progress */}
                  {processingStage === 'upload' && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">File Upload</span>
                        <span className="text-sm text-blue-600">{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Uploading {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}

                  {/* AI Processing Progress */}
                  {processingStage === 'ai-processing' && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-700">AI Analysis</span>
                        <span className="text-sm text-purple-600">{aiProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${aiProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-purple-600 mt-1">
                        Gemini AI is analyzing your PDF content
                      </p>
                    </div>
                  )}

                  {/* Finalizing Progress */}
                  {processingStage === 'finalizing' && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-700">Finalizing</span>
                        <span className="text-sm text-green-600">Processing...</span>
                      </div>
                      <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Organizing extracted sections and metadata
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Processing Steps Visualization */}
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className={`text-center p-3 rounded-xl transition-all duration-500 ${
                processingStage === 'upload' || processingStage === 'ai-processing' || processingStage === 'finalizing'
                  ? 'bg-green-100 border-2 border-green-300' 
                  : 'bg-gray-100 border-2 border-gray-200'
              }`}>
                <div className={`w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${
                  processingStage === 'upload' || processingStage === 'ai-processing' || processingStage === 'finalizing'
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {processingStage === 'upload' || processingStage === 'ai-processing' || processingStage === 'finalizing' ? '✓' : '1'}
                </div>
                <p className="text-xs text-gray-600">Upload</p>
              </div>
              
              <div className={`text-center p-3 rounded-xl transition-all duration-500 ${
                processingStage === 'ai-processing' || processingStage === 'finalizing'
                  ? 'bg-green-100 border-2 border-green-300' 
                  : 'bg-gray-100 border-2 border-gray-200'
              }`}>
                <div className={`w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${
                  processingStage === 'ai-processing' || processingStage === 'finalizing'
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {processingStage === 'ai-processing' || processingStage === 'finalizing' ? '✓' : '2'}
                </div>
                <p className="text-xs text-gray-600">AI Analysis</p>
              </div>
              
              <div className={`text-center p-3 rounded-xl transition-all duration-500 ${
                processingStage === 'finalizing'
                  ? 'bg-green-100 border-2 border-green-300' 
                  : 'bg-gray-100 border-2 border-gray-200'
              }`}>
                <div className={`w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${
                  processingStage === 'finalizing'
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {processingStage === 'finalizing' ? '✓' : '3'}
                </div>
                <p className="text-xs text-gray-600">Finalize</p>
              </div>
            </div>

            {/* File Info Card */}
            <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-gray-800 font-semibold">Processing File</p>
                  <p className="text-sm text-gray-600">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              
              {/* Processing Details */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center">
                    <p className="text-gray-500">Processing Stage</p>
                    <p className="font-medium text-gray-700 capitalize">{processingStage.replace('-', ' ')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">File Size</p>
                    <p className="font-medium text-gray-700">
                      {file.size > 1024 * 1024 * 5 ? 'Large' : 'Small'} File
                    </p>
                  </div>
                </div>
                
                {/* Estimated Time */}
                {processingStage === 'upload' && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-blue-600">
                      Estimated upload time: {file.size > 1024 * 1024 * 5 ? '10-15 seconds' : '5-8 seconds'}
                    </p>
                  </div>
                )}
                
                {processingStage === 'ai-processing' && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-purple-600">
                      AI analysis in progress: {file.size > 1024 * 1024 * 5 ? '8-12 seconds' : '4-6 seconds'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (analysis) {
    return (
      <Card className="max-w-2xl mx-auto mt-6 bg-gradient-to-r from-green-50 to-emerald-50/50 border border-green-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-green-800 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            PDF Analysis Complete with Gemini AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-sm text-green-600 font-medium">Design Name</p>
            <p className="text-lg font-bold text-green-800">{analysis.designName || 'PDF Document'}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <p className="text-sm text-green-600 font-medium">Design Type</p>
              <p className="text-lg font-bold text-green-800 capitalize">{(analysis.designType || 'pdf').replace('-', ' ')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <p className="text-sm text-green-600 font-medium">Total Pages</p>
              <p className="text-lg font-bold text-green-800">{analysis.totalPages}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-sm text-green-600 font-medium mb-2">Extracted Sections ({analysis.sections.length})</p>
            <div className="space-y-2">
              {analysis.sections.slice(0, 5).map((section, index) => (
                <div key={`${section.name}-${index}`} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs bg-green-100 border-green-200 text-green-700">
                      {section.name}
                    </Badge>
                    <span className="text-sm text-gray-700">{section.components.title || 'Untitled Section'}</span>
                  </div>
                  <span className="text-xs text-gray-500">PDF Section</span>
                </div>
              ))}
              {analysis.sections.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  +{analysis.sections.length - 5} more sections
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto mt-6 bg-gradient-to-br from-blue-50 to-purple-50/50 border border-blue-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-blue-800 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          Processing PDF with Gemini AI
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
              <Brain className="w-8 h-8 text-white" />
            </div>
            
            {/* Floating particles */}
            <div className="absolute -top-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="absolute -top-2 -right-2 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
            <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
            <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🤖 AI-Powered PDF Analysis in Progress
          </h3>
          
          <p className="text-gray-600 mb-6 text-base max-w-lg mx-auto leading-relaxed">
            Our advanced Gemini AI is intelligently analyzing your PDF to extract sections, 
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
                {/* Upload Progress */}
                {processingStage === 'upload' && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700">File Upload</span>
                      <span className="text-sm text-blue-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Uploading {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                )}

                {/* AI Processing Progress */}
                {processingStage === 'ai-processing' && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-700">AI Analysis</span>
                      <span className="text-sm text-purple-600">{aiProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${aiProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      Gemini AI is analyzing your PDF content
                    </p>
                  </div>
                )}

                {/* Finalizing Progress */}
                {processingStage === 'finalizing' && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700">Finalizing</span>
                      <span className="text-sm text-green-600">Processing...</span>
                    </div>
                    <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Organizing extracted sections and metadata
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Processing Steps Visualization */}
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto">
            <div className={`text-center p-3 rounded-xl transition-all duration-500 ${
              processingStage === 'upload' || processingStage === 'ai-processing' || processingStage === 'finalizing'
                ? 'bg-green-100 border-2 border-green-300' 
                : 'bg-gray-100 border-2 border-gray-200'
            }`}>
              <div className={`w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${
                processingStage === 'upload' || processingStage === 'ai-processing' || processingStage === 'finalizing'
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {processingStage === 'upload' || processingStage === 'ai-processing' || processingStage === 'finalizing' ? '✓' : '1'}
              </div>
              <p className="text-xs text-gray-600">Upload</p>
            </div>
            
            <div className={`text-center p-3 rounded-xl transition-all duration-500 ${
              processingStage === 'ai-processing' || processingStage === 'finalizing'
                ? 'bg-green-100 border-2 border-green-300' 
                : 'bg-gray-100 border-2 border-gray-200'
            }`}>
              <div className={`w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${
                processingStage === 'ai-processing' || processingStage === 'finalizing'
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {processingStage === 'ai-processing' || processingStage === 'finalizing' ? '✓' : '2'}
              </div>
              <p className="text-xs text-gray-600">AI Analysis</p>
            </div>
            
            <div className={`text-center p-3 rounded-xl transition-all duration-500 ${
              processingStage === 'finalizing'
                ? 'bg-green-100 border-2 border-green-300' 
                : 'bg-gray-100 border-2 border-gray-200'
            }`}>
              <div className={`w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold ${
                processingStage === 'finalizing'
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {processingStage === 'finalizing' ? '✓' : '3'}
              </div>
              <p className="text-xs text-gray-600">Finalize</p>
            </div>
          </div>

          {/* File Info Card */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-gray-800 font-semibold">Processing File</p>
                <p className="text-sm text-gray-600">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            
            {/* Processing Details */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-gray-500">Processing Stage</p>
                  <p className="font-medium text-gray-700 capitalize">{processingStage.replace('-', ' ')}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500">File Size</p>
                  <p className="font-medium text-gray-700">
                    {file.size > 1024 * 1024 * 5 ? 'Large' : 'Small'} File
                  </p>
                </div>
              </div>
              
              {/* Estimated Time */}
              {processingStage === 'upload' && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-blue-600">
                    Estimated upload time: {file.size > 1024 * 1024 * 5 ? '10-15 seconds' : '5-8 seconds'}
                  </p>
                </div>
              )}
              
              {processingStage === 'ai-processing' && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-purple-600">
                    AI analysis in progress: {file.size > 1024 * 1024 * 5 ? '8-12 seconds' : '4-6 seconds'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
