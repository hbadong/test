import { Router } from 'express';
import { db } from '../config/database';

const router = Router();

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings ORDER BY key').all() as Array<{ key: string; value: string; description: string }>;
  const result: Record<string, { value: string; description: string }> = {};
  for (const s of settings) {
    result[s.key] = { value: s.value, description: s.description };
  }
  res.json(result);
});

router.get('/:key', (req, res) => {
  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
  if (!setting) return res.status(404).json({ error: 'Setting not found' });
  res.json(setting);
});

router.put('/:key', (req, res) => {
  const { value } = req.body;
  const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
  if (!existing) return res.status(404).json({ error: 'Setting not found' });

  db.prepare(`
    UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?
  `).run(value, req.params.key);

  res.json({ success: true });
});

router.post('/batch', (req, res) => {
  const updates = req.body as Record<string, string>;
  const stmt = db.prepare(`
    UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?
  `);

  for (const [key, value] of Object.entries(updates)) {
    stmt.run(value, key);
  }

  res.json({ success: true });
});

export default router;
