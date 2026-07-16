const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../lib/db');
const accountStore = require('../lib/accountStore');
const { authRequired } = require('../lib/auth');

const router = express.Router();
const communityPostFilePath = path.join(__dirname, '..', 'logs', 'community-posts.json');

function maskName(value = '') {
  const text = String(value || '상담사').trim();
  if (!text) return '상담사';
  if (text.length === 1) return '*';
  if (text.length === 2) return `${text[0]}*`;
  return `${text[0]}${'*'.repeat(text.length - 2)}${text[text.length - 1]}`;
}

function normalizePost(row, userId) {
  if (!row) return null;
  const authorId = row.author_id || row.authorId;
  return {
    id: row.id,
    authorName: maskName(row.author_name || row.authorName || row.login_id || row.loginId || '상담사'),
    content: row.content,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    isOwner: Boolean(userId && authorId && String(userId) === String(authorId))
  };
}

function cleanContent(body = {}) {
  const content = String(body.content || '').trim();
  if (!content) throw new Error('content required');
  if (content.length > 5000) throw new Error('content must be 5000 characters or less');
  return content;
}

async function readFilePosts() {
  await fs.promises.mkdir(path.dirname(communityPostFilePath), { recursive: true });
  const text = await fs.promises.readFile(communityPostFilePath, 'utf8').catch((err) => {
    if (err.code === 'ENOENT') return '{"posts":[]}';
    throw err;
  });
  const data = JSON.parse(text || '{"posts":[]}');
  return Array.isArray(data.posts) ? data.posts : [];
}

async function writeFilePosts(posts) {
  await fs.promises.mkdir(path.dirname(communityPostFilePath), { recursive: true });
  const tmpPath = `${communityPostFilePath}.tmp`;
  await fs.promises.writeFile(tmpPath, `${JSON.stringify({ posts }, null, 2)}\n`, 'utf8');
  await fs.promises.rename(tmpPath, communityPostFilePath);
}

async function currentAccount(userId) {
  if (!userId) return null;
  return accountStore.findAccountById(userId).catch(() => null);
}

function isCommunityTableMissing(err) {
  const message = String(err?.message || '');
  return err?.code === '42P01' || (message.includes('community_posts') && /does not exist|relation/i.test(message));
}

async function listFilePosts(req, res) {
  const posts = await readFilePosts();
  return res.json({
    posts: posts
      .filter((post) => post.status === 'active')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 200)
      .map((post) => normalizePost(post, req.user?.accountId))
  });
}

