import { getRun } from '../runs/store.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardsPath = join(__dirname, '..', '..', '..', 'content', 'knowledge', 'cards.json');

const cardMap = {};
try {
  const cards = JSON.parse(readFileSync(cardsPath, 'utf-8'));
  for (const c of cards) cardMap[c.id] = c;
} catch (err) {
  console.error('[agent mock] cards.json 加载失败:', err.message);
}

const EVENT_CARD = {
  init: 'bs-k01',
  probe: 'bs-k03',
  'move-left': 'bs-k04',
  'move-right': 'bs-k05',
  found: 'bs-k08',
  'not-found': 'bs-k06'
};

function hint(level, step, question) {
  const ev = step.event || 'probe';
  const card = cardMap[EVENT_CARD[ev]] || null;
  const cardText = card ? card.content : '';
  const v = step.variables || {};
  const left = v.left ?? '?';
  const right = v.right ?? '?';
  const mid = v.mid ?? '?';
  const idx = step.stepIndex ?? '?';
  const arr = Array.isArray(step.array) ? step.array : [];
  const target = step.target;

  const prefix = '[Mock开发模式] ';

  if (level <= 1) {
    return `${prefix}步骤${idx}（${ev}）：区间[${left},${right}]，mid=${mid}。${cardText}`;
  }

  if (level <= 2) {
    const midVal = mid >= 0 && mid < arr.length ? arr[mid] : 'N/A';
    return `${prefix}步骤${idx}（${ev}）：区间[${left},${right}]，mid=${mid}，` +
      `A[${mid}] = ${midVal}。针对你的问题"${question}"：把 mid 值和 target=${target} 比较，就能判断下一步往左还是往右。`;
  }

  // level 3
  let next = '';
  if (!arr.length) {
    next = '数组为空，查找直接结束（not-found）。';
  } else if (step.done) {
    next = ev === 'found' ? '查找已结束，返回命中下标。' : '查找已结束，返回 -1。';
  } else if (ev === 'init') {
    next = '下一步：计算 mid 并比较 A[mid] 与 target。';
  } else if (ev === 'probe') {
    const midVal = mid >= 0 && mid < arr.length ? arr[mid] : null;
    if (midVal === target) next = '下一步：命中（found）。';
    else if (midVal < target) next = '下一步：更新左边界（left=mid+1）。';
    else if (midVal > target) next = '下一步：更新右边界（right=mid-1）。';
  } else if (ev === 'move-left') {
    next = '已向左收缩，下一步重新计算 mid。';
  } else if (ev === 'move-right') {
    next = '已向右收缩，下一步重新计算 mid。';
  }

  const midVal = mid >= 0 && mid < arr.length ? arr[mid] : 'mid未计算';
  return `${prefix}步骤${idx}（${ev}）：区间[${left},${right}]，mid=${mid}。` +
    `A[${mid}] = ${midVal}，target = ${target}。${cardText} ${next}`;
}

export async function handleAgentExplain(body) {
  // hintLevel 显式非法值拒绝
  if (body && body.hintLevel !== undefined) {
    if (!Number.isInteger(body.hintLevel) || body.hintLevel < 1 || body.hintLevel > 3) {
      return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'hintLevel 只能是 1、2、3' } } };
    }
  }

  // 基础校验
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, body: { error: { code: 'INVALID_INPUT', message: '请求体必须是对象' } } };
  }

  const { runId, stepIndex, question, hintLevel } = body;

  if (typeof runId !== 'string' || !runId) {
    return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'runId 必须是非空字符串' } } };
  }
  if (!Number.isInteger(stepIndex) || stepIndex < 0) {
    return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'stepIndex 必须是非负整数' } } };
  }
  if (typeof question !== 'string' || !question.trim()) {
    return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'question 必须是非空字符串' } } };
  }

  // 读04真实run
  const run = getRun(runId);
  if (!run) {
    return { status: 404, body: { error: { code: 'RUN_NOT_FOUND', message: 'run 不存在或已过期，请先 POST /api/algorithms/binary-search/runs 创建' } } };
  }
  if (!Array.isArray(run.steps) || stepIndex >= run.steps.length) {
    return { status: 400, body: { error: { code: 'STEP_OUT_OF_RANGE', message: `步骤越界，该 run 共 ${run.steps.length} 步` } } };
  }

  const step = run.steps[stepIndex];
  const level = Number.isInteger(hintLevel) ? hintLevel : 1;

  const ev = step.event || 'probe';
  const card = cardMap[EVENT_CARD[ev]] || null;

  return {
    status: 200,
    body: {
      answer: hint(level, step, question),
      stepRefs: [{
        runId,
        stepIndex,
        event: ev,
        mid: step.variables?.mid ?? null
      }],
      sourceRefs: card ? [{
        cardId: card.id,
        title: card.title,
        content: card.content,
        sourceId: card.sourceId,
        sourceType: card.sourceType,
        version: card.version,
        verified: card.verified,
        chapter: card.chapter ?? null,
        pages: card.pages ?? null
      }] : [],
      usage: { model: 'mock', cost: 0, mock: true }
    }
  };
}
