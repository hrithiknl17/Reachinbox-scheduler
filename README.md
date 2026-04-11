# ONB — Email Scheduler

A production-grade bulk email scheduling system built for the ReachInbox hiring assignment. Schedule emails to hundreds of recipients, control send timing, and watch them land in real inboxes — all from a clean dashboard.

**Live Demo:** https://reachinbox-scheduler-six.vercel.app

---

## What It Does

You log in with Google, compose an email, pick a list of recipients (paste or upload CSV), set a start time and delay between sends, and hit Schedule. The system queues every email individually in BullMQ, fires them at the right time, and marks them sent in the dashboard. You can cancel individual emails, stop an entire campaign, or reschedule everything to a new time.

Emails are delivered via **Brevo** (transactional email API) — they actually land in the recipient's real inbox, not a fake test inbox.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, NextAuth.js |
| Backend | Node.js, Express, TypeScript |
| Queue | BullMQ (backed by Redis) |
| Database | PostgreSQL via Prisma |
| Email Delivery | Brevo transactional email API |
| Auth | Google OAuth (NextAuth + Passport.js) |
| Hosting | Vercel (frontend) + Railway (backend + worker) |

---

## Running Locally

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL + Redis)
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))
- Brevo account with a verified sender email ([app.brevo.com](https://app.brevo.com))

### 1. Clone & install

```bash
git clone https://github.com/hrithiknl17/Reachinbox-scheduler
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
```

Fill in the values as described below.

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
# http://localhost:3001
```

### 6. Start the email worker (separate terminal)

```bash
cd backend
npm run worker
```

### 7. Start the frontend

```bash
cd frontend
npm run dev
# http://localhost:3000
```

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SESSION_SECRET` | Any random secret string for sessions |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `http://localhost:3000`) |
| `BREVO_API_KEY` | Brevo API key for sending emails |
| `PORT` | Backend port (default `3001`) |

### Frontend — `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Full URL of the frontend |
| `NEXTAUTH_SECRET` | Any random secret string for NextAuth |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `BACKEND_URL` | Backend base URL (used by Next.js proxy) |

---

## Email Delivery — Brevo

In production, emails are sent via the **Brevo** transactional email API (HTTPS, no SMTP). This was chosen because Railway (where the backend runs) blocks outbound SMTP ports (587, 465). Brevo's HTTP API works around this cleanly.

- Free tier: 300 emails/day
- Sends to any real email address
- Sender email (`nlhrithik123@gmail.com`) is verified on Brevo

To use your own sender, verify your email at **app.brevo.com → Senders & IPs → Senders** and update the `sender.email` field in `backend/src/workers/emailWorker.ts`.

For local development without Brevo, the worker falls back to Ethereal (fake SMTP) — emails are captured but not delivered.

---

## Architecture

### How Scheduling Works

```
POST /api/emails/schedule
        │
        ▼
  Returns 202 immediately
        │
        ▼  background via setImmediate
  processEmailBatch()
        │
        ├── prisma.email.createMany()     ← batch DB insert (chunks of 100)
        │
        └── emailQueue.addBulk()          ← batch Redis insert (chunks of 100)
                │
                ▼
         BullMQ delayed job
         (fires at scheduledAt + delay offset per recipient)
                │
                ▼
         emailWorker picks it up
                │
                ├── Brevo API → real inbox delivery
                │
                └── prisma.email.update({ status: SENT })
```

Each email gets a deterministic `jobId` (`email-{uuid}`) as an idempotency key — BullMQ will never enqueue a duplicate even if the server crashes mid-batch.

### Persistence on Restart

BullMQ stores all jobs in Redis, not in memory. When the backend or worker restarts:

- Delayed jobs not yet due stay in Redis and fire on time
- Active jobs mid-processing are retried by the next worker instance
- PostgreSQL is the source of truth for email status

Restarting at any point causes zero email loss.

### Rate Limiting

**BullMQ built-in limiter** — enforces max throughput at the worker level:
```
limiter: { max: 10, duration: 2000ms }
→ Max 10 emails processed every 2 seconds
```

This is clean and reliable. No custom `setTimeout` loops, no Redis polling hacks.

---

## Features

### Backend
- Schedule bulk emails — returns 202 instantly, processes in background
- BullMQ delayed jobs with per-email timing offsets
- Idempotency keys prevent duplicate processing on restart
- Cancel a single email (removes BullMQ job + marks CANCELLED in DB)
- Cancel all scheduled emails in one call
- Reschedule all emails to a new start time (preserves spacing between sends)
- File attachments (base64 encoded, up to 10MB total)
- Pagination on all list endpoints
- Google OAuth via Passport.js + NextAuth session bridge

### Frontend
- Google OAuth login
- Compose modal with recipients (paste or CSV), subject, HTML body, attachments, send time, delay config
- Scheduled and Sent tabs with live counts
- Email detail modal with full body preview
- Cancel button on individual scheduled emails
- Stop Sending modal — reschedule or cancel all
- Status and date filters
- Search across recipient, subject, body
- Load more pagination
- Auto-refresh after scheduling

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/sync` | Sync NextAuth session with backend |
| `POST` | `/api/auth/logout` | Logout |

### Emails
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/emails/schedule` | Schedule one or more emails |
| `GET` | `/api/emails/scheduled` | List scheduled emails (paginated) |
| `GET` | `/api/emails/sent` | List sent/failed emails (paginated) |
| `DELETE` | `/api/emails/cancel-all` | Cancel all scheduled emails |
| `POST` | `/api/emails/reschedule-all` | Reschedule all to a new start time |
| `DELETE` | `/api/emails/:id` | Cancel a single email |

#### Schedule request body
```json
{
  "recipients": ["a@example.com", "b@example.com"],
  "subject": "Hello",
  "body": "<p>Hi there</p>",
  "scheduledAt": "2026-04-12T09:00:00.000Z",
  "delayBetweenMs": 2000,
  "fromEmail": "you@example.com",
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

## Trade-offs & Decisions

- **Brevo over Ethereal in production** — Railway blocks SMTP. Brevo uses HTTPS so it works everywhere. Switching providers only requires changing `sendViaBrevo()` in `emailWorker.ts`.
- **Base64 attachments in Redis** — Keeps the DB lean. In production at scale, attachments would go to S3 with a presigned URL in the job payload.
- **202 for bulk scheduling** — The API responds in ~10ms regardless of batch size. Processing happens in the background so clients aren't blocked.
- **Session bridging** — NextAuth (frontend) and Express sessions (backend) are separate systems, connected via `/api/auth/sync`. A signed HMAC token is used to verify identity on API calls.
- **Next.js proxy** — All API calls from the browser go through a Next.js API route (`/api/proxy`) that forwards to Railway. This avoids cross-domain cookie issues with Chrome's third-party cookie restrictions.

---

## Note

Most of this assignment was written by me, with some help from AI tools during development. If there is anything you'd like me to walk through or explain in more detail, feel free to reach out at **nlhrithik123@gmail.com**.