async function createFilePost(req, res, content) {
  const posts = await readFilePosts();
  const account = await currentAccount(req.user?.accountId);
  const now = new Date().toISOString();
  const post = {
    id: crypto.randomUUID(),
    authorId: req.user?.accountId || null,
    authorName: account?.name || account?.loginId || account?.login_id || '상담사',
    loginId: account?.loginId || account?.login_id || '',
    content,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
  posts.push(post);
  await writeFilePosts(posts);
  return res.status(201).json({ post: normalizePost(post, req.user?.accountId) });
}

async function updateFilePost(req, res, content) {
  const posts = await readFilePosts();
  const index = posts.findIndex((post) => (
    String(post.id) === String(req.params.id) &&
    String(post.authorId || post.author_id) === String(req.user?.accountId) &&
    post.status === 'active'
  ));
  if (index < 0) return res.status(404).json({ error: { message: 'Post not found or not editable' } });
  posts[index] = { ...posts[index], content, updatedAt: new Date().toISOString() };
  await writeFilePosts(posts);
  return res.json({ post: normalizePost(posts[index], req.user?.accountId) });
}

async function deleteFilePost(req, res) {
  const posts = await readFilePosts();
  const index = posts.findIndex((post) => (
    String(post.id) === String(req.params.id) &&
    String(post.authorId || post.author_id) === String(req.user?.accountId) &&
    post.status === 'active'
  ));
  if (index < 0) return res.status(404).json({ error: { message: 'Post not found or not deletable' } });
  posts[index] = {
    ...posts[index],
    status: 'deleted',
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeFilePosts(posts);
  return res.json({ success: true });
}

router.get('/community-posts', authRequired, async (req, res) => {
  try {
    if (!db.enabled) {
      return listFilePosts(req, res);
    }
    const result = await db.query(
      `SELECT p.id,p.author_id,p.content,p.created_at,p.updated_at,a.name AS author_name,a.login_id
       FROM community_posts p
       LEFT JOIN accounts a ON a.id = p.author_id
       WHERE p.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT 200`
    );
    return res.json({ posts: result.rows.map((row) => normalizePost(row, req.user?.accountId)) });
  } catch (err) {
    if (isCommunityTableMissing(err)) return listFilePosts(req, res);
    console.error('[community-posts-list-error]', err);
    return res.status(500).json({ error: { message: 'Could not list community posts' } });
  }
});

router.post('/community-posts', authRequired, async (req, res) => {
  try {
    const content = cleanContent(req.body || {});
    if (!db.enabled) {
      return createFilePost(req, res, content);
    }
    const result = await db.query(
      `INSERT INTO community_posts (author_id,content)
       VALUES ($1,$2)
       RETURNING id,author_id,content,created_at,updated_at`,
      [req.user?.accountId || null, content]
    );
    const account = await currentAccount(req.user?.accountId);
    return res.status(201).json({
      post: normalizePost({ ...result.rows[0], author_name: account?.name, login_id: account?.login_id }, req.user?.accountId)
    });
  } catch (err) {
    if (isCommunityTableMissing(err)) {
      try {
        return createFilePost(req, res, cleanContent(req.body || {}));
      } catch (fallbackErr) {
        console.error('[community-posts-create-fallback-error]', fallbackErr);
      }
    }
    console.error('[community-posts-create-error]', err);
    const status = /required|characters/.test(String(err.message || '')) ? 400 : 500;
    return res.status(status).json({ error: { message: String(err.message || err) } });
  }
});

router.put('/community-posts/:id', authRequired, async (req, res) => {
  try {
    const content = cleanContent(req.body || {});
    if (!db.enabled) {
      return updateFilePost(req, res, content);
    }
    const result = await db.query(
      `UPDATE community_posts
       SET content = $1, updated_at = now()
       WHERE id = $2 AND author_id = $3 AND status = 'active'
       RETURNING id,author_id,content,created_at,updated_at`,
      [content, req.params.id, req.user?.accountId || null]
    );
    if (!result.rows[0]) return res.status(404).json({ error: { message: 'Post not found or not editable' } });
    const account = await currentAccount(req.user?.accountId);
    return res.json({
      post: normalizePost({ ...result.rows[0], author_name: account?.name, login_id: account?.login_id }, req.user?.accountId)
    });
  } catch (err) {
    if (isCommunityTableMissing(err)) {
      try {
        return updateFilePost(req, res, cleanContent(req.body || {}));
      } catch (fallbackErr) {
        console.error('[community-posts-update-fallback-error]', fallbackErr);
      }
    }
    console.error('[community-posts-update-error]', err);
    const status = /required|characters/.test(String(err.message || '')) ? 400 : 500;
    return res.status(status).json({ error: { message: String(err.message || err) } });
  }
});

router.delete('/community-posts/:id', authRequired, async (req, res) => {
  try {
    if (!db.enabled) {
      return deleteFilePost(req, res);
    }
    const result = await db.query(
      `UPDATE community_posts
       SET status = 'deleted', deleted_at = now(), updated_at = now()
       WHERE id = $1 AND author_id = $2 AND status = 'active'`,
      [req.params.id, req.user?.accountId || null]
    );
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Post not found or not deletable' } });
    return res.json({ success: true });
  } catch (err) {
    if (isCommunityTableMissing(err)) {
      try {
        return deleteFilePost(req, res);
      } catch (fallbackErr) {
        console.error('[community-posts-delete-fallback-error]', fallbackErr);
      }
    }
    console.error('[community-posts-delete-error]', err);
    return res.status(500).json({ error: { message: 'Could not delete community post' } });
  }
});

module.exports = router;
