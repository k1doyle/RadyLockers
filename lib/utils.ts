import { clsx } from 'clsx';

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatFeeModel(value: string) {
  if (value === 'DEPOSIT_50_WITH_25_REFUND') return '$50 total, $25 refundable deposit';
  if (value === 'FLAT_25_NON_REFUNDABLE') return '$25 flat rental fee';
  return formatStatus(value);
}

export function getComboValue(locker: {
  combo_1: string;
  combo_2: string;
  combo_3: string;
  combo_4: string;
  combo_5: string;
  active_combo_index: number;
}) {
  const combos = [locker.combo_1, locker.combo_2, locker.combo_3, locker.combo_4, locker.combo_5];
  return combos[locker.active_combo_index - 1];
}
