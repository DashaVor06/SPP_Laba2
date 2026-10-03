import { AppError } from '../errors/appErrors.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory sliding window rate limiter
 * Protects against brute-force attacks and abuse (Lab 3 Point 3)
 */
export function createRateLimiter({ windowMs = 60 * 1000, maxRequests = 10, message = 'Слишком много запросов. Пожалуйста, подождите.' } = {}) {
  const requests = new Map();

  // Periodic cleanup of stale entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, records] of requests.entries()) {
      const valid = records.filter(ts => now - ts < windowMs);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const key = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    const clientRecords = requests.get(key) || [];
    const validRecords = clientRecords.filter(timestamp => now - timestamp < windowMs);

    if (validRecords.length >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip,
        path: req.originalUrl,
        requestsCount: validRecords.length,
        maxAllowed: maxRequests,
      });

      const retryAfterSec = Math.ceil((validRecords[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);

      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfterSec }));
    }

    validRecords.push(now);
    requests.set(key, validRecords);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - validRecords.length);

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 attempts
  message: 'Слишком много попыток входа с этого IP. Попробуйте снова через 15 минут.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120, // 120 requests per minute
  message: 'Превышен лимит запросов к API. Пожалуйста, снизьте частоту обращений.',
});
