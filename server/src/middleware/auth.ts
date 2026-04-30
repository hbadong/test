import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-employee-system-secret-key-2026';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Optional auth: adds user to req if token is valid, but doesn't block if missing
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    // Token invalid, but continue without user
    next();
  }
}

// Required auth: blocks request if token is missing or invalid
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: '未认证', code: 'UNAUTHORIZED' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token 无效或已过期', code: 'TOKEN_EXPIRED' });
  }
}

// Role-based auth
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未认证', code: 'UNAUTHORIZED' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`User ${req.user.username} (${req.user.role}) attempted to access ${req.method} ${req.path}`);
      res.status(403).json({ error: '权限不足', code: 'FORBIDDEN' });
      return;
    }

    next();
  };
}

// Admin-only shortcut
export const requireAdmin = requireRole('admin');

function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}
