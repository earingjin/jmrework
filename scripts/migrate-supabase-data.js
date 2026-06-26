require('dotenv').config();

const { Pool } = require('pg');

const sourceUrl = process.env.OLD_DATABASE_URL || process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.NEW_DATABASE_URL || process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

function requireUrl(name, value) {
  if (!value) {
    throw new Error(`${name} is required. Set OLD_DATABASE_URL for the source and DATABASE_URL for the target.`);
  }
}

function createPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function tableExists(pool, tableName) {
  const result = await pool.query(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public' and table_name = $1
    ) as exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function copyAccounts(source, target) {
  if (!(await tableExists(source, 'accounts')) || !(await tableExists(target, 'accounts'))) {
    return { table: 'accounts', skipped: true, reason: 'table missing' };
  }

  const { rows } = await source.query(`
    select id, login_id, password_hash, name, role, branch, status, is_demo, source,
           created_at, last_login_at, login_count, metadata
    from accounts
    order by created_at asc
  `);

  let insertedOrUpdated = 0;
  for (const part of chunk(rows, 100)) {
    const params = [];
    const values = part.map((row, index) => {
      const offset = index * 13;
      params.push(
        row.id,
        row.login_id,
        row.password_hash,
        row.name,
        row.role,
        row.branch,
        row.status,
        row.is_demo,
        row.source,
        row.created_at,
        row.last_login_at,
        row.login_count,
        row.metadata
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`;
    });

    const result = await target.query(`
      insert into accounts (
        id, login_id, password_hash, name, role, branch, status, is_demo, source,
        created_at, last_login_at, login_count, metadata
      )
      values ${values.join(',')}
      on conflict (login_id) do update set
        password_hash = excluded.password_hash,
        name = excluded.name,
        role = excluded.role,
        branch = excluded.branch,
        status = excluded.status,
        is_demo = excluded.is_demo,
        source = excluded.source,
        created_at = least(accounts.created_at, excluded.created_at),
        last_login_at = greatest(accounts.last_login_at, excluded.last_login_at),
        login_count = greatest(accounts.login_count, excluded.login_count),
        metadata = excluded.metadata
    `, params);
    insertedOrUpdated += result.rowCount || 0;
  }

  return { table: 'accounts', read: rows.length, insertedOrUpdated };
}

async function copyUsageEvents(source, target) {
  if (!(await tableExists(source, 'usage_events')) || !(await tableExists(target, 'usage_events'))) {
    return { table: 'usage_events', skipped: true, reason: 'table missing' };
  }

  const { rows } = await source.query(`
    select id, client_event_id, event_name, payload, recorded_at, counselor_id,
           client_counselor_id, created_at, raw_source
    from usage_events
    order by recorded_at asc
  `);

  let inserted = 0;
  for (const part of chunk(rows, 100)) {
    const params = [];
    const values = part.map((row, index) => {
      const offset = index * 9;
      params.push(
        row.id,
        row.client_event_id,
        row.event_name,
        JSON.stringify(row.payload || {}),
        row.recorded_at,
        row.counselor_id,
        row.client_counselor_id,
        row.created_at,
        row.raw_source
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
    });

    const result = await target.query(`
      insert into usage_events (
        id, client_event_id, event_name, payload, recorded_at, counselor_id,
        client_counselor_id, created_at, raw_source
      )
      values ${values.join(',')}
      on conflict do nothing
    `, params);
    inserted += result.rowCount || 0;
  }

  return { table: 'usage_events', read: rows.length, inserted };
}

async function copyGeminiErrors(source, target) {
  if (!(await tableExists(source, 'gemini_errors')) || !(await tableExists(target, 'gemini_errors'))) {
    return { table: 'gemini_errors', skipped: true, reason: 'table missing' };
  }

  const { rows } = await source.query(`
    select id, model, status, message, occurred_at, payload
    from gemini_errors
    order by occurred_at asc
  `);

  let inserted = 0;
  for (const part of chunk(rows, 100)) {
    const params = [];
    const values = part.map((row, index) => {
      const offset = index * 6;
      params.push(row.id, row.model, row.status, row.message, row.occurred_at, JSON.stringify(row.payload || null));
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::jsonb)`;
    });

    const result = await target.query(`
      insert into gemini_errors (id, model, status, message, occurred_at, payload)
      values ${values.join(',')}
      on conflict do nothing
    `, params);
    inserted += result.rowCount || 0;
  }

  return { table: 'gemini_errors', read: rows.length, inserted };
}

async function countTables(pool) {
  const counts = {};
  for (const table of ['accounts', 'usage_events', 'gemini_errors']) {
    if (await tableExists(pool, table)) {
      const result = await pool.query(`select count(*)::int as count from ${table}`);
      counts[table] = result.rows[0].count;
    }
  }
  return counts;
}

async function main() {
  requireUrl('OLD_DATABASE_URL', sourceUrl);
  requireUrl('DATABASE_URL', targetUrl);
  if (sourceUrl === targetUrl) throw new Error('Source and target database URLs are the same.');

  const source = createPool(sourceUrl);
  const target = createPool(targetUrl);

  try {
    await source.query('select 1');
    await target.query('select 1');

    const before = await countTables(target);
    const results = [
      await copyAccounts(source, target),
      await copyUsageEvents(source, target),
      await copyGeminiErrors(source, target)
    ];
    const after = await countTables(target);

    console.log(JSON.stringify({ ok: true, before, results, after }, null, 2));
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message, code: error.code || null }, null, 2));
  process.exit(1);
});
