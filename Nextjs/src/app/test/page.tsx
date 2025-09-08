import { cookies } from 'next/headers';
import { getSession } from '../../config/withSession';

export default async function CookieDisplayPage() {
  // Get the weam cookie using Next.js cookies
  const cookieStore = cookies();
  const weamCookie = cookieStore.get('weam');
  
  const session = await getSession();
  console.log('session22222222233333',session.user?.companyId);
    if (session.user) {
        return <div>Welcome, {session.user.email}!</div>;
    }
    
    return <div>Please log in</div>;
}