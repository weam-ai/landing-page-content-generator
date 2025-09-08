'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Navigation, 
  Target, 
  FileText, 
  Users, 
  Zap, 
  Layout, 
  Image, 
  Quote,
  Star,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DesignElement {
  type: string;
  content: string;
  title?: string;
  subtitle?: string;
  items?: string[];
}

interface BeautifulDesignViewProps {
  extractedContent: string;
  onGenerateLandingPage?: () => void;
}

const BeautifulDesignView: React.FC<BeautifulDesignViewProps> = ({ 
  extractedContent, 
  onGenerateLandingPage 
}) => {
  // Parse the extracted content to extract sections
  const parseExtractedContent = (content: string) => {
    const sections: { [key: string]: DesignElement[] } = {};
    
    // Split content by emoji headers
    const lines = content.split('\n');
    let currentSection = '';
    let currentElements: DesignElement[] = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check for section headers
      if (trimmedLine.includes('🔝 Header / Navigation')) {
        if (currentSection) {
          sections[currentSection] = currentElements;
        }
        currentSection = 'header';
        currentElements = [];
      } else if (trimmedLine.includes('🎯 Hero Section')) {
        if (currentSection) {
          sections[currentSection] = currentElements;
        }
        currentSection = 'hero';
        currentElements = [];
      } else if (trimmedLine.includes('📑 All Content Sections')) {
        if (currentSection) {
          sections[currentSection] = currentElements;
        }
        currentSection = 'content';
        currentElements = [];
      } else if (trimmedLine.includes('🤝 Social Proof')) {
        if (currentSection) {
          sections[currentSection] = currentElements;
        }
        currentSection = 'social-proof';
        currentElements = [];
      } else if (trimmedLine.includes('🚀 Call To Actions')) {
        if (currentSection) {
          sections[currentSection] = currentElements;
        }
        currentSection = 'cta';
        currentElements = [];
      } else if (trimmedLine.includes('🦶 Footer')) {
        if (currentSection) {
          sections[currentSection] = currentElements;
        }
        currentSection = 'footer';
        currentElements = [];
      } else if (trimmedLine.startsWith('- ') && currentSection) {
        // Extract element content
        const elementContent = trimmedLine.substring(2);
        if (elementContent.includes(':')) {
          const [key, value] = elementContent.split(':', 2);
          currentElements.push({
            type: key.trim(),
            content: value.trim()
          });
        } else {
          currentElements.push({
            type: 'item',
            content: elementContent
          });
        }
      }
    });
    
    // Add the last section
    if (currentSection) {
      sections[currentSection] = currentElements;
    }
    
    return sections;
  };

  const sections = parseExtractedContent(extractedContent);
  
  const getSectionIcon = (sectionType: string) => {
    switch (sectionType) {
      case 'header': return <Navigation className="w-6 h-6" />;
      case 'hero': return <Target className="w-6 h-6" />;
      case 'content': return <FileText className="w-6 h-6" />;
      case 'social-proof': return <Users className="w-6 h-6" />;
      case 'cta': return <Zap className="w-6 h-6" />;
      case 'footer': return <Layout className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
    }
  };

  const getSectionColor = (sectionType: string) => {
    switch (sectionType) {
      case 'header': return 'from-blue-500 to-blue-600';
      case 'hero': return 'from-purple-500 to-purple-600';
      case 'content': return 'from-green-500 to-green-600';
      case 'social-proof': return 'from-pink-500 to-pink-600';
      case 'cta': return 'from-red-500 to-red-600';
      case 'footer': return 'from-gray-500 to-gray-600';
      default: return 'from-indigo-500 to-indigo-600';
    }
  };

  const getSectionTitle = (sectionType: string) => {
    switch (sectionType) {
      case 'header': return 'Header / Navigation';
      case 'hero': return 'Hero Section';
      case 'content': return 'Content Sections';
      case 'social-proof': return 'Social Proof';
      case 'cta': return 'Call to Actions';
      case 'footer': return 'Footer';
      default: return sectionType;
    }
  };

  const renderElement = (element: DesignElement, index: number) => {
    if (element.content === 'Not Found' || element.content === 'Empty') {
      return (
        <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <AlertCircle className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500 italic">No content found</span>
        </div>
      );
    }

    return (
      <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            {element.type !== 'item' && (
              <div className="text-sm font-medium text-gray-600 mb-1">
                {element.type}:
              </div>
            )}
            <div className="text-gray-800">
              {element.content}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hasContent = Object.keys(sections).length > 0 && 
    Object.values(sections).some(section => section.length > 0);

  if (!hasContent) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No Design Content Found
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              The PDF analysis didn't find any recognizable design elements. 
              This might be a text-only document or the content couldn't be extracted properly.
            </p>
            {onGenerateLandingPage && (
              <Button 
                onClick={onGenerateLandingPage}
                className="mt-6 bg-blue-600 hover:bg-blue-700"
              >
                Generate Landing Page Anyway
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🎨 Extracted Design Elements
        </h2>
        <p className="text-gray-600 mb-6">
          Beautiful visualization of all design elements found in your PDF
        </p>
        {onGenerateLandingPage && (
          <Button 
            onClick={onGenerateLandingPage}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg shadow-lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Generate Landing Page
          </Button>
        )}
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(sections).map(([sectionType, elements]) => (
          <Card key={sectionType} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className={`bg-gradient-to-r ${getSectionColor(sectionType)} text-white`}>
              <CardTitle className="flex items-center gap-3">
                {getSectionIcon(sectionType)}
                <span>{getSectionTitle(sectionType)}</span>
                <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-white/30">
                  {elements.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {elements.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>No elements found</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {elements.map((element, index) => renderElement(element, index))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(sections).length}
            </div>
            <div className="text-sm text-gray-600">Section Types</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(sections).reduce((sum, section) => sum + section.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Elements</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(sections).filter(section => section.length > 0).length}
            </div>
            <div className="text-sm text-gray-600">Active Sections</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BeautifulDesignView;

