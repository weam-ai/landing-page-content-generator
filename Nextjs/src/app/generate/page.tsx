"use client"

import { useState } from "react"
import { CompleteLandingPageGenerator } from "@/components/CompleteLandingPageGenerator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, Download, Eye, Save } from "lucide-react"
import { useRouter } from "next/navigation"

export default function GeneratePage() {
  const router = useRouter()
  
  // Demo business info
  const demoBusinessInfo = {
    businessName: "TechFlow Solutions",
    businessOverview: "We provide cutting-edge software development and digital transformation services to help businesses thrive in the digital age. Our team of experts delivers innovative solutions that drive growth and efficiency.",
    targetAudience: "Small to medium-sized businesses looking to digitize their operations and improve their online presence",
    brandTone: "professional",
    websiteUrl: "https://techflowsolutions.com"
  }

  // Demo extracted data
  const demoExtractedData = {
    sections: [
      {
        id: "section-1",
        title: "Hero Section",
        type: "hero",
        content: "Welcome to TechFlow Solutions - Your Digital Transformation Partner",
        order: 1
      },
      {
        id: "section-2", 
        title: "Services Overview",
        type: "features",
        content: "We offer comprehensive software development, cloud solutions, and digital consulting services",
        order: 2
      },
      {
        id: "section-3",
        title: "Why Choose Us",
        type: "benefits", 
        content: "Expert team, proven track record, and innovative solutions tailored to your business needs",
        order: 3
      },
      {
        id: "section-4",
        title: "Client Testimonials",
        type: "testimonials",
        content: "Hear from our satisfied clients about their success stories and the impact of our solutions",
        order: 4
      },
      {
        id: "section-5",
        title: "Get Started",
        type: "cta",
        content: "Ready to transform your business? Contact us today for a free consultation",
        order: 5
      }
    ],
    designType: "landing-page",
    metadata: {
      title: "TechFlow Solutions - Digital Transformation Services",
      author: "TechFlow Team",
      subject: "Software Development and Digital Consulting"
    },
    visualElements: {
      textBlocks: 15,
      images: 8,
      buttons: 6,
      forms: 2
    },
    contentMapping: {
      headlines: 5,
      bodyText: 12,
      ctaButtons: 3,
      navigation: 1,
      features: 4,
      testimonials: 3
    },
    layoutAnalysis: {
      gridSystem: "12-column",
      responsiveBreakpoints: 3,
      alignment: "center",
      pageStructure: {
        header: true,
        hero: true,
        features: true,
        testimonials: true,
        cta: true,
        footer: true
      }
    }
  }

  const handleGenerated = (landingPage: any) => {
    console.log('✅ Landing page generated:', landingPage)
    // You can add additional logic here, such as saving to database or redirecting
  }

  const handleSave = (landingPage: any) => {
    console.log('💾 Landing page saved:', landingPage)
    // You can add additional logic here, such as showing success message
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Landing Page Generator
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Generate professional landing pages using AI based on your business information and extracted design data
            </p>
          </div>
        </div>

        {/* Demo Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span>Demo Business Information</span>
              </CardTitle>
              <CardDescription>
                Sample business data used for demonstration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Business:</span> {demoBusinessInfo.businessName}
              </div>
              <div>
                <span className="font-medium">Target Audience:</span> {demoBusinessInfo.targetAudience}
              </div>
              <div>
                <span className="font-medium">Brand Tone:</span> 
                <Badge variant="secondary" className="ml-2">{demoBusinessInfo.brandTone}</Badge>
              </div>
              <div className="text-sm text-gray-600">
                {demoBusinessInfo.businessOverview.substring(0, 100)}...
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5 text-green-600" />
                <span>Extracted Design Data</span>
              </CardTitle>
              <CardDescription>
                Sample extracted sections and design analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Sections:</span> {demoExtractedData.sections.length}
              </div>
              <div>
                <span className="font-medium">Design Type:</span> 
                <Badge variant="outline" className="ml-2">{demoExtractedData.designType}</Badge>
              </div>
              <div>
                <span className="font-medium">Visual Elements:</span> {demoExtractedData.visualElements.textBlocks + demoExtractedData.visualElements.images + demoExtractedData.visualElements.buttons}
              </div>
              <div className="text-sm text-gray-600">
                Layout: {demoExtractedData.layoutAnalysis.gridSystem} grid system
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generator Component */}
        <CompleteLandingPageGenerator
          businessInfo={demoBusinessInfo}
          extractedData={demoExtractedData}
          onGenerated={handleGenerated}
          onSave={handleSave}
        />

        {/* Features Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <span>AI-Powered Generation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Uses advanced AI to create compelling content and design based on your business information and extracted data.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  <span>Instant Download</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Download your generated landing page as a complete HTML file ready for deployment.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  <span>Section-wise Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  View generated content section by section in beautiful cards with copy functionality.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Upload Design</h3>
              <p className="text-sm text-gray-600">Upload your PDF or Figma design to extract content and structure</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Add Business Info</h3>
              <p className="text-sm text-gray-600">Provide your business details, target audience, and brand preferences</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Generate & Preview</h3>
              <p className="text-sm text-gray-600">AI creates section-wise content and displays it in beautiful cards</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Download & Deploy</h3>
              <p className="text-sm text-gray-600">Download the HTML file and deploy it to your website</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
