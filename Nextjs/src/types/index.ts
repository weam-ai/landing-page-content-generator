export interface LandingPage {
  id: string
  title: string
  businessName: string
  businessOverview: string
  targetAudience: string
  brandTone?: string
  websiteUrl?: string
  createdAt: Date
  updatedAt: Date
  sections: LandingPageSection[]
  status?: 'draft' | 'published' | 'archived'
  analytics?: {
    views: number
    conversions: number
    lastViewed?: Date
  }
  settings?: {
    theme: 'light' | 'dark' | 'auto'
    customCSS?: string
    customJS?: string
  }
  tags?: string[]
  isPublic?: boolean
  designSource?: {
    type?: 'figma' | 'pdf' | 'manual'
    url?: string
    fileName?: string
    fileSize?: number
    processedAt?: Date
  }
}

export interface LandingPageSection {
  id: string
  type: string // Allow any string type from Figma
  title: string
  content: string
  order: number
  components?: {
    [key: string]: any
  }
  metadata?: any
  name?: string
  pageNumber?: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

// Comprehensive Analysis Types
export interface VisualElement {
  id: string
  type: string
  content?: string
  text?: string
  description?: string
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  typography?: {
    fontFamily: string
    fontSize: string
    fontWeight: string
    color: string
  }
  style?: {
    backgroundColor?: string
    color?: string
    borderRadius?: string
  }
  altText?: string
  fields?: Array<{
    name: string
    type: string
    label: string
    placeholder: string
  }>
}

export interface ContentMapping {
  headlines: Array<{
    id: string
    text: string
    hierarchy: string
    position: { x: number; y: number; width: number; height: number }
  }>
  bodyText: Array<{
    id: string
    content: string
    type: string
    position: { x: number; y: number; width: number; height: number }
  }>
  ctaButtons: Array<{
    id: string
    text: string
    action: string
    position: { x: number; y: number; width: number; height: number }
  }>
  navigation: Array<{
    id: string
    type: string
    items: string[]
    position: { x: number; y: number; width: number; height: number }
  }>
  features: Array<{
    id: string
    title: string
    description: string
    type: string
    position: { x: number; y: number; width: number; height: number }
  }>
  testimonials: Array<{
    id: string
    quote: string
    author: string
    rating: number
    position: { x: number; y: number; width: number; height: number }
  }>
}

export interface LayoutAnalysis {
  pageStructure: {
    header?: { present: boolean; position: { x: number; y: number; width: number; height: number } }
    hero?: { present: boolean; position: { x: number; y: number; width: number; height: number } }
    features?: { present: boolean; position: { x: number; y: number; width: number; height: number } }
    testimonials?: { present: boolean; position: { x: number; y: number; width: number; height: number } }
    cta?: { present: boolean; position: { x: number; y: number; width: number; height: number } }
    footer?: { present: boolean; position: { x: number; y: number; width: number; height: number } }
  }
  gridSystem: {
    type: string
    columns: number
    gutters: string
    margins: string
  }
  responsiveBreakpoints: Array<{
    name: string
    width: string
    present: boolean
  }>
  alignment: {
    primary: string
    secondary: string
    vertical: string
  }
  spacing: {
    sectionPadding: string
    elementMargin: string
    lineHeight: string
  }
}

export interface DesignToken {
  name: string
  value: string
  usage?: string
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
}

export interface DesignTokens {
  colors: DesignToken[]
  typography: DesignToken[]
  spacing: DesignToken[]
}

export interface ComprehensiveAnalysis {
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

export interface BusinessDetails {
  businessName: string
  businessOverview: string
  targetAudience: string
  brandTone: string
  websiteUrl?: string
  contentLength?: 'custom'
  customContentLength?: number
}

export interface UploadFile {
  type: 'figma' | 'pdf' | 'url'
  url?: string
  file?: File
}

export interface LandingPageData {
  id: string
  title: string
  businessName: string
  businessOverview: string
  targetAudience: string
  brandTone: string
  sections: LandingPageSection[]
  customCSS?: string
  customJS?: string
  meta?: {
    title?: string
    description?: string
    keywords?: string
  }
  generatedAt?: string
  model?: string
  completeHTML?: string
}
