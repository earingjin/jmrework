const express = require('express');
const db = require('../lib/db');

const router = express.Router();

async function saveToDb(events) {
  if (!db || !db.enabled) throw new Error('DB not configured');
  // events expected normalized: { id, eventName, payload, recordedAt }
  const prepared = events.map((e) => ({
    id: e.id || null,
    eventName: e.eventName || '',
    payload: e.payload || {},
    recordedAt: e.recordedAt || null,
    raw_source: 'server'
  }));
  return db.insertUsageEvents(prepared);
}

async function getFromDb(limit = 5000) {
  if (!db || !db.enabled) throw new Error('DB not configured');
  const l = Math.min(Math.max(Number(limit) || 5000, 1), 20000);
  const res = await db.query('SELECT id,event_name AS "eventName",payload AS "payload",recorded_at AS "recordedAt",created_at FROM usage_events ORDER BY recorded_at DESC LIMIT $1', [l]);
  // return in ascending order to be consistent with file-based read behaviour
  return (res.rows || []).reverse();
}

// Optional router handlers (not mounted by default here)
router.post('/usage-events', async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [req.body?.event || req.body];
    const normalized = events.map((e) => ({ id: e.id || null, eventName: e.eventName || '', payload: e.payload || {}, recordedAt: e.recordedAt || null }));
    const count = await saveToDb(normalized);
    return res.json({ saved: count });
  } catch (err) {
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

router.get('/usage-events', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5000, 1), 20000);
    const events = await getFromDb(limit);
    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: { message: String(err.message || err) } });
  }
});

module.exports = { router, saveToDb, getFromDb };
