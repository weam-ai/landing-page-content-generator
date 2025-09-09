import { NextRequest, NextResponse } from 'next/server'
import config from '../../../../config/credencial_config'

export async function POST(request: NextRequest) {
  try {
    const { landingPageId, downloadFormat = 'html' } = await request.json()

    if (!landingPageId) {
      return NextResponse.json(
        { success: false, error: 'Landing page ID is required' },
        { status: 400 }
      )
    }

    // Call the Node.js backend API
    const backendResponse = await fetch(`${config.backendUrl}/api/ai/download-landing-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        landingPageId,
        downloadFormat
      })
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json()
      throw new Error(errorData.error || 'Backend download preparation failed')
    }

    const result = await backendResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Landing page download prepared',
      data: result.data
    })

  } catch (error) {
    console.error('❌ Landing page download preparation step failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Server error during landing page download preparation' 
      },
      { status: 500 }
    )
  }
}