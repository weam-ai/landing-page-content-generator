import { NextRequest, NextResponse } from 'next/server'
import config from '../../../../config/credencial_config'

export async function POST(request: NextRequest) {
  try {
    const { landingPageId, previewOptions = {} } = await request.json()

    if (!landingPageId) {
      return NextResponse.json(
        { success: false, error: 'Landing page ID is required' },
        { status: 400 }
      )
    }

    // Call the Node.js backend API
    const backendResponse = await fetch(`${config.backendUrl}/api/ai/preview-landing-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        landingPageId,
        previewOptions
      })
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json()
      throw new Error(errorData.error || 'Backend preview generation failed')
    }

    const result = await backendResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Landing page preview generated',
      data: result.data
    })

  } catch (error) {
    console.error('❌ Landing page preview step failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Server error during landing page preview' 
      },
      { status: 500 }
    )
  }
}
