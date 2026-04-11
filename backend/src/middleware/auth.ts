import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;
  const userId = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const secret = process.env.SESSION_SECRET || 'change-me-in-production';
  const expected = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  if (sig === expected) return userId;
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Check Bearer token (used by frontend proxy)
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const userId = verifyToken(auth.slice(7));
    if (userId) {
      req.session.userId = userId;
      return next();
    }
  }
  // Fall back to session cookie
  if (req.session?.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}
