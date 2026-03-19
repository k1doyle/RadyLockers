import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_COOKIE = 'rady-lockers-admin';

function getAdminSessionValue() {
  if (!process.env.ADMIN_PASSWORD) {
    return null;
  }

  return createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex');
}

export async function isAdminAuthenticated() {
  const expectedValue = getAdminSessionValue();
  if (!expectedValue) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === expectedValue;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }
}

export async function setAdminSessionCookie() {
  const expectedValue = getAdminSessionValue();
  if (!expectedValue) {
    redirect('/admin/login?error=Admin password is not configured');
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, expectedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
