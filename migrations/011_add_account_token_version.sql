-- Add a monotonic session version without replacing or deleting existing accounts.
-- Safe to run more than once.

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS token_version integer;

UPDATE accounts
SET token_version = 0
WHERE token_version IS NULL;

ALTER TABLE accounts
  ALTER COLUMN token_version SET DEFAULT 0;

ALTER TABLE accounts
  ALTER COLUMN token_version SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounts_token_version_nonnegative'
      AND conrelid = 'accounts'::regclass
  ) THEN
    ALTER TABLE accounts
      ADD CONSTRAINT accounts_token_version_nonnegative CHECK (token_version >= 0);
  END IF;
END $$;
