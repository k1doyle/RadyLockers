import { loginAdmin } from '@/app/actions';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === 'string' ? params.error : '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-blue">Staff access</p>
        <h1 className="mt-4 text-3xl font-semibold text-brand-navy">Admin login</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Enter the shared admin password to access locker inventory, assignments, and combination workflows.
        </p>
        {error ? <div className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <form action={loginAdmin} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              name="password"
              autoFocus
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </label>
          <button className="w-full rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white">Sign in</button>
        </form>
      </div>
    </main>
  );
}
