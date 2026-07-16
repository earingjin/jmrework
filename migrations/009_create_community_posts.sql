-- Migration: create community posts table for authenticated user discussion

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NULL REFERENCES accounts(id) ON DELETE SET NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_community_posts_status_created_at ON community_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
