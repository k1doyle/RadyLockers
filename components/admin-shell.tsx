import Link from 'next/link';
import { ReactNode } from 'react';
import { logoutAdmin } from '@/app/actions';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-56 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
          <Link href="/admin" className="text-xl font-semibold text-brand-navy">
            Rady Lockers
          </Link>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Internal locker operations
          </p>
          <nav className="mt-8 space-y-2 text-sm">
            <Link href="/admin" className="block rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-900">
              Dashboard
            </Link>
          </nav>
          <form action={logoutAdmin} className="mt-auto pt-6">
            <button className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              Sign out
            </button>
          </form>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
