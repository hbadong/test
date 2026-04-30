import { Router } from 'express';
import { db } from '../config/database';
import { workflowEngine } from '../scheduler/WorkflowEngine';

const router = Router();

router.get('/', (req, res) => {
  const workflows = db.prepare('SELECT * FROM workflows ORDER BY created_at DESC').all();
  res.json(workflows);
});

router.get('/:id', (req, res) => {
  const wf = db.prepare('SELECT * FROM workflows WHERE id = ?').get(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});

router.post('/', async (req, res) => {
  const { name, description, nodes, edges, triggerType, triggerConfig } = req.body;
  try {
    const id = await workflowEngine.create(name, description, nodes, edges, triggerType, triggerConfig);
    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/:id/toggle', async (req, res) => {
  const { active } = req.body;
  await workflowEngine.toggle(req.params.id, active);
  res.json({ success: true });
});

router.post('/:id/execute', async (req, res) => {
  const result = await workflowEngine.execute(req.params.id, req.body.input);
  res.json({ success: result });
});

router.delete('/:id', async (req, res) => {
  await workflowEngine.delete(req.params.id);
  res.json({ success: true });
});

export default router;
