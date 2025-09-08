import React from 'react'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { 
  FileText, Image, MousePointer, FormInput, Type, Layout, Palette, Grid, Smartphone, Monitor,
  ArrowRight, CheckCircle, XCircle, Info, Eye, Target, Layers, Zap, Star, MessageSquare,
  Users, Settings, BarChart3, TrendingUp, Calendar, MapPin, Phone, Mail, Globe
} from 'lucide-react'

interface FilteredAnalysisData {
  visualElementDetection: {
    headlines: string[]
    bodyText: string[]
    ctaButtons: string[]
    navigation: any[]
    features: any[]
    testimonials: any[]
  }
  contentMapping: {
    hero: {
      headline: string | null
      subheadlines: string[]
      cta: string[]
    }
    features: any[]
    testimonials: any[]
    faq: any[]
    contact: any[]
  }
  layoutAnalysis: {
    structure: string[]
    breakpoints: string[]
    grid: string
    alignment: any
    spacing: any
  }
  designTokens: {
    colors: any[]
    typography: any[]
    spacing: any[]
  }
  stats: {
    textBlocks: number
    buttons: number
    forms: number
    headlines: number
    bodyText: number
  }
}

interface FilteredAnalysisDisplayProps {
  filteredData: FilteredAnalysisData
  type: 'pdf' | 'figma'
}

