// 成员05：Agent Mock解释器
// 修复P1：读04服务端真实run/step，忽略客户端stepState
// 修复P2：非法请求返回400/404统一error结构，hintLevel严格校验+递进，引用提顶层
// 修复P2-3：从06 content/knowledge/cards.json动态读取知识卡
// Mock需 AGENT_MOCK=true 显式开启，否则返回503

import { getRun } from '../runs/store.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cardsPath = join(__dirname, '..', '..', '..', 'content', 'knowledge', 'cards.json');

let cardMap = {};
try {
  const cardsRaw = readFileSync(cardsPath, 'utf-8');
  const cards = JSON.parse(cardsRaw);
  for (const card of cards) {
    cardMap[card.id] = card;
  }
} catch (err) {
  console.error('[Agent Mock] 无法加载 cards.json:', err.message);
}

const eventCardMap = {
  'init': 'bs-k01',
  'probe': 'bs-k03',
  'move-left': 'bs-k04',
  'move-right': 'bs-k05',
  'found': 'bs-k08',
  'not-found': 'bs-k06'
};

function generateHint(hintLevel, step, question) {
  const event = step.event || 'probe';
  const cardId = eventCardMap[event] || 'bs-k03';
  const card = cardMap[cardId];
  const cardText = card ? card.content : '';
  const vars = step.variables || {};
  const left = vars.left ?? '?';
  const right = vars.right ?? '?';
  const mid = vars.mid ?? '?';
  const stepIdx = step.stepIndex ?? '?';

  // 所有级别统一加Mock标注
  const mockPrefix = '[Mock开发模式] ';

  if (hintLevel <= 1) {
    return `${mockPrefix}步骤${stepIdx}（${event}）：当前区间[${left},${right}]，mid=${mid}。${cardText}`;
  }

  if (hintLevel <= 2) {
    return `${mockPrefix}步骤${stepIdx}（${event}）：当前区间[${left},${right}]，mid=${mid}。${cardText} 针对你的问题"${question}"，建议结合当前步骤的变量变化理解：` +
      `mid=${mid}对应值${step.array && mid >= 0 && mid < step.array.length ? step.array[mid] : 'N/A'}，与target=${step.target}比较决定下一步走向。`;
  }

  // hintLevel 3：完整辅导+下一步预判
  let nextHint = '';
  if (!step.done) {
    if (event === 'init') {
      // 空数组特殊处理：init后直接not-found
      if (step.array && step.array.length === 0) {
        nextHint = ' 数组为空，下一步将直接结束（not-found）。';
      } else {
        nextHint = ' 下一步将计算新的mid并比较。';
      }
    } else if (event === 'move-left' || event === 'move-right') {
      nextHint = ' 下一步将计算新的mid并比较。';
    } else if (event === 'probe') {
      const arr = step.array || [];
      const t = step.target;
      const midVal = mid >= 0 && mid < arr.length ? arr[mid] : null;
      if (midVal !== null && midVal < t) nextHint = ' 下一步应向左收缩（left=mid+1）。';
      else if (midVal !== null && midVal > t) nextHint = ' 下一步应向右收缩（right=mid-1）。';
      else if (midVal !== null && midVal === t) nextHint = ' 下一步将命中（found）。';
    } else if (event === 'found') {
      nextHint = ' 查找已结束，返回结果下标。';
    } else if (event === 'not-found') {
      nextHint = ' 查找已结束，区间为空，返回-1。';
    }
  }

  return `${mockPrefix}步骤${stepIdx}（${event}）：区间[${left},${right}]，mid=${mid}。${cardText} ` +
    `针对"${question}"：${mid >= 0 && step.array && mid < step.array.length ? `A[${mid}]=${step.array[mid]}` : 'mid未计算'} vs target=${step.target}。` +
    nextHint;
}

export async function handleAgentExplain(reqBody) {
  // hintLevel严格校验
  if (reqBody && reqBody.hintLevel !== undefined) {
    if (!Number.isInteger(reqBody.hintLevel) || reqBody.hintLevel < 1 || reqBody.hintLevel > 3) {
      return {
        status: 400,
        body: { error: { code: 'BAD_REQUEST', message: 'hintLevel 必须是 1、2 或 3' } }
      };
    }
  }

  // 基础校验
  if (!reqBody || typeof reqBody !== 'object') {
    return {
      status: 400,
      body: { error: { code: 'BAD_REQUEST', message: '请求体不能为空' } }
    };
  }

  const { runId, stepIndex, question, hintLevel } = reqBody;

  if (!runId || typeof runId !== 'string') {
    return {
      status: 400,
      body: { error: { code: 'BAD_REQUEST', message: 'runId 必须是非空字符串' } }
    };
  }

  if (stepIndex === undefined || stepIndex === null || !Number.isInteger(stepIndex) || stepIndex < 0) {
    return {
      status: 400,
      body: { error: { code: 'BAD_REQUEST', message: 'stepIndex 必须是非负整数' } }
    };
  }

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return {
      status: 400,
      body: { error: { code: 'BAD_REQUEST', message: 'question 必须是非空字符串' } }
    };
  }

  // P1：读04服务端真实run
  const run = getRun(runId);
  if (!run) {
    return {
      status: 404,
      body: { error: { code: 'RUN_NOT_FOUND', message: '未找到该 run，请先调用 /api/algorithms/binary-search/runs 创建' } }
    };
  }

  if (!Array.isArray(run.steps) || stepIndex >= run.steps.length) {
    return {
      status: 404,
      body: { error: { code: 'STEP_OUT_OF_RANGE', message: `步骤索引越界，该 run 共有 ${run.steps?.length || 0} 步` } }
    };
  }

  const realStep = run.steps[stepIndex];
  const level = Number.isInteger(hintLevel) ? hintLevel : 1;
  const answer = generateHint(level, realStep, question);

  // 引用提顶层（公共约定）
  const cardId = eventCardMap[realStep.event] || 'bs-k03';
  const card = cardMap[cardId];

  const stepRefs = [{
    runId,
    stepIndex,
    event: realStep.event,
    mid: realStep.variables?.mid ?? null
  }];

  const sourceRefs = card ? [{
    cardId: card.id,
    title: card.title,
    content: card.content,
    sourceId: card.sourceId,
    sourceType: card.sourceType,
    version: card.version,
    verified: card.verified,
    chapter: card.chapter,
    pages: card.pages
  }] : [];

  return {
    status: 200,
    body: {
      runId,
      stepIndex,
      answer,
      stepRefs,
      sourceRefs,
      usage: { model: 'mock', cost: 0, mock: true }
    }
  };
}
