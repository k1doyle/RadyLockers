PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lockers (
  locker_id INTEGER PRIMARY KEY AUTOINCREMENT,
  locker_number TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  locker_type TEXT NOT NULL DEFAULT 'OUTDOOR_METAL_COMBINATION',
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  combo_1 TEXT NOT NULL,
  combo_2 TEXT NOT NULL,
  combo_3 TEXT NOT NULL,
  combo_4 TEXT NOT NULL,
  combo_5 TEXT NOT NULL,
  active_combo_index INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  disabled_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
  request_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  ucsd_email TEXT NOT NULL,
  pid_or_student_id TEXT NOT NULL,
  program TEXT NOT NULL,
  requested_quarter TEXT NOT NULL,
  request_status TEXT NOT NULL DEFAULT 'SUBMITTED',
  assigned_locker_id INTEGER,
  assignment_start_date TEXT,
  assignment_end_date TEXT,
  returned_date TEXT,
  return_verified_by TEXT,
  renewal_requested INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  fee_model TEXT NOT NULL DEFAULT 'FLAT_25_NON_REFUNDABLE',
  amount_charged INTEGER NOT NULL DEFAULT 25,
  refundable_amount INTEGER NOT NULL DEFAULT 0,
  refund_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
  refund_date TEXT,
  payment_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_locker_id) REFERENCES lockers(locker_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locker_id INTEGER,
  assignment_id INTEGER,
  FOREIGN KEY (locker_id) REFERENCES lockers(locker_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(request_id)
);

CREATE INDEX IF NOT EXISTS idx_lockers_status ON lockers(status);
CREATE INDEX IF NOT EXISTS idx_lockers_location ON lockers(location);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(request_status);
CREATE INDEX IF NOT EXISTS idx_assignments_locker ON assignments(assigned_locker_id);
CREATE INDEX IF NOT EXISTS idx_assignments_quarter ON assignments(requested_quarter);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_one_active_per_locker
ON assignments(assigned_locker_id)
WHERE request_status = 'ASSIGNED' AND assigned_locker_id IS NOT NULL;
