import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import agentRoutes, { initAllAgents } from './routes/agents';
import workflowRoutes from './routes/workflows';
import contentRoutes from './routes/content';
import leadRoutes from './routes/leads';
import taskRoutes from './routes/tasks';
import dashboardRoutes from './routes/dashboard';
import settingRoutes from './routes/settings';
import aiServicesRoutes from './routes/ai-services';
import { scheduler } from './scheduler/TaskScheduler';
import { optionalAuth, requireAuth } from './middleware/auth';
import { llmService } from './services/LLMService';
import { ttsService } from './services/TTSService';
import { visionService } from './services/VisionService';
import { db } from './config/database';
import { seedAllData } from './seed/seedData';

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

// API Routes - Public
app.use('/api/auth', authRoutes);

// API Routes - Protected by JWT (optional for read, required for write)
app.use('/api/auth', authRoutes);
app.use('/api/ai', optionalAuth, aiServicesRoutes);
app.use('/api/agents', optionalAuth, agentRoutes);
app.use('/api/workflows', optionalAuth, workflowRoutes);
app.use('/api/contents', optionalAuth, contentRoutes);
app.use('/api/leads', optionalAuth, leadRoutes);
app.use('/api/dashboard', optionalAuth, dashboardRoutes);
app.use('/api/settings', optionalAuth, settingRoutes);
app.use('/api/tasks', optionalAuth, taskRoutes);

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

  // Initialize AI services from database settings
  try {
    const settings = db.prepare('SELECT key, value FROM settings').all() as any[];
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    llmService.updateConfig({
      provider: (settingsMap['llm.provider'] || 'mock') as any,
      apiKey: settingsMap['llm.api_key'] || '',
      model: settingsMap['llm.model'] || 'gpt-4',
      apiUrl: settingsMap['llm.api_url'] || 'https://api.openai.com/v1',
    });

    ttsService.updateConfig({
      provider: (settingsMap['tts.provider'] || 'mock') as any,
      apiKey: settingsMap['tts.api_key'] || '',
      voice: settingsMap['tts.voice'] || 'default',
      speed: settingsMap['tts.speed'] || 'normal',
    });

    visionService.updateConfig({
      provider: (settingsMap['vision.provider'] || 'mock') as any,
      apiKey: settingsMap['vision.api_key'] || '',
      model: settingsMap['vision.model'] || 'dall-e-3',
      apiUrl: settingsMap['vision.api_url'] || 'https://api.openai.com/v1',
      style: settingsMap['vision.style'] || 'natural',
    });

    logger.info(`AI services initialized: LLM=${settingsMap['llm.provider']}, TTS=${settingsMap['tts.provider']}, Vision=${settingsMap['vision.provider']}`);
  } catch (error) {
    logger.warn(`Failed to initialize AI services: ${error}`);
  }

  initAllAgents();
  seedAllData();
  scheduler.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

export default app;
