import type { FeeModel } from '@/lib/data';

export const STANDARD_FEE_MODEL: FeeModel = 'DEPOSIT_50_WITH_25_REFUND';
export const STANDARD_TOTAL_COST = 50;
export const STANDARD_REFUNDABLE_DEPOSIT = 25;
export const STANDARD_RENTAL_FEE = 25;

export const STANDARD_LOCKER_LOCATION = 'Outdoor metal lockers between the IT offices and MPR2';
export const lockerLocationOptions = [STANDARD_LOCKER_LOCATION] as const;

export function normalizeLockerLocation(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  return trimmed || STANDARD_LOCKER_LOCATION;
}
