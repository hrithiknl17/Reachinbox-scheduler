import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './config/database';
import { redis } from './config/redis';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session with Redis store
const redisStore = new RedisStore({ client: redis as any });

app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || '';
    const avatar = profile.photos?.[0]?.value || '';

    const user = await prisma.user.upsert({
      where: { googleId: profile.id },
      update: { email, name: profile.displayName, avatar },
      create: {
        googleId: profile.id,
        email,
        name: profile.displayName,
        avatar,
      },
    });

    return done(null, user);
  } catch (err) {
    return done(err as Error);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Store userId in session after auth
app.use((req, res, next) => {
  if (req.user) {
    req.session.userId = (req.user as any).id;
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;
