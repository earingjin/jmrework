-- Add client_counselor_id column and index to usage_events
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS client_counselor_id text;

-- create index for quick lookup by client counselor id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ix_usage_events_client_counselor_id') THEN
    CREATE INDEX ix_usage_events_client_counselor_id ON usage_events (client_counselor_id);
  END IF;
END$$;
