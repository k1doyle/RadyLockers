export const programs = [
  'Full-Time MBA',
  'Executive MBA (EMBA)',
  'FlexEvening MBA',
  'Master of Quantitative Finance (MQF)',
  'Master of Business Analytics (MSBA)',
  'Master of Professional Accountancy (MPAc)',
  'PhD',
  'Other Rady Affiliate',
];

export const QUARTER_CALENDAR: { name: string; endDate: string }[] = [
  { name: 'Fall 2025',   endDate: '2025-12-13' },
  { name: 'Winter 2026', endDate: '2026-03-21' },
  { name: 'Spring 2026', endDate: '2026-06-12' },
  { name: 'Summer 2026', endDate: '2026-09-20' },
  { name: 'Fall 2026',   endDate: '2026-12-12' },
  { name: 'Winter 2027', endDate: '2027-03-20' },
  { name: 'Spring 2027', endDate: '2027-06-11' },
  { name: 'Summer 2027', endDate: '2027-09-19' },
  { name: 'Fall 2027',   endDate: '2027-12-11' },
  { name: 'Winter 2028', endDate: '2028-03-25' },
  { name: 'Spring 2028', endDate: '2028-06-16' },
  { name: 'Summer 2028', endDate: '2028-09-24' },
  { name: 'Fall 2028',   endDate: '2028-12-16' },
  { name: 'Winter 2029', endDate: '2029-03-24' },
  { name: 'Spring 2029', endDate: '2029-06-15' },
  { name: 'Summer 2029', endDate: '2029-09-23' },
  { name: 'Fall 2029',   endDate: '2029-12-15' },
  { name: 'Winter 2030', endDate: '2030-03-23' },
  { name: 'Spring 2030', endDate: '2030-06-14' },
  { name: 'Summer 2030', endDate: '2030-09-22' },
  { name: 'Fall 2030',   endDate: '2030-12-14' },
  { name: 'Winter 2031', endDate: '2031-03-22' },
  { name: 'Spring 2031', endDate: '2031-06-13' },
  { name: 'Summer 2031', endDate: '2031-09-21' },
  { name: 'Fall 2031',   endDate: '2031-12-13' },
  { name: 'Winter 2032', endDate: '2032-03-20' },
  { name: 'Spring 2032', endDate: '2032-06-11' },
  { name: 'Summer 2032', endDate: '2032-09-19' },
  { name: 'Fall 2032',   endDate: '2032-12-11' },
  { name: 'Winter 2033', endDate: '2033-03-19' },
  { name: 'Spring 2033', endDate: '2033-06-10' },
  { name: 'Summer 2033', endDate: '2033-09-18' },
  { name: 'Fall 2033',   endDate: '2033-12-10' },
  { name: 'Winter 2034', endDate: '2034-03-25' },
  { name: 'Spring 2034', endDate: '2034-06-16' },
];

// Quarters whose end date hasn't passed yet — used in dropdowns throughout the app.
export function getUpcomingQuarters(): string[] {
  const today = new Date().toISOString().slice(0, 10);
  return QUARTER_CALENDAR.filter((q) => q.endDate >= today).map((q) => q.name);
}

// Kept for backward compatibility — components that import this get upcoming quarters.
export const quarters = getUpcomingQuarters();

export const rentalPeriods = [
  'One Academic Quarter',
  'One Academic Quarter, with possible renewal request',
] as const;

export const lockerStatuses = [
  'AVAILABLE',
  'ASSIGNED',
  'PENDING_RETURN',
  'RETURNED',
  'OVERDUE',
  'DISABLED',
] as const;
