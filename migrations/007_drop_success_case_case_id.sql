DROP INDEX IF EXISTS idx_success_cases_case_id;

ALTER TABLE success_cases
  DROP COLUMN IF EXISTS case_id;
