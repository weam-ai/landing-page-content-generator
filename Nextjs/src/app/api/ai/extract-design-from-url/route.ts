import { NextRequest, NextResponse } from 'next/server';
import config from '../../../../config/frontend-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      new URL(normalizedUrl);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Forward to Node.js backend
    const fullUrl = `${config.apiUrl}/ai/extract-design-from-url`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || 'Backend AI extraction failed' },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('AI URL design extraction error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return NextResponse.json(
        { success: false, error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
