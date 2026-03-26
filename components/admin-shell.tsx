import Link from 'next/link';
import { ReactNode } from 'react';
import { logoutAdmin } from '@/app/actions';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', section: 'dashboard' },
  { href: '/admin/lockers', label: 'Lockers', section: 'lockers' },
  { href: '/admin/notifications', label: 'Notifications', section: 'notifications' },
  { href: '/admin/about', label: 'System Info', section: 'about' },
] as const;

export function AdminShell({
  children,
  currentSection = 'dashboard',
}: {
  children: ReactNode;
  currentSection?: (typeof navItems)[number]['section'];
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-slate-200 bg-brand-navy px-6 py-8 text-white lg:flex">
          <Link href="/admin" className="text-2xl font-semibold text-white">
            Rady Lockers
          </Link>
          <p className="mt-3 text-sm text-slate-200">
            Internal operations dashboard for outdoor metal combination lockers.
          </p>
          <nav className="mt-10 space-y-3 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-lg px-4 py-3 font-medium transition',
                  currentSection === item.section ? 'bg-white/10 text-white' : 'text-slate-200 hover:bg-white/5 hover:text-white',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAdmin} className="mt-auto pt-6">
            <button className="w-full rounded-lg border border-white/20 px-4 py-3 text-sm font-medium">
              Sign out
            </button>
          </form>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
