const windows = new Map();

export function checkRateLimit(identifier, options = {}) {
  const maxRequests = options.maxRequests || 20;
  const windowMs = options.windowMs || 60 * 1000;

  const now = Date.now();
  const key = identifier || 'anonymous';
  const record = windows.get(key);

  if (!record || now > record.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs, tokensUsed: 0 });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now, reason: 'RATE_LIMIT_EXCEEDED' };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetAt - now };
}

export function consumeTokens(identifier, tokenCount) {
  const key = identifier || 'anonymous';
  const record = windows.get(key);
  if (record) {
    record.tokensUsed = (record.tokensUsed || 0) + tokenCount;
  }
}

export function getUsage(identifier) {
  const key = identifier || 'anonymous';
  const record = windows.get(key);
  return {
    requests: record?.count || 0,
    tokensUsed: record?.tokensUsed || 0,
    resetAt: record?.resetAt || null
  };
}
