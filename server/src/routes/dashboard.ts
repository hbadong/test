import { Router } from 'express';
import { db } from '../config/database';

const router = Router();

router.get('/overview', (req, res) => {
  const agentStats = db.prepare(`
    SELECT type, status, COUNT(*) as count, SUM(total_runs) as total_runs, SUM(success_count) as success_count, SUM(fail_count) as fail_count
    FROM agents GROUP BY type
  `).all();

  const contentStats = db.prepare(`
    SELECT type, status, COUNT(*) as count
    FROM contents GROUP BY type, status
  `).all();

  const leadStats = db.prepare(`
    SELECT source, intent_level, status, COUNT(*) as count
    FROM leads GROUP BY source, intent_level, status
  `).all();

  const taskStats = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM tasks WHERE created_at >= datetime('now', '-24 hours')
    GROUP BY status
  `).all();

  res.json({
    agents: agentStats,
    contents: contentStats,
    leads: leadStats,
    tasks: taskStats,
    timestamp: new Date().toISOString(),
  });
});

router.get('/agents/trend', (req, res) => {
  const trend = db.prepare(`
    SELECT name, status, total_runs, success_count, fail_count, last_run_at
    FROM agents WHERE type = 'trend'
  `).get();

  const recentContents = db.prepare(`
    SELECT title, created_at FROM contents
    WHERE source_agent_id = 'trend' ORDER BY created_at DESC LIMIT 10
  `).all();

  res.json({ agent: trend, recentContents });
});

router.get('/contents/trend', (req, res) => {
  const contents = db.prepare(`
    SELECT * FROM contents WHERE source_agent_id = 'create'
    ORDER BY created_at DESC LIMIT 20
  `).all();
  res.json(contents);
});

router.get('/leads/summary', (req, res) => {
  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count FROM leads GROUP BY source
  `).all();

  const byIntent = db.prepare(`
    SELECT intent_level, COUNT(*) as count FROM leads GROUP BY intent_level
  `).all();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM leads GROUP BY status
  `).all();

  const recent = db.prepare(`
    SELECT * FROM leads ORDER BY created_at DESC LIMIT 20
  `).all();

  res.json({ bySource, byIntent, byStatus, recent });
});

router.get('/tasks/recent', (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, a.name as agent_name
    FROM tasks t
    LEFT JOIN agents a ON t.agent_id = a.id
    ORDER BY t.created_at DESC
    LIMIT 50
  `).all();
  res.json(tasks);
});

router.get('/daily-stats', (req, res) => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];

    const tasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE date(created_at) = ?
    `).get(dateStr) as { count: number };

    const contents = db.prepare(`
      SELECT COUNT(*) as count FROM contents
      WHERE date(created_at) = ?
    `).get(dateStr) as { count: number };

    const leads = db.prepare(`
      SELECT COUNT(*) as count FROM leads
      WHERE date(created_at) = ?
    `).get(dateStr) as { count: number };

    return {
      date: dateStr,
      tasks: tasks.count,
      contents: contents.count,
      leads: leads.count,
    };
  });

  res.json(days);
});

export default router;
