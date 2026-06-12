import { redirect } from 'next/navigation';

// (admin) group root → redirect to /admin dashboard
export default function AdminGroupRoot() {
  redirect('/admin');
}
