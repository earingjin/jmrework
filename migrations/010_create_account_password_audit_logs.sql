-- Record password changes without ever storing plaintext passwords or password hashes.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS account_password_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_account_id uuid NULL REFERENCES accounts(id) ON DELETE SET NULL,
  actor_account_id uuid NULL REFERENCES accounts(id) ON DELETE SET NULL,
  action text NOT NULL,
  source text NOT NULL,
  ip_address inet NULL,
  user_agent text NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_password_audit_target_changed_at
  ON account_password_audit_logs(target_account_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_audit_actor_changed_at
  ON account_password_audit_logs(actor_account_id, changed_at DESC);
