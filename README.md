# ONB — Email Scheduler

A production-grade bulk email scheduling system built for the ReachInbox assignment.
Schedule thousands of cold emails with rate limiting, persistence across restarts, and a live dashboard.

---

## Demo Video

> See the landing page hero or `/frontend/public/onb.mp4` for a full walkthrough.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL + Redis via Docker Compose)
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))

### 1. Clone & install

```bash
git clone <repo-url>
cd reachinbox-scheduler

cd backend && npm install
cd ../frontend && npm install
```

### 2. Start infrastructure

```bash
# From root — starts PostgreSQL and Redis
docker compose up -d
```

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in values — see Environment Variables section below
```

### 4. Run database migrations

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Start the backend

```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

### 6. Start the BullMQ worker (separate terminal)

```bash
cd backend
npx ts-node src/workers/emailWorker.ts
```

### 7. Start the frontend

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/reachinbox` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `SESSION_SECRET` | Express session secret (any random string) | `supersecret123` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | From Google Cloud Console |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:3000` |
| `PORT` | Backend port | `3001` |
| `WORKER_CONCURRENCY` | BullMQ worker concurrency | `5` |
| `MAX_EMAILS_PER_HOUR` | Global rate limit per hour | `200` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Per-sender rate limit per hour | `50` |

### Frontend — `frontend/.env.local`

| Variable | Description | Example |
|---|---|---|
| `NEXTAUTH_URL` | Full URL of the frontend | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth secret (any random string) | `anothersecret456` |
| `GOOGLE_CLIENT_ID` | Same Google OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Same Google OAuth client secret | From Google Cloud Console |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001` |

### Setting up Ethereal Email

Ethereal is a fake SMTP service — emails are captured and never delivered to real inboxes.

1. No manual setup required — the worker auto-creates a test account on first run via `nodemailer.createTestAccount()`
2. After each email sends, a **preview URL** is saved to the database and shown in the dashboard
3. Click **"Open in Ethereal"** on any sent email to see the full rendered email

To use a fixed Ethereal account instead of auto-generating one:
1. Go to [ethereal.email](https://ethereal.email) and create an account
2. Add to `backend/.env`:
```
ETHEREAL_USER=your@ethereal.email
ETHEREAL_PASS=yourpassword
```

---

## Architecture Overview

### How Scheduling Works

```
POST /api/emails/schedule
        │
        ▼
  Returns 202 immediately (no client wait)
        │
        ▼  background via setImmediate
  processEmailBatch()
        │
        ├── prisma.email.createMany()    ← batch DB insert in chunks of 100
        │
        └── emailQueue.addBulk()         ← batch Redis insert in chunks of 100
                │
                ▼
         BullMQ delayed job
         (fires at scheduledAt time)
                │
                ▼
         emailWorker processes it
                │
                ├── sendMail() via Nodemailer + Ethereal
                │
                └── prisma.email.update({ status: SENT, previewUrl })
```

Each email gets a deterministic `jobId` (`email-{uuid}`) as an **idempotency key** — BullMQ will never enqueue a duplicate even if the server crashes mid-batch and restarts.

### How Persistence on Restart Works

BullMQ stores all jobs in **Redis**, not in memory. When the server or worker restarts:

- **Delayed jobs** (not yet due) remain in Redis and fire at their scheduled time
- **Active jobs** (mid-processing) are retried automatically by the next worker instance
- **Completed/Failed** jobs remain in Redis for audit
- PostgreSQL is the source of truth for email status — the worker updates it on completion

**Result:** Restarting the server or worker at any point causes zero email loss.

### How Rate Limiting & Concurrency Work

**Layer 1 — BullMQ built-in limiter** (worker-level throughput):
```
limiter: { max: 10, duration: 2000ms }
```
Throttles job processing globally — max 10 emails per 2 seconds regardless of concurrency.

**Layer 2 — Atomic Lua script** (Redis, per-sender hourly cap):
```lua
-- Single atomic Redis operation — no race conditions under concurrency
if globalCount >= globalMax or senderCount >= senderMax then
  return 0  -- reject
