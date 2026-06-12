'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { token, hydrated, hydrate } = useAuth();
  const router = useRouter();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (hydrated && !token) router.replace('/auth/login');
  }, [hydrated, token, router]);

  return <>{children}</>;
}
