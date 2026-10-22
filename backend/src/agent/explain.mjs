import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getRun } from '../runs/store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardsPath = resolve(__dirname, '../../../content/knowledge/cards.json');

let cardMap = null;
function loadCards() {
  if (cardMap) return cardMap;
  try {
    const raw = readFileSync(cardsPath, 'utf8');
    const cards = JSON.parse(raw);
    cardMap = {};
    for (const c of cards) {
      cardMap[c.id] = c;
    }
    return cardMap;
  } catch {
    cardMap = {};
    return cardMap;
  }
}

function pickCardId(ev) {
  if (ev === 'probe') return 'bs-k03';
  if (ev === 'move-left') return 'bs-k02';
  if (ev === 'move-right') return 'bs-k02';
  if (ev === 'found') return 'bs-k04';
  if (ev === 'not-found') return 'bs-k05';
  return 'bs-k01';
}

function cardText(card) {
  if (!card) return '';
  let s = `\n\n📖 ${card.title || card.id}`;
  if (card.content) s += `：${card.content}`;
  if (card.sourceId) s += `\n📎 来源：${card.sourceId}`;
  return s;
}

export async function handleAgentExplain(parsedBody) {
  try {
    if (!parsedBody || typeof parsedBody !== 'object') {
      return { status: 400, body: { error: { code: 'INVALID_INPUT', message: '请求体必须为 JSON 对象' } } };
    }

    const { runId, stepIndex, question, hintLevel } = parsedBody;

    if (!runId || typeof runId !== 'string') {
      return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'runId 为必填字符串' } } };
    }

    if (hintLevel !== undefined && hintLevel !== null) {
      if (!Number.isInteger(hintLevel) || hintLevel < 1 || hintLevel > 3) {
        return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'hintLevel 必须为 1、2 或 3' } } };
      }
    }

    if (stepIndex === undefined || stepIndex === null) {
      return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'stepIndex 为必填' } } };
    }
    const idx = Number(stepIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'stepIndex 必须为非负整数' } } };
    }

    if (question !== undefined && question !== null && typeof question !== 'string') {
      return { status: 400, body: { error: { code: 'INVALID_INPUT', message: 'question 必须为字符串' } } };
    }

    const level = hintLevel || 1;

    const run = getRun(runId);
    if (!run) {
      return { status: 404, body: { error: { code: 'RUN_NOT_FOUND', message: 'run 不存在或已过期' } } };
    }

    const steps = Array.isArray(run.steps) ? run.steps : [];
    if (idx >= steps.length) {
      return { status: 400, body: { error: { code: 'STEP_OUT_OF_RANGE', message: 'stepIndex 越界' } } };
    }

    const step = steps[idx] || {};

    const arr = Array.isArray(step.array) ? step.array : [];
    const target = step.target;
    const left = step.variables?.left;
    const right = step.variables?.right;
    const mid = step.variables?.mid;
    const ev = step.event;
    const stepNo = step.stepIndex ?? idx;

    const prefix = '[Mock开发模式] ';
    let answer = '';

    if (typeof left === 'number' && typeof right === 'number' && left > right) {
      answer = `${prefix}候选区间已为空（left=${left} > right=${right}），查找结束，返回 -1（not-found）。`;
    } else if (level === 1) {
      answer = `${prefix}当前步骤（第${stepNo + 1}步）：事件为 ${ev}，区间 [${left}, ${right}]`;
      if (typeof mid === 'number') {
        answer += `，mid=${mid}`;
        if (arr.length > mid) answer += `，A[${mid}]=${arr[mid]}`;
      }
      answer += `。目标值为 ${target}。`;
    } else if (level === 2) {
      answer = `${prefix}步骤 ${stepNo + 1} 事件 ${ev}：候选区间 [${left}, ${right}]`;
      if (typeof mid === 'number') answer += `，mid=${mid}，A[${mid}]=${arr[mid] ?? '?'}`;
      answer += `。目标 ${target}。`;
      if (ev === 'probe') answer += ' 正在比较目标与中间元素。';
      else if (ev === 'move-left') answer += ' 更新左边界。';
      else if (ev === 'move-right') answer += ' 更新右边界。';
      else if (ev === 'found') answer += ' 找到目标，查找成功。';
      else if (ev === 'not-found') answer += ' 候选区间已空，查找结束。';
      else if (ev === 'init') answer += ' 初始化查找区间。';
    } else {
      let next = '下一步继续二分查找流程。';
      if (arr.length === 0) next = '数组为空，查找直接结束（not-found）。';
      else if (ev === 'init') next = '初始化完成，下一步将计算 mid 并与目标比较。';
      else if (ev === 'probe') next = '正在比较目标与 A[mid]，下一步根据比较结果更新边界。';
      else if (ev === 'move-left') next = '已更新左边界，下一步重新计算 mid。';
      else if (ev === 'move-right') next = '已更新右边界，下一步重新计算 mid。';
      else if (ev === 'found') next = '已找到目标，查找成功结束。';
      else if (ev === 'not-found') next = '查找结束，目标不在数组中。';

      answer = `${prefix}步骤 ${stepNo + 1} 事件 ${ev}：区间 [${left}, ${right}]`;
      if (typeof mid === 'number') answer += `，mid=${mid}，A[${mid}]=${arr[mid] ?? '?'}`;
      answer += `。目标 ${target}。${next}`;
    }

    const cardId = pickCardId(ev);
    const card = loadCards()[cardId];
    answer += cardText(card);

    return {
      status: 200,
      body: {
        runId,
        stepIndex: idx,
        answer,
        stepRefs: [{
          runId,
          stepIndex: idx,
          event: ev,
          left,
          right,
          mid,
          knowledgeCard: cardId
        }],
        sourceRefs: card ? [{
          cardId: card.id || cardId,
          title: card.title || '',
          sourceId: card.sourceId || null,
          sourceType: card.sourceType || null
        }] : [],
        usage: { model: 'mock', cost: 0, mock: true }
      }
    };
  } catch (err) {
    return {
      status: 400,
      body: { error: { code: 'INVALID_INPUT', message: 'Agent 请求处理失败', detail: err.message } }
    };
  }
}
