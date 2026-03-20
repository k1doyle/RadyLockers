export const REQUEST_SUBMISSION_UNAVAILABLE_MESSAGE =
  'Live locker request submission is temporarily unavailable on this production site while requests still depend on a local SQLite database. No request will be saved from this form right now.';

export function areRequestSubmissionsAvailable() {
  return !process.env.VERCEL;
}
