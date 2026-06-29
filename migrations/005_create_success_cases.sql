-- Migration: create success case database and import batch tracking

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS success_case_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text,
  total_rows integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  imported_by uuid NULL REFERENCES accounts(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS success_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_org text,
  source_year text,
  person_name text,
  serial_no text,
  current_job text NOT NULL,
  previous_career text,
  cert_training text,
  preparation text,
  activities text,
  transition_type text,
  recommended_target text,
  keywords text,
  success_factors text,
  counseling_sentence text,
  public_status text,
  source_sheet text,
  source_no text,
  source_text text,
  status text NOT NULL DEFAULT 'active',
  search_text text NOT NULL DEFAULT '',
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  import_batch_id uuid NULL REFERENCES success_case_import_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_success_cases_status ON success_cases(status);
CREATE INDEX IF NOT EXISTS idx_success_cases_current_job ON success_cases(current_job);
CREATE INDEX IF NOT EXISTS idx_success_cases_search_text ON success_cases USING gin (to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS idx_success_case_import_batches_imported_at ON success_case_import_batches(imported_at DESC);
