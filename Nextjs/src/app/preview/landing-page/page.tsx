'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Eye, RefreshCw, ExternalLink, Navigation, Star, Users, MessageSquare, Phone, FileText, Zap } from 'lucide-react';
import { LandingPageData } from '@/types';

export default function LandingPagePreview() {
  const [landingPageData, setLandingPageData] = useState<LandingPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getSectionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'header':
      case 'navigation':
        return <Navigation className="h-5 w-5" />;
      case 'hero':
        return <Star className="h-5 w-5" />;
      case 'features':
        return <Zap className="h-5 w-5" />;
      case 'testimonials':
        return <MessageSquare className="h-5 w-5" />;
      case 'contact':
        return <Phone className="h-5 w-5" />;
      case 'footer':
        return <FileText className="h-5 w-5" />;
      case 'about':
        return <Users className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getSectionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'header':
      case 'navigation':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'hero':
        return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'features':
        return 'bg-green-100 text-green-600 border-green-200';
      case 'testimonials':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'contact':
        return 'bg-red-100 text-red-600 border-red-200';
      case 'footer':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'about':
        return 'bg-indigo-100 text-indigo-600 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  useEffect(() => {
    const loadLandingPage = () => {
      try {
        const stored = localStorage.getItem('latestLandingPage');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('Loaded landing page data:', parsed);
          console.log('Sections:', parsed.sections);
          setLandingPageData(parsed);
        }
      } catch (error) {
        console.error('Error loading landing page data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLandingPage();
  }, []);

  const handleDownload = () => {
    if (!landingPageData) return;

    const htmlContent = landingPageData.completeHTML || `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${landingPageData.meta?.title || 'Landing Page'}</title>
        <meta name="description" content="${landingPageData.meta?.description || ''}">
        <style>${landingPageData.customCSS || ''}</style>
      </head>
      <body>
        ${landingPageData.sections?.map(section => section.content).join('\n') || ''}
        <script>${landingPageData.customJS || ''}</script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${landingPageData.meta?.title?.toLowerCase().replace(/\s+/g, '-') || 'landing-page'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!landingPageData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mb-4">
              <Eye className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Preview Available</h2>
              <p className="text-gray-600 mb-6">No landing page data found. Please generate a landing page first.</p>
              <Button 
                onClick={() => window.close()} 
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.close()}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {landingPageData.meta?.title || 'Landing Page Preview'}
                </h1>
                <p className="text-sm text-gray-500">
                  Generated on {landingPageData.generatedAt ? new Date(landingPageData.generatedAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sections Cards Panel */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Generated Sections</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {landingPageData.sections?.length || 0} Sections
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(window.location.href, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {landingPageData.sections?.map((section, index) => (
                    <Card key={section.id} className={`border-2 hover:border-blue-300 transition-colors ${getSectionColor(section.type).split(' ')[2]}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSectionColor(section.type)}`}>
                              {getSectionIcon(section.type)}
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold text-gray-900">
                                {section.title}
                              </CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs capitalize"
                                >
                                  {section.type}
                                </Badge>
                                <span className="text-xs text-gray-500">#{index + 1}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Content Preview</label>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                              {section.content ? (
                                <p className="text-sm text-gray-800 overflow-hidden" style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 4,
                                  WebkitBoxOrient: 'vertical'
                                }}>
                                  {section.content}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400 italic">
                                  No content available for this section
                                </p>
                              )}
                              {/* Debug info */}
                              <div className="mt-2 text-xs text-gray-400">
                                Debug: Content length: {section.content?.length || 0}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Order: {section.order}</span>
                            <span>ID: {section.id}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="col-span-full">
                      <Card className="border-dashed border-2 border-gray-300">
                        <CardContent className="pt-6 text-center">
                          <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">No sections available</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Page Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Page Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {landingPageData.meta?.title || 'Untitled'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {landingPageData.meta?.description || 'No description'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Sections</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {landingPageData.sections?.length || 0} sections
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Generated</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {landingPageData.generatedAt ? new Date(landingPageData.generatedAt).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sections List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {landingPageData.sections?.map((section, index) => (
                    <div key={section.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {section.title}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {section.type}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500 text-center py-4">No sections available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleDownload} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download HTML
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(window.location.href, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
