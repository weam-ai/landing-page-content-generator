import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/utils/userSession';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    
    return NextResponse.json({
      success: true,
      data: {
        id: user.id.toString(),
        email: user.email,
        companyId: user.companyId.toString()
      }
    });
  } catch (error) {
    console.error('Error getting user session:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get user session'
    }, { status: 500 });
  }
}