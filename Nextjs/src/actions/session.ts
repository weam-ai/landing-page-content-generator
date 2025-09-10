'use server';

import { getSession } from '@/config/withSession';

export async function getSessionData() {
  try {
    const session = await getSession();
    
    if (!session.user) {
      return {
        success: false,
        data: null,
        error: 'No user session found'
      };
    }

    return {
      success: true,
      data: {
        id: session.user._id,
        email: session.user.email,
        companyId: session.user.companyId
      }
    };
  } catch (error) {
    console.error('Error getting session data:', error);
    return {
      success: false,
      data: null,
      error: 'Failed to get session data'
    };
  }
}
