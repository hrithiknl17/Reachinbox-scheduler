import { redis } from '../config/redis';

const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200', 10);
const MAX_EMAILS_PER_HOUR_PER_SENDER = parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50', 10);

function getHourWindow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
}

// Atomic Lua script: check + increment in a single Redis round-trip
// Eliminates the race condition where two workers read the same count simultaneously
const ATOMIC_RATE_CHECK_SCRIPT = `
  local globalKey = KEYS[1]
  local senderKey = KEYS[2]
  local globalMax = tonumber(ARGV[1])
  local senderMax = tonumber(ARGV[2])
  local ttl = tonumber(ARGV[3])

  local globalCount = tonumber(redis.call('GET', globalKey) or '0')
  local senderCount = tonumber(redis.call('GET', senderKey) or '0')

  if globalCount >= globalMax or senderCount >= senderMax then
    return 0
  end

  redis.call('INCR', globalKey)
  redis.call('EXPIRE', globalKey, ttl)
  redis.call('INCR', senderKey)
  redis.call('EXPIRE', senderKey, ttl)
  return 1
`;

export async function checkAndIncrementRateLimit(sender: string): Promise<{
  allowed: boolean;
  msUntilNextWindow: number;
}> {
  const hourWindow = getHourWindow();
  const globalKey = `rate:global:${hourWindow}`;
  const senderKey = `rate:sender:${sender}:${hourWindow}`;

  const result = await redis.eval(
    ATOMIC_RATE_CHECK_SCRIPT,
    2,                              // number of KEYS
    globalKey,
    senderKey,
    MAX_EMAILS_PER_HOUR,
    MAX_EMAILS_PER_HOUR_PER_SENDER,
    7200                            // TTL: 2 hours
  ) as number;

  if (result === 0) {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return { allowed: false, msUntilNextWindow: nextHour.getTime() - now.getTime() };
  }

  return { allowed: true, msUntilNextWindow: 0 };
}

export async function getRateLimitStatus(sender: string): Promise<{
  globalUsed: number;
  senderUsed: number;
  globalMax: number;
  senderMax: number;
}> {
  const hourWindow = getHourWindow();
  const [globalCount, senderCount] = await Promise.all([
    redis.get(`rate:global:${hourWindow}`),
    redis.get(`rate:sender:${sender}:${hourWindow}`),
  ]);

  return {
    globalUsed: parseInt(globalCount || '0', 10),
    senderUsed: parseInt(senderCount || '0', 10),
    globalMax: MAX_EMAILS_PER_HOUR,
    senderMax: MAX_EMAILS_PER_HOUR_PER_SENDER,
  };
}
