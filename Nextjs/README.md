# Landing Page Generator

A modern, intuitive web application built with Next.js and Tailwind CSS that allows users to create beautiful landing pages from Figma files or PDFs in minutes using AI-powered content generation.

## Features

### 🎯 **Solutions Page (Landing Page)**
- **History View**: Display a list of previously created landing pages
- **Page Management**: Each entry shows title, creation date, and action options (view/edit/delete)
- **Add New Button**: Prominent button to create new landing pages
- **Empty State**: Friendly illustration and message when no pages exist

### 📤 **Upload Design Flow**
- **Figma Integration**: Import designs via Figma URL
- **PDF Upload**: Drag & drop or browse PDF files
- **Processing**: Loading indicators while Gemini API processes files
- **OCR Extraction**: Automatically extracts design layout and dummy text

### 🏢 **Business Details Form**
- **Business Information**: Name, overview, target audience
- **Brand Tone Selection**: Professional, friendly, playful, authoritative, casual
- **Auto-generation**: Extract details from existing website URLs
- **Responsive Design**: Clean, accessible form layouts

### 🤖 **AI Content Generation**
- **Smart Generation**: Creates relevant content based on business details
- **Section-based**: Hero, features, testimonials, CTA sections
- **Loading States**: Visual feedback during content generation
- **Regeneration**: Individual section regeneration capabilities

### ✏️ **Review & Edit**
- **Inline Editing**: Edit generated content section by section
- **Regenerate Options**: Per-section content regeneration
- **Save Management**: Save individual changes or all at once
- **Summary Bar**: Quick access to save, edit, and cancel actions

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React
- **State Management**: React hooks and local state
- **TypeScript**: Full type safety throughout the application

## Design System

The application follows the same design system as the go-custom-nextjs project:

- **Color Palette**: Primary purple (#6637EC), neutral grays, semantic colors
- **Typography**: Inter font family with consistent sizing
- **Components**: Modern, accessible components with subtle animations
- **Responsive**: Mobile-first design with responsive breakpoints
- **Accessibility**: ARIA labels, keyboard navigation, focus management

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   cd Solution
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
Solution/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main solutions page
│   ├── components/             # React components
│   │   ├── ui/                # Base UI components
│   │   ├── UploadDesignModal.tsx
│   │   ├── BusinessDetailsForm.tsx
│   │   └── LandingPageEditor.tsx
│   ├── lib/                   # Utility functions
│   │   └── utils.ts           # Class name utilities
│   └── types/                 # TypeScript types
│       └── index.ts           # Application types
├── public/                    # Static assets
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Key Components

### `UploadDesignModal`
Multi-step modal for the upload and processing flow:
- File upload with drag & drop
- Figma URL import
- Processing states
- Business details collection

### `BusinessDetailsForm`
Comprehensive form for business information:
- Required and optional fields
- Auto-generation from website URLs
- Form validation
- Brand tone selection

### `LandingPageEditor`
Full-featured editor for generated content:
- Section-by-section editing
- Content regeneration
- Inline editing interface
- Save management

## Customization

### Adding New Section Types
1. Update the `LandingPageSection` type in `types/index.ts`
2. Add new section handling in `LandingPageEditor.tsx`
3. Update the `getSectionIcon` function

### Modifying the Design System
1. Update colors in `tailwind.config.js`
2. Modify component variants in UI components
3. Update global styles in `globals.css`

### Adding New Features
1. Create new components in the `components/` directory
2. Update types as needed
3. Integrate with existing state management

## API Integration

The application is designed to integrate with:
- **Gemini API**: For content generation and processing
- **File Storage**: For PDF and design file handling
- **Database**: For storing landing page data

Current implementation includes simulated API calls that can be replaced with real endpoints.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Ensure responsive design for all components
4. Add proper accessibility attributes
5. Test across different screen sizes

## License

This project is part of the go-custom-nextjs solution and follows the same licensing terms.

## Support

For questions or issues, please refer to the main project documentation or create an issue in the repository.
