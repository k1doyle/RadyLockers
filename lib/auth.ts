import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const ADMIN_COOKIE = 'rady-lockers-admin';

// Simple in-memory rate limiter for login attempts.
// Tracks failed attempts per IP — 5 failures triggers a 15-minute lockout.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface LoginAttempts {
  count: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, LoginAttempts>();

export function checkLoginRateLimit(ip: string): { blocked: boolean; minutesLeft?: number } {
  const entry = loginAttempts.get(ip);
  if (!entry) return { blocked: false };

  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    const minutesLeft = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    return { blocked: true, minutesLeft };
  }

  return { blocked: false };
}

export function recordFailedLogin(ip: string): void {
  const entry = loginAttempts.get(ip) ?? { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(ip, entry);
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === 'authenticated';
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login');
  }
}
