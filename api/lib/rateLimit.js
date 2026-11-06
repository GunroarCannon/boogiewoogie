/**
 * Simple in-memory rate limiter for failed key lookups and requests
 */

const failedAttempts = new Map(); // ip -> { count, resetAt }

const MAX_FAILED_ATTEMPTS = 30;
const LOCKOUT_MS = 30 * 1000; // 30 seconds lockout

export function checkRateLimit(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-client';
  const now = Date.now();
  const record = failedAttempts.get(ip);

  if (record) {
    if (now > record.resetAt) {
      failedAttempts.delete(ip);
      return { allowed: true };
    }
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, error: `Too many failed attempts. Please wait ${waitSeconds}s.` };
    }
  }

  return { allowed: true };
}

export function recordFailedAttempt(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-client';
  const now = Date.now();
  const record = failedAttempts.get(ip) || { count: 0, resetAt: now + LOCKOUT_MS };
  
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + LOCKOUT_MS;
  } else {
    record.count++;
  }

  failedAttempts.set(ip, record);
}

export function clearFailedAttempts(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-client';
  failedAttempts.delete(ip);
}
