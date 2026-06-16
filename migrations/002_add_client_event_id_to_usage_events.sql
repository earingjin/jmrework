-- Add client_event_id column and unique index to usage_events
ALTER TABLE usage_events
  ADD COLUMN IF NOT EXISTS client_event_id text;

-- create unique index to deduplicate by client event id (nulls allowed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_usage_events_client_event_id') THEN
    CREATE UNIQUE INDEX ux_usage_events_client_event_id ON usage_events (client_event_id);
  END IF;
END$$;
