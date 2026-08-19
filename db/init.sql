-- OHJTrack PostgreSQL schema
-- This file is safe to run more than once.

-- Used by the current Express API. Keep this table while the frontend saves
-- each collection as JSON through /api/storage.
CREATE TABLE IF NOT EXISTS app_storage (
  store_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts and OJT profile details
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coordinator', 'trainee')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  department TEXT,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  photo TEXT,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS trainee_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT,
  campus TEXT,
  program TEXT,
  block TEXT,
  company TEXT,
  supervisor TEXT,
  coordinator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  required_hours NUMERIC(8,2) NOT NULL DEFAULT 486,
  official_hours TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_data TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  remarks TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- One record per trainee and month. Individual day fields are kept in JSONB
-- because the current UI stores a flexible set of time-in/out and photo values.
CREATE TABLE IF NOT EXISTS daily_time_records (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  entries JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trainee_id, month)
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  coordinator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience_count INTEGER NOT NULL DEFAULT 0 CHECK (audience_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachment TEXT,
  attachment_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  score NUMERIC(5,2),
  feedback TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  trainee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  letter_type TEXT NOT NULL CHECK (letter_type IN ('Overtime', 'Excuse')),
  letter_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  remark TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_name TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  school_name TEXT NOT NULL,
  campus TEXT,
  address TEXT,
  tagline TEXT,
  logo TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_trainee_id_idx ON documents (trainee_id);
CREATE INDEX IF NOT EXISTS dtr_trainee_month_idx ON daily_time_records (trainee_id, month);
CREATE INDEX IF NOT EXISTS notifications_trainee_read_idx ON notifications (trainee_id, is_read);
CREATE INDEX IF NOT EXISTS weekly_reports_trainee_id_idx ON weekly_reports (trainee_id);
CREATE INDEX IF NOT EXISTS letters_trainee_id_idx ON letters (trainee_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);

ALTER TABLE trainee_profiles ADD COLUMN IF NOT EXISTS official_hours TEXT;

-- `data` preserves the frontend's complete JSON object while the named columns
-- above provide a path for progressively normalizing reports and queries.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE daily_time_records ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE institution_settings ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE weekly_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE letters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- The API stores the complete client record in `data`; these columns are optional
-- until the API is expanded to populate each normalized field individually.
ALTER TABLE documents ALTER COLUMN trainee_id DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN document_type DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN title DROP NOT NULL;
ALTER TABLE daily_time_records ALTER COLUMN trainee_id DROP NOT NULL;
ALTER TABLE daily_time_records ALTER COLUMN month DROP NOT NULL;
ALTER TABLE announcements ALTER COLUMN coordinator_id DROP NOT NULL;
ALTER TABLE announcements ALTER COLUMN title DROP NOT NULL;
ALTER TABLE announcements ALTER COLUMN message DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN trainee_id DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN title DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL;
ALTER TABLE weekly_reports ALTER COLUMN trainee_id DROP NOT NULL;
ALTER TABLE weekly_reports ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE weekly_reports ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE weekly_reports ALTER COLUMN title DROP NOT NULL;
ALTER TABLE weekly_reports ALTER COLUMN content DROP NOT NULL;
ALTER TABLE letters ALTER COLUMN trainee_id DROP NOT NULL;
ALTER TABLE letters ALTER COLUMN letter_type DROP NOT NULL;
ALTER TABLE letters ALTER COLUMN letter_date DROP NOT NULL;
ALTER TABLE letters ALTER COLUMN reason DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN actor_name DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN action DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN target_name DROP NOT NULL;
ALTER TABLE institution_settings ALTER COLUMN school_name DROP NOT NULL;
