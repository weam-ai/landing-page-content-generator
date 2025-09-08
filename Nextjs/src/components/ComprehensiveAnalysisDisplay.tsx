import React from 'react'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { 
  FileText, 
  Image, 
  MousePointer, 
  FormInput, 
  Type, 
  Layout, 
  Palette, 
  Grid, 
  Smartphone, 
  Monitor,
  ArrowRight,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'

interface ComprehensiveAnalysisDisplayProps {
  analysis: {
    visualElements?: {
      textBlocks: any[]
      images: any[]
      buttons: any[]
      forms: any[]
    } | null
    contentMapping?: any | null
    layoutAnalysis?: any | null
    designTokens?: any | null
    // Figma-specific comprehensive properties
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
  type: 'pdf' | 'figma'
}

export function ComprehensiveAnalysisDisplay({ analysis, type }: ComprehensiveAnalysisDisplayProps) {
  const hasAnalysis = analysis.comprehensiveAnalysis && (
    analysis.visualElements || 
    analysis.contentMapping || 
    analysis.layoutAnalysis || 
    analysis.designTokens ||
    analysis.comprehensiveVisualElements ||
    analysis.comprehensiveContentMapping ||
    analysis.comprehensiveLayoutAnalysis ||
    analysis.comprehensiveDesignTokens
  )

  if (!hasAnalysis) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No comprehensive analysis available</p>
        <p className="text-sm text-gray-400">The AI analysis didn't extract detailed design information</p>
      </div>
    )
  }

  const { comprehensiveAnalysis } = analysis

  return (
    <div className="space-y-6">
      {/* Visual Elements Analysis */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800 flex items-center">
            <Layout className="w-5 h-5 mr-2 text-blue-600" />
            Visual Elements Analysis
          </h4>
          <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
            {(comprehensiveAnalysis?.visualElementsCount?.textBlocks || 0) + 
             (comprehensiveAnalysis?.visualElementsCount?.images || 0) + 
             (comprehensiveAnalysis?.visualElementsCount?.buttons || 0) + 
             (comprehensiveAnalysis?.visualElementsCount?.forms || 0)} Elements
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Type className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Text Blocks</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{comprehensiveAnalysis?.visualElementsCount?.textBlocks || 0}</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Image className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Images</span>
            </div>
            <p className="text-2xl font-bold text-green-800">{comprehensiveAnalysis?.visualElementsCount?.images || 0}</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <MousePointer className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">Buttons</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">{comprehensiveAnalysis?.visualElementsCount?.buttons || 0}</p>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <FormInput className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-600 font-medium">Forms</span>
            </div>
            <p className="text-2xl font-bold text-orange-800">{comprehensiveAnalysis?.visualElementsCount?.forms || 0}</p>
          </div>
        </div>
      </Card>

      {/* Content Mapping Analysis */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-green-600" />
            Content Mapping Analysis
          </h4>
          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
            {(comprehensiveAnalysis?.contentMappingCount?.headlines || 0) + 
             (comprehensiveAnalysis?.contentMappingCount?.bodyText || 0) + 
             (comprehensiveAnalysis?.contentMappingCount?.ctaButtons || 0) + 
             (comprehensiveAnalysis?.contentMappingCount?.navigation || 0) + 
             (comprehensiveAnalysis?.contentMappingCount?.features || 0) + 
             (comprehensiveAnalysis?.contentMappingCount?.testimonials || 0)} Content Items
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Type className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Headlines</span>
            </div>
            <p className="text-2xl font-bold text-green-800">{comprehensiveAnalysis?.contentMappingCount?.headlines || 0}</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Body Text</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{comprehensiveAnalysis?.contentMappingCount?.bodyText || 0}</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <MousePointer className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">CTA Buttons</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">{comprehensiveAnalysis?.contentMappingCount?.ctaButtons || 0}</p>
          </div>
          
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <Layout className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-indigo-600 font-medium">Navigation</span>
            </div>
            <p className="text-2xl font-bold text-indigo-800">{comprehensiveAnalysis?.contentMappingCount?.navigation || 0}</p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-600 font-medium">Features</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800">{comprehensiveAnalysis?.contentMappingCount?.features || 0}</p>
          </div>
          
          <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-4 h-4 text-pink-600" />
              <span className="text-sm text-pink-600 font-medium">Testimonials</span>
            </div>
            <p className="text-2xl font-bold text-pink-800">{comprehensiveAnalysis?.contentMappingCount?.testimonials || 0}</p>
          </div>
        </div>
      </Card>

      {/* Layout Analysis */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800 flex items-center">
            <Grid className="w-5 h-5 mr-2 text-purple-600" />
            Layout Analysis
          </h4>
          <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
            {comprehensiveAnalysis?.layoutAnalysis?.responsiveBreakpoints || 0} Breakpoints
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <Grid className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-600 font-medium">Grid System</span>
              </div>
              <p className="text-lg font-bold text-purple-800 capitalize">
                {(comprehensiveAnalysis?.layoutAnalysis?.gridSystem || 'unknown').replace('-', ' ')}
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Layout className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Primary Alignment</span>
              </div>
              <p className="text-lg font-bold text-blue-800 capitalize">
                {comprehensiveAnalysis?.layoutAnalysis?.alignment || 'unknown'}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <Smartphone className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Responsive Design</span>
              </div>
              <div className="flex items-center space-x-2">
                {(comprehensiveAnalysis?.layoutAnalysis?.responsiveBreakpoints || 0) > 0 ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {comprehensiveAnalysis?.layoutAnalysis?.responsiveBreakpoints || 0} breakpoints detected
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">No responsive breakpoints</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Monitor className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-600 font-medium">Page Structure</span>
              </div>
              <div className="space-y-1">
                {analysis.layoutAnalysis?.pageStructure && Object.entries(analysis.layoutAnalysis.pageStructure).map(([section, data]: [string, any]) => (
                  <div key={section} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-orange-700">{section}</span>
                    {data?.present ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Design Tokens */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-800 flex items-center">
            <Palette className="w-5 h-5 mr-2 text-pink-600" />
            Design Tokens
          </h4>
          <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700">
            {(comprehensiveAnalysis?.designTokensCount?.colors || 0) + 
             (comprehensiveAnalysis?.designTokensCount?.typography || 0) + 
             (comprehensiveAnalysis?.designTokensCount?.spacing || 0)} Tokens
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
            <div className="flex items-center justify-between mb-2">
              <Palette className="w-4 h-4 text-pink-600" />
              <span className="text-sm text-pink-600 font-medium">Colors</span>
            </div>
            <p className="text-2xl font-bold text-pink-800">{comprehensiveAnalysis?.designTokensCount?.colors || 0}</p>
          </div>
          
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <Type className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-indigo-600 font-medium">Typography</span>
            </div>
            <p className="text-2xl font-bold text-indigo-800">{comprehensiveAnalysis?.designTokensCount?.typography || 0}</p>
          </div>
          
          <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <Grid className="w-4 h-4 text-teal-600" />
              <span className="text-sm text-teal-600 font-medium">Spacing</span>
            </div>
            <p className="text-2xl font-bold text-teal-800">{comprehensiveAnalysis?.designTokensCount?.spacing || 0}</p>
          </div>
        </div>
      </Card>

      {/* Detailed Analysis Summary */}
      {(analysis.visualElements || analysis.comprehensiveVisualElements) && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <ArrowRight className="w-5 h-5 mr-2 text-gray-600" />
            Detailed Analysis Summary
          </h4>
          
          <div className="space-y-4">
            {(analysis.visualElements?.textBlocks || analysis.comprehensiveVisualElements?.textBlocks) && 
             ((analysis.visualElements?.textBlocks?.length || 0) > 0 || (analysis.comprehensiveVisualElements?.textBlocks?.length || 0) > 0) && (
              <div>
                <h5 className="text-md font-medium text-gray-700 mb-2">Text Elements</h5>
                                  <div className="grid gap-2">
                    {(analysis.visualElements?.textBlocks || analysis.comprehensiveVisualElements?.textBlocks || []).slice(0, 3).map((text: any, index: number) => (
                      <div key={text.id || index} className="bg-gray-50 rounded p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {text.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {text.position?.width || 0}×{text.position?.height || 0}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">
                          {text.content || text.text || 'No content'}
                        </p>
                      </div>
                    ))}
                    {(analysis.visualElements?.textBlocks || analysis.comprehensiveVisualElements?.textBlocks || []).length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{(analysis.visualElements?.textBlocks || analysis.comprehensiveVisualElements?.textBlocks || []).length - 3} more text elements
                      </p>
                    )}
                  </div>
              </div>
            )}
            
            {(analysis.visualElements?.buttons || analysis.comprehensiveVisualElements?.buttons) && 
             ((analysis.visualElements?.buttons?.length || 0) > 0 || (analysis.comprehensiveVisualElements?.buttons?.length || 0) > 0) && (
              <div>
                <h5 className="text-md font-medium text-gray-700 mb-2">Button Elements</h5>
                <div className="grid gap-2">
                  {(analysis.visualElements?.buttons || analysis.comprehensiveVisualElements?.buttons || []).slice(0, 3).map((button: any, index: number) => (
                    <div key={button.id || index} className="bg-gray-50 rounded p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {button.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {button.position?.width || 0}×{button.position?.height || 0}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {button.text || 'Button'}
                      </p>
                    </div>
                  ))}
                  {(analysis.visualElements?.buttons || analysis.comprehensiveVisualElements?.buttons || []).length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{(analysis.visualElements?.buttons || analysis.comprehensiveVisualElements?.buttons || []).length - 3} more buttons
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
