import React from 'react'
import { FilteredAnalysisDisplay } from './FilteredAnalysisDisplay'

// Sample filtered data for demonstration
const sampleFilteredData = {
  visualElementDetection: {
    headlines: [
      "Hot Recipes Categories",
      "Handpicked Recipes",
      "Instagram Promotion",
      "Footer/Credit"
    ],
    bodyText: [
      "Discover the best recipes from around the world",
      "Carefully selected recipes for every occasion",
      "Follow us on Instagram for daily recipe inspiration",
      "Made with love and fresh ingredients"
    ],
    ctaButtons: [
      "Get Started",
      "Learn More",
      "Follow Us",
      "Contact Us"
    ],
    navigation: [],
    features: [],
    testimonials: []
  },
  contentMapping: {
    hero: {
      headline: "Hot Recipes Categories",
      subheadlines: [
        "Discover amazing recipes",
        "Handpicked for you"
      ],
      cta: ["Get Started", "Learn More"]
    },
    features: [
      {
        id: "feature-1",
        title: "Handpicked Recipes",
        description: "Carefully selected recipes for every occasion",
        type: "feature",
        position: { x: 0, y: 0, width: 300, height: 200 }
      },
      {
        id: "feature-2",
        title: "Instagram Promotion",
        description: "Follow us for daily inspiration",
        type: "promotion",
        position: { x: 0, y: 0, width: 300, height: 200 }
      }
    ],
    testimonials: [
      {
        id: "testimonial-1",
        quote: "Amazing recipes that are easy to follow!",
        author: "Sarah Johnson",
        rating: 5,
        position: { x: 0, y: 0, width: 350, height: 150 }
      }
    ],
    faq: [],
    contact: []
  },
  layoutAnalysis: {
    structure: ["header", "hero", "features", "cta", "footer"],
    breakpoints: ["320px", "768px", "1200px"],
    grid: "12-col / flexbox",
    alignment: {
      primary: "left",
      secondary: "left",
      vertical: "top"
    },
    spacing: {
      sectionPadding: "60px",
      elementMargin: "20px",
      lineHeight: "1.5"
    }
  },
  designTokens: {
    colors: [
      { name: "primary", value: "#007bff", usage: "buttons|links|highlights" },
      { name: "secondary", value: "#6c757d", usage: "text|borders|backgrounds" },
      { name: "success", value: "#28a745", usage: "success|positive" },
      { name: "warning", value: "#ffc107", usage: "warnings|alerts" },
      { name: "danger", value: "#dc3545", usage: "errors|negative" },
      { name: "text", value: "#000000", usage: "headlines|body" }
    ],
    typography: [
      { name: "heading", fontFamily: "Arial, sans-serif", fontSize: "24px", fontWeight: "bold" },
      { name: "subheading", fontFamily: "Arial, sans-serif", fontSize: "20px", fontWeight: "600" },
      { name: "body", fontFamily: "Arial, sans-serif", fontSize: "16px", fontWeight: "normal" }
    ],
    spacing: [
      { name: "xs", value: "4px" },
      { name: "sm", value: "8px" },
      { name: "md", value: "16px" },
      { name: "lg", value: "24px" },
      { name: "xl", value: "32px" }
    ]
  },
  stats: {
    textBlocks: 8,
    buttons: 4,
    forms: 0,
    headlines: 4,
    bodyText: 4
  }
}

export function FilteredAnalysisDemo() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Filtered Analysis Display Demo
          </h1>
          <p className="text-gray-600 text-lg">
            This demonstrates how the filtered Gemini AI analysis data is displayed
          </p>
        </div>
        
        <FilteredAnalysisDisplay 
          filteredData={sampleFilteredData} 
          type="pdf" 
        />
      </div>
    </div>
  )
}
