import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger';
import agentRoutes from './routes/agents';
import workflowRoutes from './routes/workflows';
import contentRoutes from './routes/content';
import leadRoutes from './routes/leads';
import dashboardRoutes from './routes/dashboard';
import settingRoutes from './routes/settings';
import { scheduler } from './scheduler/TaskScheduler';

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data and logs directories exist
const dataDir = path.join(process.cwd(), 'data');
const logsDir = path.join(process.cwd(), 'logs');
const uploadsDir = path.join(process.cwd(), 'uploads');
[dataDir, logsDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(process.cwd(), '../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`AI Employee System server started on port ${PORT}`);
  scheduler.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

export default app;
