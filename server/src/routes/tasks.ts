import { Router } from 'express';
import { db } from '../config/database';

const router = Router();

// Get tasks with optional filtering
router.get('/', (req, res) => {
  const { agent_id, workflow_id, status, limit = 50 } = req.query;
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: unknown[] = [];

  if (agent_id) { query += ' AND agent_id = ?'; params.push(agent_id); }
  if (workflow_id) { query += ' AND workflow_id = ?'; params.push(workflow_id); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY started_at DESC LIMIT ?';
  params.push(Number(limit));

  res.json(db.prepare(query).all(...params));
});

export default router;
