-- Read-only pre-deployment check for IDs that become identical after normalization.
-- Resolve every returned group manually before relying on case-insensitive login lookup.
SELECT
  lower(btrim(login_id)) AS normalized_login_id,
  count(*) AS account_count,
  array_agg(id ORDER BY id) AS account_ids,
  array_agg(login_id ORDER BY id) AS stored_login_ids
FROM accounts
GROUP BY lower(btrim(login_id))
HAVING count(*) > 1
ORDER BY normalized_login_id;
