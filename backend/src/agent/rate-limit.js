import { createHash } from 'node:crypto';

const windows = new Map(); // key -> { count, resetAt, tokensUsed, costUsed }
const tokenCap = Number(process.env.RATE_LIMIT_DAILY_TOKENS) || 1_000_000;

function getKey(req, bodySessionId) {
  const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown').trim();
  const ua = (req.headers['user-agent'] || 'unknown').trim();
  const sid = (typeof bodySessionId === 'string' && bodySessionId.trim()) ? bodySessionId.trim() : 'anon';
  const raw = `${ip}|${ua}|${sid}`;
  return createHash('sha256').update(raw).digest('hex');
}

function getRecord(key, windowMs) {
  const now = Date.now();
  let record = windows.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs, tokensUsed: 0, costUsed: 0 };
    windows.set(key, record);
  }
  return record;
}

export function checkRateLimit(req, bodySessionId) {
  const maxRequests = Number(process.env.RATE_LIMIT_MAX) || 20;
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
  const key = getKey(req, bodySessionId);
  const record = getRecord(key, windowMs);

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - Date.now(), reason: 'RATE_LIMIT_EXCEEDED' };
  }
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetAt - Date.now() };
}

export function checkBudget(estimatedCostYuan) {
  const enabled = process.env.BUDGET_ENABLED !== 'false';
  if (!enabled) return { allowed: true };
  const daily = Number(process.env.BUDGET_DAILY_YUAN) || 5;
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const key = `budget:${today}`;
  let record = windows.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + 24 * 60 * 60 * 1000, tokensUsed: 0, costUsed: 0 };
    windows.set(key, record);
  }
  if (record.costUsed + estimatedCostYuan > daily) {
    return { allowed: false, used: record.costUsed, limit: daily, reason: 'BUDGET_EXCEEDED' };
  }
  return { allowed: true, used: record.costUsed, limit: daily };
}

export function consumeTokens(req, bodySessionId, tokenCount, costYuan) {
  const key = getKey(req, bodySessionId);
  const record = getRecord(key, 24 * 60 * 60 * 1000);
  record.tokensUsed += tokenCount || 0;
  record.costUsed += costYuan || 0;

  // 同时更新日预算累计
  const today = new Date().toISOString().slice(0, 10);
  const budgetKey = `budget:${today}`;
  let budgetRecord = windows.get(budgetKey);
  if (!budgetRecord || Date.now() > budgetRecord.resetAt) {
    budgetRecord = { count: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000, tokensUsed: 0, costUsed: 0 };
    windows.set(budgetKey, budgetRecord);
  }
  budgetRecord.tokensUsed += tokenCount || 0;
  budgetRecord.costUsed += costYuan || 0;

  // token 上限封顶
  if (record.tokensUsed > tokenCap) {
    record.count = 999999; // 强制触发限流
  }
}

export function getUsage(req, bodySessionId) {
  const key = getKey(req, bodySessionId);
  const record = windows.get(key);
  return {
    requests: record?.count || 0,
    tokensUsed: record?.tokensUsed || 0,
    costUsed: record?.costUsed || 0,
    resetAt: record?.resetAt || null
  };
}
