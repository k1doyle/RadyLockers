import Link from 'next/link';
import { ReactNode } from 'react';
import { logoutAdmin } from '@/app/actions';

export function AdminShell({ children }: { children: ReactNode }) {
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
            <Link href="/admin" className="block rounded-lg bg-white/10 px-4 py-3 font-medium">
              Dashboard
            </Link>
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
