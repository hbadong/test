import { Router } from 'express';
import { db } from '../config/database';

const router = Router();

router.get('/', (req, res) => {
  const { source, intent_level, status, limit = 50 } = req.query;
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params: unknown[] = [];

  if (source) { query += ' AND source = ?'; params.push(source); }
  if (intent_level) { query += ' AND intent_level = ?'; params.push(intent_level); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));

  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { source, name, company, phone, email, tags, intent_level, status, notes } = req.body;
  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(`
    INSERT INTO leads (id, source, name, company, phone, email, tags, intent_level, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, source, name, company, phone, email, JSON.stringify(tags || []), intent_level || 'unknown', status || 'new', notes);

  res.json({ id, success: true });
});

router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

router.patch('/:id', (req, res) => {
  const { status, intent_level, notes, assigned_to } = req.body;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (intent_level !== undefined) { updates.push('intent_level = ?'); values.push(intent_level); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
  if (assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(assigned_to); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  res.json({ success: true });
});

router.post('/import', (req, res) => {
  const { leads } = req.body as { leads: Array<{ source: string; name: string; company: string; phone: string; email: string }> };
  let imported = 0;

  const stmt = db.prepare(`
    INSERT INTO leads (id, source, name, company, phone, email, tags, intent_level, status)
    VALUES (?, ?, ?, ?, ?, ?, '[]', 'unknown', 'new')
  `);

  for (const lead of leads) {
    try {
      stmt.run(
        `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        lead.source || 'import',
        lead.name,
        lead.company,
        lead.phone,
        lead.email
      );
      imported++;
    } catch {
      // Skip duplicates
    }
  }

  res.json({ success: true, imported });
});

// Follow-up records
router.get('/:id/follow-ups', (req, res) => {
  const records = db.prepare(
    "SELECT * FROM lead_follow_ups WHERE lead_id = ? ORDER BY created_at DESC"
  ).all(req.params.id);
  res.json(records);
});

router.post('/:id/follow-ups', (req, res) => {
  const { type, note } = req.body;
  const id = `fu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(`
    INSERT INTO lead_follow_ups (id, lead_id, type, note)
    VALUES (?, ?, ?, ?)
  `).run(id, req.params.id, type || 'other', note);

  res.json({ id, success: true });
});

export default router;
