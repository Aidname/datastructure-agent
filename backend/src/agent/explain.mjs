import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

function getCard(cardId) {
  const map = loadCards();
  return map[cardId] || null;
}

export async function handleAgentExplain(request, response, parsedBody) {
  try {
    if (!parsedBody || typeof parsedBody !== 'object') {
      return json(response, 400, { error: { code: 'INVALID_INPUT', message: '请求体必须为 JSON 对象' } });
    }

    const { runId, stepIndex, question, hintLevel } = parsedBody;

    if (!runId || typeof runId !== 'string') {
      return json(response, 400, { error: { code: 'INVALID_INPUT', message: 'runId 为必填字符串' } });
    }

    if (hintLevel !== undefined && hintLevel !== null) {
      if (!Number.isInteger(hintLevel) || hintLevel < 1 || hintLevel > 3) {
        return json(response, 400, { error: { code: 'INVALID_INPUT', message: 'hintLevel 必须为 1、2 或 3' } });
      }
    }

    const currentHintLevel = hintLevel || 1;

    const run = await getRun(runId);
    if (!run) {
      return json(response, 404, { error: { code: 'RUN_NOT_FOUND', message: 'run 不存在' } });
    }

    const idx = Number(stepIndex) || 0;
    const steps = run.steps || [];
    if (idx < 0 || idx >= steps.length) {
      return json(response, 400, { error: { code: 'STEP_OUT_OF_RANGE', message: 'stepIndex 越界' } });
    }

    const step = steps[idx];
    const answer = buildHint(run, step, currentHintLevel, question);
    const stepRefs = buildStepRefs(step);
    const sourceRefs = buildSourceRefs(step);

    return json(response, 200, {
      runId,
      stepIndex: idx,
      answer,
      stepRefs,
      sourceRefs,
      usage: { model: 'mock', cost: 0, mock: true }
    });
  } catch (err) {
    return json(response, 400, { error: { code: 'INVALID_INPUT', message: 'Agent 请求处理失败', detail: err.message } });
  }
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function getRun(runId) {
  try {
    const { getRun: getRunFromStore } = await import('../store/runs.js');
    return await getRunFromStore(runId);
  } catch {
    return null;
  }
}

function buildHint(run, step, hintLevel, question) {
  const prefix = '[Mock开发模式] ';
  const arr = run.array || [];
  const target = run.target;
  const left = step.left;
  const right = step.right;
  const mid = step.mid;
  const ev = step.event;

  let answer = '';

  if (hintLevel === 1) {
    answer = `${prefix}当前步骤（第${step.index ?? '?'}步）：事件为 ${ev}，区间 [${left}, ${right}]`;
    if (mid !== null && mid !== undefined) {
      answer += `，mid=${mid}`;
      if (arr.length > mid) {
        answer += `，A[${mid}]=${arr[mid]}`;
      }
    }
    answer += `。目标值为 ${target}。`;
  } else if (hintLevel === 2) {
    answer = `${prefix}步骤 ${step.index ?? '?'} 事件 ${ev}：候选区间 [${left}, ${right}]`;
    if (mid !== null && mid !== undefined) {
      answer += `，mid=${mid}，A[${mid}]=${arr[mid] ?? '?'}`;
    }
    answer += `。目标 ${target}。`;
    if (ev === 'probe') {
      answer += ' 正在比较目标与中间元素。';
    } else if (ev === 'move-left') {
      answer += ' 更新左边界。';
    } else if (ev === 'move-right') {
      answer += ' 更新右边界。';
    } else if (ev === 'found') {
      answer += ' 找到目标，查找成功。';
    } else if (ev === 'not-found') {
      answer += ' 候选区间已空，查找结束。';
    }
  } else {
    let next = '';
    if (!arr.length) {
      next = '数组为空，查找直接结束（not-found）。';
    } else if (left > right) {
      next = '候选区间已为空（left > right），查找结束，返回 -1（not-found）。';
    } else if (step.done) {
      if (ev === 'found') {
        next = '已找到目标，查找成功结束。';
      } else {
        next = '查找已结束，结果为 not-found。';
      }
    } else if (ev === 'init') {
      next = '初始化完成，下一步将计算 mid 并与目标比较。';
    } else if (ev === 'probe') {
      next = '正在比较目标与 A[mid]，下一步根据比较结果更新边界。';
    } else if (ev === 'move-left') {
      next = '已更新左边界，下一步重新计算 mid。';
    } else if (ev === 'move-right') {
      next = '已更新右边界，下一步重新计算 mid。';
    } else if (ev === 'not-found') {
      next = '查找结束，目标不在数组中。';
    } else {
      next = '下一步继续二分查找流程。';
    }

    answer = `${prefix}步骤 ${step.index ?? '?'} 事件 ${ev}：区间 [${left}, ${right}]`;
    if (mid !== null && mid !== undefined) {
      answer += `，mid=${mid}，A[${mid}]=${arr[mid] ?? '?'}`;
    }
    answer += `。目标 ${target}。${next}`;
  }

  const cardId = step.knowledgeCard || pickCard(ev);
  const card = getCard(cardId);
  if (card) {
    answer += `\n\n📖 ${card.title}：${card.summary}`;
    if (card.original) {
      answer += `\n📎 出处：${card.original}`;
    }
  }

  return answer;
}

function pickCard(ev) {
  if (ev === 'probe') return 'bs-k03';
  if (ev === 'move-left' || ev === 'move-right') return 'bs-k02';
  if (ev === 'found' || ev === 'not-found') return 'bs-k04';
  return 'bs-k01';
}

function buildStepRefs(step) {
  return [{
    stepIndex: step.index ?? 0,
    event: step.event,
    left: step.left,
    right: step.right,
    mid: step.mid,
    knowledgeCard: step.knowledgeCard || pickCard(step.event)
  }];
}

function buildSourceRefs(step) {
  const cardId = step.knowledgeCard || pickCard(step.event);
  const card = getCard(cardId);
  if (!card) return [];
  return [{
    cardId,
    title: card.title,
    original: card.original || null
  }];
}
