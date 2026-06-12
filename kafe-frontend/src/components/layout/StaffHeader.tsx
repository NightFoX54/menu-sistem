'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface StaffHeaderProps {
  title?: string;
}

export default function StaffHeader({ title }: StaffHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 shadow-sm shrink-0">
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <Link href="/" className="font-bold text-orange-600 text-lg shrink-0">
          ☕ Kafe
        </Link>
        {title && (
          <h1 className="text-gray-700 font-medium truncate">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {user && (
          <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
}
