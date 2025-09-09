import { NextRequest, NextResponse } from 'next/server'
import config from '../../../../config/credencial_config'

export async function POST(request: NextRequest) {
  try {
    const { filePath, designType = 'pdf' } = await request.json()

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      )
    }

    // Call the Node.js backend API
    const backendUrl = config.backendUrl
    const response = await fetch(`${backendUrl}/api/ai/extract-design-structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        designType
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Backend extraction failed')
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Design structure extracted and filtered successfully',
      data: result.data
    })

  } catch (error) {
    console.error('❌ Filtered design extraction failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Server error during design extraction' 
      },
      { status: 500 }
    )
  }
}