export function FilteredAnalysisDisplay({ filteredData, type }: FilteredAnalysisDisplayProps) {
  const hasData = filteredData && Object.keys(filteredData).length > 0

  if (!hasData) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center text-gray-500">
          <Info className="w-5 h-5 mr-2" />
          <span>No filtered analysis data available</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          AI-Powered Design Analysis
        </h3>
        <p className="text-gray-600">
          Comprehensive analysis of your {type.toUpperCase()} design using Gemini AI
        </p>
      </div>

      {/* Statistics Overview */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Design Statistics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredData.stats.textBlocks}</div>
            <div className="text-sm text-gray-600">Text Blocks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{filteredData.stats.buttons}</div>
            <div className="text-sm text-gray-600">Buttons</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{filteredData.stats.forms}</div>
            <div className="text-sm text-gray-600">Forms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{filteredData.stats.headlines}</div>
            <div className="text-sm text-gray-600">Headlines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{filteredData.stats.bodyText}</div>
            <div className="text-sm text-gray-600">Body Text</div>
          </div>
        </div>
      </Card>

      {/* Visual Element Detection */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2 text-blue-600" />
          Visual Element Detection
        </h4>
        <div className="grid gap-4">
          {/* Headlines */}
          {filteredData.visualElementDetection.headlines.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Headlines ({filteredData.visualElementDetection.headlines.length})
              </h5>
              <div className="space-y-2">
                {filteredData.visualElementDetection.headlines.map((headline, index) => (
                  <div key={index} className="bg-gray-50 rounded p-3 border border-gray-200">
                    <p className="text-sm font-medium text-gray-800">{headline}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          {filteredData.visualElementDetection.ctaButtons.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Call-to-Action Buttons ({filteredData.visualElementDetection.ctaButtons.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {filteredData.visualElementDetection.ctaButtons.map((cta, index) => (
                  <Badge key={index} variant="outline" className="bg-green-50 border-green-200 text-green-700">
                    {cta}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Body Text Samples */}
          {filteredData.visualElementDetection.bodyText.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Body Text Samples ({filteredData.visualElementDetection.bodyText.length})
              </h5>
              <div className="space-y-2">
                {filteredData.visualElementDetection.bodyText.slice(0, 3).map((text, index) => (
                  <div key={index} className="bg-gray-50 rounded p-3 border border-gray-200">
                    <p className="text-sm text-gray-700 line-clamp-2">{text}</p>
                  </div>
                ))}
                {filteredData.visualElementDetection.bodyText.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{filteredData.visualElementDetection.bodyText.length - 3} more text samples
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Content Mapping */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2 text-green-600" />
          Content Mapping
        </h4>
        <div className="grid gap-4">
          {/* Hero Section */}
          {filteredData.contentMapping.hero.headline && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Hero Section
              </h5>
              <div className="bg-blue-50 rounded p-4 border border-blue-200">
                <div className="mb-2">
                  <span className="text-xs font-medium text-blue-600">Main Headline:</span>
                  <p className="text-sm font-medium text-gray-800">{filteredData.contentMapping.hero.headline}</p>
                </div>
                {filteredData.contentMapping.hero.subheadlines.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-blue-600">Subheadlines:</span>
                    <div className="space-y-1">
                      {filteredData.contentMapping.hero.subheadlines.map((sub, index) => (
                        <p key={index} className="text-sm text-gray-700">{sub}</p>
                      ))}
                    </div>
                  </div>
                )}
                {filteredData.contentMapping.hero.cta.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-blue-600">CTAs:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {filteredData.contentMapping.hero.cta.map((cta, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {cta}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          {filteredData.contentMapping.features.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                Features ({filteredData.contentMapping.features.length})
              </h5>
              <div className="grid gap-2">
                {filteredData.contentMapping.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="bg-gray-50 rounded p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {feature.type || 'feature'}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{feature.title}</p>
                    {feature.description && (
                      <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                    )}
                  </div>
                ))}
                {filteredData.contentMapping.features.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{filteredData.contentMapping.features.length - 3} more features
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Testimonials */}
          {filteredData.contentMapping.testimonials.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Testimonials ({filteredData.contentMapping.testimonials.length})
              </h5>
              <div className="space-y-2">
                {filteredData.contentMapping.testimonials.slice(0, 2).map((testimonial, index) => (
                  <div key={index} className="bg-yellow-50 rounded p-3 border border-yellow-200">
                    <p className="text-sm text-gray-700 italic">"{testimonial.quote}"</p>
                    <p className="text-xs text-gray-600 mt-1">— {testimonial.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {filteredData.contentMapping.faq.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                FAQ Section ({filteredData.contentMapping.faq.length})
              </h5>
              <div className="space-y-2">
                {filteredData.contentMapping.faq.slice(0, 3).map((faq, index) => (
                  <div key={index} className="bg-gray-50 rounded p-3 border border-gray-200">
                    <p className="text-sm font-medium text-gray-800">{faq.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{faq.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Layout Analysis */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Layout className="w-5 h-5 mr-2 text-purple-600" />
          Layout Analysis
        </h4>
        <div className="grid gap-4">
          {/* Page Structure */}
          <div>
            <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
              <Grid className="w-4 h-4 mr-2" />
              Page Structure
            </h5>
            <div className="flex flex-wrap gap-2">
              {filteredData.layoutAnalysis.structure.map((section, index) => (
                <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                  {section}
                </Badge>
              ))}
            </div>
          </div>

          {/* Grid System */}
          <div>
            <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
              <Grid className="w-4 h-4 mr-2" />
              Grid System
            </h5>
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
              {filteredData.layoutAnalysis.grid}
            </Badge>
          </div>

          {/* Responsive Breakpoints */}
          {filteredData.layoutAnalysis.breakpoints.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Smartphone className="w-4 h-4 mr-2" />
                Responsive Breakpoints
              </h5>
              <div className="flex flex-wrap gap-2">
                {filteredData.layoutAnalysis.breakpoints.map((breakpoint, index) => (
                  <Badge key={index} variant="outline" className="bg-green-50 border-green-200 text-green-700">
                    {breakpoint}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Design Tokens */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Palette className="w-5 h-5 mr-2 text-orange-600" />
          Design Tokens
        </h4>
        <div className="grid gap-4">
          {/* Colors */}
          {filteredData.designTokens.colors.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Colors ({filteredData.designTokens.colors.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {filteredData.designTokens.colors.slice(0, 6).map((color, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-gray-50 rounded p-2 border border-gray-200">
                    <div 
                      className="w-4 h-4 rounded border border-gray-300" 
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs font-medium text-gray-700">{color.name}</span>
                    <span className="text-xs text-gray-500">{color.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typography */}
          {filteredData.designTokens.typography.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Typography ({filteredData.designTokens.typography.length})
              </h5>
              <div className="space-y-2">
                {filteredData.designTokens.typography.slice(0, 3).map((font, index) => (
                  <div key={index} className="bg-gray-50 rounded p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{font.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {font.fontSize}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {font.fontFamily} • {font.fontWeight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spacing */}
          {filteredData.designTokens.spacing.length > 0 && (
            <div>
              <h5 className="text-md font-medium text-gray-700 mb-2 flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Spacing ({filteredData.designTokens.spacing.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {filteredData.designTokens.spacing.slice(0, 5).map((space, index) => (
                  <Badge key={index} variant="outline" className="bg-gray-50 border-gray-200 text-gray-700">
                    {space.name}: {space.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
          Analysis Summary
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-md font-medium text-gray-700 mb-2">Content Overview</h5>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• {filteredData.stats.headlines} headlines detected</li>
              <li>• {filteredData.stats.bodyText} body text sections</li>
              <li>• {filteredData.stats.buttons} call-to-action buttons</li>
              <li>• {filteredData.contentMapping.features.length} feature sections</li>
              <li>• {filteredData.contentMapping.testimonials.length} testimonials</li>
            </ul>
          </div>
          <div>
            <h5 className="text-md font-medium text-gray-700 mb-2">Design System</h5>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• {filteredData.designTokens.colors.length} color tokens</li>
              <li>• {filteredData.designTokens.typography.length} typography styles</li>
              <li>• {filteredData.designTokens.spacing.length} spacing values</li>
              <li>• {filteredData.layoutAnalysis.breakpoints.length} responsive breakpoints</li>
              <li>• {filteredData.layoutAnalysis.structure.length} page sections</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
