'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/auth';

const TABS = [
  { href: '/dashboard', label: 'Items' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/analytics', label: 'Analytics' },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="dash-nav">
      <div className="dash-tabs">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`dash-tab ${pathname === t.href ? 'active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <button className="btn btn-sm btn-outline" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
