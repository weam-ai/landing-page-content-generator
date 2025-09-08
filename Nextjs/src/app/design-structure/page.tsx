'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DesignStructureDisplay from '@/components/DesignStructureDisplay';
import BeautifulDesignView from '@/components/BeautifulDesignView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { ArrowLeft, Download, Eye } from 'lucide-react';
import { api } from '@/lib/utils';

interface DesignStructureData {
  designType: string;
  totalSections: number;
  sections: {
    [key: string]: string[];
  };
  sectionTypes: string[];
  summary: {
    totalSectionTypes: number;
    totalContentElements: number;
  };
}

export default function DesignStructurePage() {
  const searchParams = useSearchParams();
  const [designData, setDesignData] = useState<DesignStructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<{type: string, elements: string[]} | null>(null);
  const [viewMode, setViewMode] = useState<'structured' | 'beautiful'>('beautiful');
  const [rawExtractedContent, setRawExtractedContent] = useState<string>('');

  useEffect(() => {
    const filePath = searchParams.get('filePath');
    const designType = searchParams.get('designType') || 'pdf';

    if (!filePath) {
      setError('No file path provided');
      setLoading(false);
      return;
    }

    extractDesignStructure(filePath, designType);
  }, [searchParams]);

  const extractDesignStructure = async (filePath: string, designType: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(api('/ai/extract-design-structure'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          designType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract design structure');
      }

      const result = await response.json();
      setDesignData(result.data);
      
      // Also get the raw extracted content for beautiful view
      try {
        const rawResponse = await fetch(api('/ai/extract-pdf'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath,
            designType
          }),
        });
        
        if (rawResponse.ok) {
          const rawResult = await rawResponse.json();
          // Extract the raw content from the response
          if (rawResult.data?.comprehensiveAnalysis) {
            setRawExtractedContent(JSON.stringify(rawResult.data.comprehensiveAnalysis, null, 2));
          }
        }
      } catch (err) {
        console.log('Could not fetch raw content:', err);
      }
    } catch (err) {
      console.error('Error extracting design structure:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSelect = (sectionType: string, elements: string[]) => {
    setSelectedSection({ type: sectionType, elements });
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleGenerateLandingPage = () => {
    // Store the design data for landing page generation
    if (designData) {
      localStorage.setItem('extractedDesignStructure', JSON.stringify(designData));
      // Redirect to generation page or open modal
      window.location.href = '/generate';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600">Analyzing design structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!designData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">No design structure data available</p>
            <Button onClick={handleBack} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button onClick={handleBack} variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Design Structure Analysis
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button 
                  onClick={() => setViewMode('beautiful')}
                  variant={viewMode === 'beautiful' ? 'default' : 'ghost'}
                  size="sm"
                  className={viewMode === 'beautiful' ? 'bg-white shadow-sm' : ''}
                >
                  Beautiful View
                </Button>
                <Button 
                  onClick={() => setViewMode('structured')}
                  variant={viewMode === 'structured' ? 'default' : 'ghost'}
                  size="sm"
                  className={viewMode === 'structured' ? 'bg-white shadow-sm' : ''}
                >
                  Structured View
                </Button>
              </div>
              <Button onClick={handleGenerateLandingPage} className="bg-blue-600 hover:bg-blue-700">
                <Eye className="w-4 h-4 mr-2" />
                Generate Landing Page
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        {viewMode === 'beautiful' ? (
          <BeautifulDesignView 
            extractedContent={rawExtractedContent || 'No content available'}
            onGenerateLandingPage={handleGenerateLandingPage}
          />
        ) : (
          <DesignStructureDisplay 
            data={designData} 
            onSectionSelect={handleSectionSelect}
          />
        )}
      </div>

      {/* Selected Section Modal */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{selectedSection.type} Elements</CardTitle>
                <Button 
                  onClick={() => setSelectedSection(null)} 
                  variant="ghost" 
                  size="sm"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-3">
                {selectedSection.elements.map((element, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="text-sm text-gray-700">
                      {element}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
