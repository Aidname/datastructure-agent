// backend/src/routes/runs.js
import { generateSteps } from '../../../shared/algorithms/binarySearch.js';
import { createRun, getRun } from '../runs/store.js';

export function handleCreateRun(req, res, body) {
  try {
    const { array, target } = JSON.parse(body);

    // 1. 基础校验
    if (!Array.isArray(array) || typeof target !== 'number') {
      return sendError(res, 400, 'INVALID_INPUT', 'array 必须是数组，target 必须是数字');
    }
    if (array.length > 100) {
      return sendError(res, 400, 'INVALID_INPUT', '数组长度不能超过 100');
    }
    
    // 2. 有序性校验（契约规定：不偷偷排序）
    for (let i = 0; i < array.length - 1; i++) {
      if (array[i] > array[i + 1]) {
        return sendError(res, 400, 'INVALID_INPUT', '数组必须是有序的');
      }
    }

    // 3. 生成步骤并保存
    const algoResult = generateSteps(array, target);
    const run = createRun({
      algorithm: 'binary-search',
      sourceVersion: algoResult.sourceVersion,
      sourceLines: algoResult.sourceLines,
      steps: algoResult.steps,
      result: algoResult.result,
    });

    // 4. 返回
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(run));
  } catch (e) {
    sendError(res, 400, 'INVALID_INPUT', '请求体格式错误');
  }
}

export function handleGetRun(req, res, runId) {
  const run = getRun(runId);
  if (!run) {
    return sendError(res, 404, 'RUN_NOT_FOUND', '未找到该 run');
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(run));
}

export function handleGetStep(req, res, runId, stepIndex) {
  const run = getRun(runId);
  if (!run) {
    return sendError(res, 404, 'RUN_NOT_FOUND', '未找到该 run');
  }
  
  const index = parseInt(stepIndex, 10);
  if (isNaN(index) || index < 0 || index >= run.steps.length) {
    return sendError(res, 400, 'STEP_OUT_OF_RANGE', '步骤索引越界');
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ runId, step: run.steps[index] }));
}

// 统一错误格式
function sendError(res, status, code, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code, message } }));
}