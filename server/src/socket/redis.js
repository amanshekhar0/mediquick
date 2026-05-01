import Redis from 'ioredis';

let redis;

export const getRedis = () => {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying — Redis is optional
        return Math.min(times * 200, 2000);
      },
    });
    redis.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[Redis] Connection error (non-fatal):', err.message);
      }
    });
  }
  return redis;
};

export const cacheHospital = async (hospitalId, data) => {
  try {
    await getRedis().setex(`hospital:${hospitalId}`, 300, JSON.stringify(data));
  } catch {
    // Redis unavailable — degrade gracefully
  }
};

export const getCachedHospital = async (hospitalId) => {
  try {
    const raw = await getRedis().get(`hospital:${hospitalId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const invalidateHospital = async (hospitalId) => {
  try {
    await getRedis().del(`hospital:${hospitalId}`);
  } catch {
    // ignore
  }
};
