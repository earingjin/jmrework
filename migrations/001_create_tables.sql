-- Migration: create initial tables for accounts, usage_events, gemini_errors
-- Requires pgcrypto extension for gen_random_uuid()

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login_id text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  branch text,
  status text NOT NULL DEFAULT 'active',
  is_demo boolean DEFAULT false,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NULL,
  login_count integer NOT NULL DEFAULT 0,
  metadata jsonb NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  counselor_id uuid NULL REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  raw_source text NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_events_recorded_at ON usage_events(recorded_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_event_name ON usage_events(event_name);
CREATE INDEX IF NOT EXISTS idx_usage_events_counselor_id ON usage_events(counselor_id);

CREATE TABLE IF NOT EXISTS gemini_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text,
  status integer,
  message text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NULL
);

CREATE INDEX IF NOT EXISTS idx_gemini_errors_occurred_at ON gemini_errors(occurred_at);
