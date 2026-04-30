import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ai-employee-system-secret-key-2026';
const JWT_EXPIRES_IN = '24h';
const JWT_REFRESH_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 10;

interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string };
}

// Generate tokens
function generateTokens(user: { id: string; username: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
  return { accessToken, refreshToken };
}

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, role = 'admin' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: '用户名长度需在 3-30 个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于 6 个字符' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
      id, username, passwordHash, role
    );

    logger.info(`User registered: ${username}`);

    const { accessToken, refreshToken } = generateTokens({ id, username, role });

    res.status(201).json({
      success: true,
      data: {
        user: { id, username, role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error(`Registration error: ${error}`);
    res.status(500).json({ error: '注册失败' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    logger.info(`User logged in: ${username}`);

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, username: user.username, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error}`);
    res.status(500).json({ error: '登录失败' });
  }
});

// Refresh token
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token 不能为空' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string };

    const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(decoded.id) as any;
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    res.status(401).json({ error: 'Refresh token 无效或已过期' });
  }
});

// Get current user profile
router.get('/me', (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: '未认证' });
  }

  const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, data: user });
});

// Change password
router.post('/change-password', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于 6 个字符' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.user.id);

    logger.info(`User ${req.user.username} changed password`);
    res.json({ success: true, message: '密码已修改' });
  } catch (error) {
    logger.error(`Change password error: ${error}`);
    res.status(500).json({ error: '修改密码失败' });
  }
});

export default router;
export { JWT_SECRET, generateTokens };
export type { AuthRequest };
