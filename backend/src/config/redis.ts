import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const tls = redisUrl.startsWith('rediss://') ? {} : undefined;

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls,
});

export const redisForBullMQ = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls,
});
