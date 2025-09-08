'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

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

interface DesignStructureDisplayProps {
  data: DesignStructureData;
  onSectionSelect?: (sectionType: string, elements: string[]) => void;
}

const DesignStructureDisplay: React.FC<DesignStructureDisplayProps> = ({ 
  data, 
  onSectionSelect 
}) => {
  const getSectionIcon = (sectionType: string) => {
    switch (sectionType.toLowerCase()) {
      case 'header':
        return '🔝';
      case 'hero':
        return '🎯';
      case 'content':
        return '📄';
      case 'footer':
        return '🔻';
      case 'features':
        return '⭐';
      case 'testimonials':
        return '💬';
      case 'cta':
        return '📢';
      default:
        return '📋';
    }
  };

  const getSectionColor = (sectionType: string) => {
    switch (sectionType.toLowerCase()) {
      case 'header':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'hero':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'content':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'footer':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      case 'features':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'testimonials':
        return 'bg-pink-50 border-pink-200 text-pink-800';
      case 'cta':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-indigo-50 border-indigo-200 text-indigo-800';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Design Structure Analysis
        </h2>
        <p className="text-gray-600">
          Found {data.totalSections} sections across {data.summary.totalSectionTypes} different types
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant="outline" className="px-3 py-1">
            {data.designType.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            {data.summary.totalContentElements} Elements
          </Badge>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(data.sections).map(([sectionType, elements]) => (
          <Card 
            key={sectionType}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${getSectionColor(sectionType)}`}
            onClick={() => onSectionSelect?.(sectionType, elements)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{getSectionIcon(sectionType)}</span>
                <span className="capitalize">{sectionType}</span>
                <Badge variant="secondary" className="ml-auto">
                  {elements.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {elements.slice(0, 5).map((element, index) => (
                  <div 
                    key={index}
                    className="text-sm p-2 bg-white/50 rounded-md border border-white/20"
                  >
                    <span className="font-medium text-gray-700">
                      {element.length > 50 ? `${element.substring(0, 50)}...` : element}
                    </span>
                  </div>
                ))}
                {elements.length > 5 && (
                  <div className="text-xs text-gray-500 text-center pt-2">
                    +{elements.length - 5} more elements
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{data.totalSections}</div>
            <div className="text-sm text-gray-600">Total Sections</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{data.summary.totalSectionTypes}</div>
            <div className="text-sm text-gray-600">Section Types</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{data.summary.totalContentElements}</div>
            <div className="text-sm text-gray-600">Content Elements</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DesignStructureDisplay;
