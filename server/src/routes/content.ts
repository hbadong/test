import { Router } from 'express';
import { db } from '../config/database';

const router = Router();

router.get('/', (req, res) => {
  const { type, status, limit = 50 } = req.query;
  let query = 'SELECT * FROM contents WHERE 1=1';
  const params: unknown[] = [];

  if (type) { query += ' AND type = ?'; params.push(type); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));

  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { id, type, title, body, source_agent_id, tags, status } = req.body;
  const contentId = id || `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(`
    INSERT INTO contents (id, type, title, body, source_agent_id, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(contentId, type, title, body, source_agent_id, JSON.stringify(tags || []), status || 'draft');

  res.json({ id: contentId, success: true });
});

router.get('/:id', (req, res) => {
  const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(req.params.id);
  if (!content) return res.status(404).json({ error: 'Content not found' });
  res.json(content);
});

router.patch('/:id', (req, res) => {
  const { title, body, status, tags, metrics } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (body !== undefined) { updates.push('body = ?'); values.push(body); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
  if (metrics !== undefined) { updates.push('metrics = ?'); values.push(JSON.stringify(metrics)); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE contents SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
