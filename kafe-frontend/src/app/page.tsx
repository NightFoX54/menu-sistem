import { redirect } from 'next/navigation';

// Root URL → redirect to login; authenticated users are redirected after login
export default function RootPage() {
  redirect('/auth/login');
}
