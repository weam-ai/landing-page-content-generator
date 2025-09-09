import { NextRequest, NextResponse } from 'next/server'
import config from '../../../../config/credencial_config'

export async function POST(request: NextRequest) {
  try {
    const { businessInfo, extractedData, preferences = {} } = await request.json()

    if (!businessInfo || !extractedData) {
      return NextResponse.json(
        { success: false, error: 'Business info and extracted data are required' },
        { status: 400 }
      )
    }

    // Call the Node.js backend API
    const backendResponse = await fetch(`${config.backendUrl}/api/ai/plan-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessInfo,
        extractedData,
        preferences
      })
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json()
      throw new Error(errorData.error || 'Backend content planning failed')
    }

    const result = await backendResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Content planning completed',
      data: result.data
    })

  } catch (error) {
    console.error('❌ Content planning step failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Server error during content planning' 
      },
      { status: 500 }
    )
  }
}
