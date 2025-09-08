// Utility function to filter Gemini AI response data
export function filterAnalysisData(response: any) {
  if (!response || !response.data) return null;

  const data = response.data;

  return {
    visualElementDetection: {
      headlines: data.contentMapping?.headlines?.map((h: any) => h.text) || [],
      bodyText: data.contentMapping?.bodyText?.map((b: any) => b.content) || [],
      ctaButtons: data.contentMapping?.ctaButtons?.map((b: any) => b.text) || [],
      navigation: data.contentMapping?.navigation || [],
      features: data.contentMapping?.features || [],
      testimonials: data.contentMapping?.testimonials || []
    },

    contentMapping: {
      hero: {
        headline: data.contentMapping?.headlines?.find((h: any) => h.hierarchy === "primary")?.text || null,
        subheadlines: data.visualElements?.textBlocks
          ?.filter((t: any) => t.type === "subheadline")
          .map((t: any) => t.content) || [],
        cta: data.contentMapping?.ctaButtons?.map((b: any) => b.text) || []
      },
      features: data.contentMapping?.features || [],
      testimonials: data.contentMapping?.testimonials || [],
      faq: data.sections?.filter((s: any) => s.title.toLowerCase().includes("faq")) || [],
      contact: data.visualElements?.forms || []
    },

    layoutAnalysis: {
      structure: Object.keys(data.layoutAnalysis?.pageStructure || {}).filter(
        (key: string) => data.layoutAnalysis.pageStructure[key].present
      ),
      breakpoints: data.layoutAnalysis?.responsiveBreakpoints?.map((bp: any) => bp.width) || [],
      grid: `${data.layoutAnalysis?.gridSystem?.columns || 0}-col / ${data.layoutAnalysis?.gridSystem?.type || "unknown"}`,
      alignment: data.layoutAnalysis?.alignment || {},
      spacing: data.layoutAnalysis?.spacing || {}
    },

    designTokens: {
      colors: data.designTokens?.colors || [],
      typography: data.designTokens?.typography || [],
      spacing: data.designTokens?.spacing || []
    },

    stats: {
      textBlocks: data.comprehensiveAnalysis?.visualElementsCount?.textBlocks || 0,
      buttons: data.comprehensiveAnalysis?.visualElementsCount?.buttons || 0,
      forms: data.comprehensiveAnalysis?.visualElementsCount?.forms || 0,
      headlines: data.comprehensiveAnalysis?.contentMappingCount?.headlines || 0,
      bodyText: data.comprehensiveAnalysis?.contentMappingCount?.bodyText || 0
    }
  };
}

// Alternative function for direct API response filtering
export function filterDirectResponse(response: any) {
  // Handle both success response format and direct data format
  const data = response.success ? response.data : response;

  return {
    visualElementDetection: {
      headlines: data.contentMapping?.headlines?.map((h: any) => h.text) || [],
      bodyText: data.contentMapping?.bodyText?.map((b: any) => b.content) || [],
      ctaButtons: data.contentMapping?.ctaButtons?.map((b: any) => b.text) || [],
      navigation: data.contentMapping?.navigation || [],
      features: data.contentMapping?.features || [],
      testimonials: data.contentMapping?.testimonials || []
    },

    contentMapping: {
      hero: {
        headline: data.contentMapping?.headlines?.find((h: any) => h.hierarchy === "primary")?.text || null,
        subheadlines: data.visualElements?.textBlocks
          ?.filter((t: any) => t.type === "subheadline")
          .map((t: any) => t.content) || [],
        cta: data.contentMapping?.ctaButtons?.map((b: any) => b.text) || []
      },
      features: data.contentMapping?.features || [],
      testimonials: data.contentMapping?.testimonials || [],
      faq: data.sections?.filter((s: any) => s.title.toLowerCase().includes("faq")) || [],
      contact: data.visualElements?.forms || []
    },

    layoutAnalysis: {
      structure: Object.keys(data.layoutAnalysis?.pageStructure || {}).filter(
        (key: string) => data.layoutAnalysis.pageStructure[key].present
      ),
      breakpoints: data.layoutAnalysis?.responsiveBreakpoints?.map((bp: any) => bp.width) || [],
      grid: `${data.layoutAnalysis?.gridSystem?.columns || 0}-col / ${data.layoutAnalysis?.gridSystem?.type || "unknown"}`,
      alignment: data.layoutAnalysis?.alignment || {},
      spacing: data.layoutAnalysis?.spacing || {}
    },

    designTokens: {
      colors: data.designTokens?.colors || [],
      typography: data.designTokens?.typography || [],
      spacing: data.designTokens?.spacing || []
    },

    stats: {
      textBlocks: data.comprehensiveAnalysis?.visualElementsCount?.textBlocks || 0,
      buttons: data.comprehensiveAnalysis?.visualElementsCount?.buttons || 0,
      forms: data.comprehensiveAnalysis?.visualElementsCount?.forms || 0,
      headlines: data.comprehensiveAnalysis?.contentMappingCount?.headlines || 0,
      bodyText: data.comprehensiveAnalysis?.contentMappingCount?.bodyText || 0
    }
  };
}
