import Link from 'next/link';
import { ReactNode } from 'react';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-mist text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold text-brand-navy">
            Rady Lockers
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/request">Request a Locker</Link>
            <Link href="/admin/login">Admin Login</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
