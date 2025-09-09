import { NextRequest, NextResponse } from 'next/server'
import config from '../../../../config/credencial_config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Landing page ID is required' },
        { status: 400 }
      )
    }

    // Forward to Node.js backend
    const response = await fetch(`${config.backendUrl}/api/landing-pages/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch landing page' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching landing page:', error)
    return NextResponse.json(
      { error: 'Failed to fetch landing page' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Landing page ID is required' },
        { status: 400 }
      )
    }

    // Forward to Node.js backend
    const response = await fetch(`${config.backendUrl}/api/landing-pages/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Backend error:', errorData)
      return NextResponse.json(
        { error: errorData.error || 'Failed to update landing page' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error updating landing page:', error)
    return NextResponse.json(
      { error: 'Failed to update landing page' },
      { status: 500 }
    )
  }
}
