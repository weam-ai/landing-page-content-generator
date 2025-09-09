import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/utils/userSession'
import config from '../../../../config/frontend-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessInfo, extractedData, designType } = body

    // Get user from session
    const user = await getUserFromSession()
    // Call the Node.js backend API
    const response = await fetch(`${config.apiUrl}/ai/generate-dynamic-landing-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessInfo,
        extractedData,
        designType,
        user
      })
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const result = await response.json()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in dynamic landing page generation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}
