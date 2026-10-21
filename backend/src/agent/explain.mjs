// 成员05：Agent Mock解释器
// 修复P1：读04服务端真实run/step，忽略客户端stepState
// 修复P2：非法请求返回400/404统一error结构，hintLevel递进，不编造引用
// Mock需 AGENT_MOCK=true 显式开启，否则返回503

import { getRun } from '../runs/store.js';

const eventCardMap = {
  'init': 'bs-k01',
  'probe': 'bs-k03',
  'move-left': 'bs-k04',
  'move-right': 'bs-k05',
  'found': 'bs-k08',
  'not-found': 'bs-k06'
};

const cardContents = {
  'bs-k01': '本样例要求数组按非递减顺序排列，二分查找利用有序性排除一半候选区间。',
  'bs-k02': '当前候选范围是闭区间[left,right]，初始化为left=0、right=n-1。',
  'bs-k03': 'mid=left+floor((right-left)/2)，算出的是下标，A[mid]才是中点值。',
  'bs-k04': '当A[mid]<target时，排除[left,mid]，令left=mid+1。',
  'bs-k05': '当A[mid]>target时，排除[mid,right]，令right=mid-1。',
  'bs-k06': '当left>right时区间为空，应结束并返回-1。',
  'bs-k07': '空数组直接结束并返回-1，单元素仍需比较一次。',
  'bs-k08': '本项目采用中点值相等就返回mid的版本，重复值允许返回实际命中的位置。',
  'bs-k09': '最坏时间复杂度O(log n)，最好一次比较命中O(1)。',
  'bs-k10': '初始化及更新边界后mid=null，表示当前轮中点尚未计算。'
};

// hintLevel递进生成（不编造引用）
function generateHint(hintLevel, step, question) {
  const event = step.event || 'probe';
  const cardId = eventCardMap[event] || 'bs-k03';
  const cardText = cardContents[cardId] || '';
  const vars = step.variables || {};
  const left = vars.left ?? '?';
  const right = vars.right ?? '?';
  const mid = vars.mid ?? '?';
  const stepIdx = step.stepIndex ?? '?';

  // hintLevel 1: 仅当前步骤状态
  if (hintLevel <= 1) {
    return `步骤${stepIdx}（${event}）：当前区间[${left},${right}]，mid=${mid}。${cardText}`;
  }

  // hintLevel 2: 加上问题针对性解释
  if (hintLevel <= 2) {
    return `步骤${stepIdx}（${event}）：当前区间[${left},${right}]，mid=${mid}。${cardText} 针对你的问题"${question}"，建议结合当前步骤的变量变化理解：` +
      `mid=${mid}对应值${step.array && mid >= 0 ? step.array[mid] : 'N/A'}，与target=${step.target}比较决定下一步走向。`;
  }

  // hintLevel 3: 完整辅导，含知识卡引用和下一步预判
  let nextHint = '';
  if (!step.done) {
    if (event === 'move-left' || event === 'move-right' || event === 'init') {
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

  return `[Mock开发模式] 步骤${stepIdx}（${event}）：区间[${left},${right}]，mid=${mid}。${cardText} ` +
    `针对"${question}"：${mid >= 0 && step.array ? `A[${mid}]=${step.array[mid]}` : 'mid未计算'} vs target=${step.target}。` +
    nextHint;
}

export async function handleAgentExplain(reqBody) {
  // ---- P2: 非法请求校验 ----
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

  // ---- P1: 读04服务端真实run，忽略客户端stepState ----
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

  // ---- P2: hintLevel递进（默认1）----
  const level = Number.isInteger(hintLevel) && hintLevel >= 1 && hintLevel <= 3 ? hintLevel : 1;
  const answer = generateHint(level, realStep, question);

  // ---- 引用：基于真实step.event映射，不编造 ----
  const cardId = eventCardMap[realStep.event] || 'bs-k03';
  const references = {
    stepRefs: [{
      runId,
      stepIndex,
      event: realStep.event,
      mid: realStep.variables?.mid ?? null
    }],
    sourceRefs: [{
      cardId,
      cardText: cardContents[cardId] || '',
      sourceVersion: run.sourceVersion || 'bs-v1'
    }]
  };

  return {
    status: 200,
    body: {
      runId,
      stepIndex,
      answer,
      references,
      usage: { model: 'mock', cost: 0, mock: true }
    }
  };
}
