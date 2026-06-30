const express = require('express');
const db = require('../lib/db');
const { adminRequired, authRequired } = require('../lib/auth');

const router = express.Router();
const NOTICE_STATUSES = new Set(['draft', 'published', 'archived']);

function normalizeNotice(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    status: row.status,
    pinned: Boolean(row.pinned),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function cleanNoticeInput(body = {}, partial = false) {
  const notice = {};
  if (!partial || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title) throw new Error('title required');
    if (title.length > 160) throw new Error('title must be 160 characters or less');
    notice.title = title;
  }
  if (!partial || body.content !== undefined) {
    const content = String(body.content || '').trim();
    if (!content) throw new Error('content required');
    if (content.length > 20000) throw new Error('content must be 20000 characters or less');
    notice.content = content;
  }
  if (!partial || body.status !== undefined) {
    const status = String(body.status || 'draft').trim();
    if (!NOTICE_STATUSES.has(status)) throw new Error('invalid status');
    notice.status = status;
  }
  if (!partial || body.pinned !== undefined) {
    notice.pinned = Boolean(body.pinned);
  }
  return notice;
}

router.get('/notices', authRequired, async (_req, res) => {
  try {
    if (!db.enabled) return res.json({ notices: [] });
    const result = await db.query(
      `SELECT id,title,content,status,pinned,created_by,created_at,updated_at
       FROM notices
       WHERE status = $1
       ORDER BY pinned DESC, created_at DESC`,
      ['published']
    );
    return res.json({ notices: result.rows.map(normalizeNotice) });
  } catch (err) {
    console.error('[notices-list-error]', err);
    return res.status(500).json({ error: { message: 'Could not list notices' } });
  }
});

router.get('/notices/public', async (_req, res) => {
  try {
    if (!db.enabled) return res.json({ notices: [] });
    const result = await db.query(
      `SELECT id,title,content,status,pinned,created_at,updated_at
       FROM notices
       WHERE status = $1
       ORDER BY pinned DESC, created_at DESC
       LIMIT 5`,
      ['published']
    );
    return res.json({ notices: result.rows.map(normalizeNotice) });
  } catch (err) {
    console.error('[notices-public-list-error]', err);
    return res.status(500).json({ error: { message: 'Could not list notices' } });
  }
});

router.get('/notices/admin', authRequired, adminRequired, async (_req, res) => {
  try {
    if (!db.enabled) return res.json({ notices: [] });
    const result = await db.query(
      `SELECT id,title,content,status,pinned,created_by,created_at,updated_at
       FROM notices
       ORDER BY pinned DESC, created_at DESC`
    );
    return res.json({ notices: result.rows.map(normalizeNotice) });
  } catch (err) {
    console.error('[notices-admin-list-error]', err);
    return res.status(500).json({ error: { message: 'Could not list notices' } });
  }
});

router.post('/notices', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const notice = cleanNoticeInput(req.body || {});
    const result = await db.query(
      `INSERT INTO notices (title,content,status,pinned,created_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,title,content,status,pinned,created_by,created_at,updated_at`,
      [notice.title, notice.content, notice.status, notice.pinned, req.user?.accountId || null]
    );
    return res.status(201).json({ notice: normalizeNotice(result.rows[0]) });
  } catch (err) {
    console.error('[notices-create-error]', err);
    const status = /required|invalid|characters/.test(String(err.message || '')) ? 400 : 500;
    return res.status(status).json({ error: { message: String(err.message || err) } });
  }
});

router.put('/notices/:id', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const notice = cleanNoticeInput(req.body || {}, true);
    const fields = [];
    const params = [];
    let idx = 1;
    ['title', 'content', 'status', 'pinned'].forEach((field) => {
      if (notice[field] !== undefined) {
        fields.push(`${field} = $${idx++}`);
        params.push(notice[field]);
      }
    });
    if (!fields.length) return res.status(400).json({ error: { message: 'No notice fields provided' } });
    fields.push('updated_at = now()');
    params.push(req.params.id);
    const result = await db.query(
      `UPDATE notices
       SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id,title,content,status,pinned,created_by,created_at,updated_at`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ error: { message: 'Notice not found' } });
    return res.json({ notice: normalizeNotice(result.rows[0]) });
  } catch (err) {
    console.error('[notices-update-error]', err);
    const status = /required|invalid|characters/.test(String(err.message || '')) ? 400 : 500;
    return res.status(status).json({ error: { message: String(err.message || err) } });
  }
});

router.delete('/notices/:id', authRequired, adminRequired, async (req, res) => {
  try {
    if (!db.enabled) return res.status(503).json({ error: { message: 'DB not configured' } });
    const result = await db.query('DELETE FROM notices WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Notice not found' } });
    return res.json({ success: true });
  } catch (err) {
    console.error('[notices-delete-error]', err);
    return res.status(500).json({ error: { message: 'Could not delete notice' } });
  }
});

module.exports = router;
