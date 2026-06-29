ALTER TABLE success_case_import_batches
  ADD COLUMN IF NOT EXISTS file_mime_type text,
  ADD COLUMN IF NOT EXISTS file_size integer,
  ADD COLUMN IF NOT EXISTS file_data bytea;
