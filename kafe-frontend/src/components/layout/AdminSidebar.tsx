'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin',             label: 'Dashboard',  icon: '📊' },
  { href: '/admin/menu',        label: 'Menü',        icon: '🍽️' },
  { href: '/admin/tables',      label: 'Masalar',     icon: '🪑' },
  { href: '/admin/ingredients', label: 'Malzemeler',  icon: '🥗' },
  { href: '/admin/orders',      label: 'Siparişler',  icon: '📋' },
  { href: '/admin/staff',       label: 'Personel',    icon: '👤' },
  { href: '/admin/feedback',    label: 'Yorumlar',    icon: '💬' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-gray-700">
        <span className="font-bold text-xl text-orange-400">☕ Kafe Admin</span>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
