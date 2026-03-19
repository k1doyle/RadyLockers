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

function parseAdminTimestamp(value: string) {
  const sqliteTimestampPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  const normalizedValue = sqliteTimestampPattern.test(value)
    ? value.replace(' ', 'T') + 'Z'
    : value;

  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatAdminDate(value: string) {
  const parsed = parseAdminTimestamp(value);
  if (!parsed) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatAdminDateTime(value: string) {
  const parsed = parseAdminTimestamp(value);
  if (!parsed) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(parsed);
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
