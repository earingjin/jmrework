-- Migration: create notices table for admin announcements

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid NULL REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_pinned_created_at ON notices(pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON notices(created_at DESC);