end
INCR globalKey   -- global hourly counter
INCR senderKey   -- per-sender hourly counter
return 1         -- allow
```
- Global cap: 200 emails/hour
- Per-sender cap: 50 emails/hour
- Counters keyed by hour window, auto-expire after 2 hours
- Atomic execution prevents two concurrent workers from reading the same count simultaneously

**Concurrency model:**
```
Worker concurrency : 5 (WORKER_CONCURRENCY)
BullMQ limiter     : 10 jobs / 2000ms
→ Smooth, controlled throughput with no setTimeout hacks
```

---

## Features Implemented

### Backend

| Feature | Detail |
|---|---|
| Email scheduling | `POST /api/emails/schedule` — 202 response, background processing |
| BullMQ delayed jobs | `addBulk()` with per-email delay from `scheduledAt` |
| Persistence on restart | Jobs stored in Redis; idempotency via `jobId` |
| Rate limiting | BullMQ `limiter` + atomic Lua script in Redis |
| Concurrency control | BullMQ `concurrency: 5` |
| Bulk scheduling | `createMany` + `addBulk` in chunks of 100 — handles 1000+ emails |
| Cancel single email | `DELETE /api/emails/:id` — removes BullMQ job + marks CANCELLED |
| Cancel all scheduled | `DELETE /api/emails/cancel-all` — bulk remove |
| Reschedule all | `POST /api/emails/reschedule-all` — re-queues with new start time, preserves spacing |
| File attachments | Base64 in Redis job; metadata (name, size, type) stored in DB |
| Ethereal preview URL | Saved to DB after send; shown in dashboard |
| Google OAuth | Passport.js + `/api/auth/sync` bridges NextAuth ↔ Express session |
| Session persistence | Redis-backed `express-session` via `connect-redis` |
| Pagination | `limit` + `offset` on all list endpoints (max 200 per page) |

### Frontend

| Feature | Detail |
|---|---|
| Google OAuth login | NextAuth.js with Google provider |
| Dashboard | Scheduled + Sent tabs with live counts |
| Compose modal | Recipients (paste or CSV upload), subject, HTML body, attachments, send time, delay config |
| CSV upload | Parses CSV, extracts email column, bulk-fills recipients field |
| File attachments | Base64 encoded, up to 5MB/file, 10MB total, with chip previews |
| Image insertion | URL-based or file upload → inserted as `<img>` in email body |
| Email detail modal | Full rendered body, metadata, Ethereal preview link, attachment list |
| Cancel email | Cancel button in detail modal (scheduled emails only) |
| Stop Sending modal | Reschedule all to a new time (preserving spacing) or cancel all |
| Filters | Status + date filters (today / this week / all time) |
| Search | Client-side search across recipient, subject, body |
| Load more | Paginated "Load more (N of total)" for large email lists |
| Auto-refresh | After scheduling, switches to Scheduled tab and auto-refreshes |
| Landing page | Demo video, features, testimonials, how-it-works, dot-grid background |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/sync` | Sync NextAuth session with backend |
| `POST` | `/api/auth/logout` | Destroy session |

### Emails
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/emails/schedule` | Schedule one or more emails |
| `GET` | `/api/emails/scheduled` | List scheduled emails (paginated) |
| `GET` | `/api/emails/sent` | List sent/failed emails (paginated) |
| `DELETE` | `/api/emails/cancel-all` | Cancel all scheduled emails |
| `POST` | `/api/emails/reschedule-all` | Reschedule all to a new start time |
| `DELETE` | `/api/emails/:id` | Cancel a single scheduled email |

#### `POST /api/emails/schedule` — request body
```json
{
  "recipients": ["a@example.com", "b@example.com"],
  "subject": "Hello",
  "body": "<p>Hi there</p>",
  "scheduledAt": "2026-04-12T09:00:00.000Z",
  "delayBetweenMs": 2000,
  "fromEmail": "optional@override.com",
  "attachments": [
    {
      "filename": "doc.pdf",
      "contentType": "application/pdf",
      "size": 12345,
      "base64": "data:application/pdf;base64,..."
    }
  ]
}
```

---

## Assumptions & Trade-offs

- **Ethereal Email is intentional** — The spec requires fake SMTP. Swapping to a real provider (SendGrid, Resend) requires only changing `getTransporter()` in `backend/src/config/ethereal.ts`.
- **Base64 attachments in Redis** — Keeps the database lean. Trade-off: large attachments consume Redis memory. In production, attachments would go to S3 with a presigned URL stored in the job.
- **202 response for bulk scheduling** — The API returns immediately and processes in the background. A 1000-email batch responds in ~10ms instead of waiting for all DB inserts.
- **No email deduplication across campaigns** — The same recipient can appear in multiple campaigns. Deduplication would require a campaign/list concept.
- **Session bridging** — NextAuth (frontend) and Express sessions (backend) are separate systems, bridged via `/api/auth/sync`. In production, a unified auth solution would be cleaner.
- **Rate limiting advisory at scheduling time** — The worker's BullMQ `limiter` is the enforced throughput cap. The Lua-based hourly rate limiter is implemented and available but decoupled from the worker to avoid Redis lock expiry issues under high concurrency.
