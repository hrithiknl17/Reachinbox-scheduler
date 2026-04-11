import { Router, Request, Response } from 'express';
import passport from 'passport';
import crypto from 'crypto';
import { getMe, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../config/database';

function signUserId(userId: string): string {
  const secret = process.env.SESSION_SECRET || 'change-me-in-production';
  const sig = crypto.createHmac('sha256', secret).update(userId).digest('hex');
  return `${userId}.${sig}`;
}

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth` }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  }
);

// Called by NextAuth frontend after login to establish backend session
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const { googleId, email, name, avatar } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Missing email' });
    return;
  }

  try {
    // Try to find existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleId || '' }, { email }] },
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleId || user.googleId, email, name: name || user.name, avatar: avatar || user.avatar },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: { googleId: googleId || email, email, name: name || email, avatar },
      });
    }

    req.session.userId = user.id;
    res.json({ ...user, token: signUserId(user.id) });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
