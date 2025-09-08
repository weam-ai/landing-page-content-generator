import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { businessInfo, extractedData, preferences = {}, stepData = {} } = await request.json()

    if (!businessInfo || !extractedData) {
      return NextResponse.json(
        { success: false, error: 'Business info and extracted data are required' },
        { status: 400 }
      )
    }

    // Call the Node.js backend API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 seconds timeout

    const backendResponse = await fetch(`${process.env.NODEJS_API_URL || 'http://localhost:5000'}/api/ai/generate-landing-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessInfo,
        extractedData,
        preferences,
        stepData
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json()
      throw new Error(errorData.error || 'Backend landing page generation failed')
    }

    const result = await backendResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Landing page generation completed',
      data: result.data
    })

  } catch (error) {
    console.error('❌ Landing page generation step failed:', error)
    
    // Handle specific error types
    let errorMessage = 'Server error during landing page generation';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Landing page generation timeout: The process took too long. Please try with simpler content or fewer sections.';
        statusCode = 408;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to the landing page generation service. Please check your connection and try again.';
        statusCode = 503;
      } else if (error.message.includes('security') || error.message.includes('blocked') || error.message.includes('403 Forbidden')) {
        errorMessage = 'The website is blocking automated access. This is common for websites that protect against scraping. Please try a different website or provide business information manually.';
        statusCode = 403;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}