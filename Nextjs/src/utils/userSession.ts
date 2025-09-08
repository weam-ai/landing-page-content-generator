import { getSession } from '@/config/withSession'
import { ObjectId } from 'mongodb'

/**
 * User object type for standardized user data
 */
export type UserObject = {
  id: ObjectId;
  email: string;
  companyId: ObjectId;
}

/**
 * Extracts user information from session and returns a standardized user object
 * @returns Promise<UserObject> - Standardized user object with default values if no session
 */
export async function getUserFromSession(): Promise<UserObject> {
  try {
    const session = await getSession();
    
    // Default user object with static values
    const defaultUser: UserObject = {
      id: new ObjectId("507f1f77bcf86cd799439011"),
      email: "default@gmail.com",
      companyId: new ObjectId("507f1f77bcf86cd799439012")
    };

    if (!session.user) {
      return defaultUser;
    }

    const user: UserObject = {
      id: session.user._id ? new ObjectId(session.user._id) : new ObjectId("507f1f77bcf86cd799439011"),
      email: session.user.email || "default@gmail.com",
      companyId: session.user.companyId ? new ObjectId(session.user.companyId) : new ObjectId("507f1f77bcf86cd799439012")
    };

    return user;
  } catch (error) {
    console.error('Error getting user from session:', error);
    // Return default user even on error
    return {
      id: new ObjectId("507f1f77bcf86cd799439011"),
      email: "default@gmail.com",
      companyId: new ObjectId("507f1f77bcf86cd799439012")
    };
  }
}
