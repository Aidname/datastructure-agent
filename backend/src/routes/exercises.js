import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const oraclePath = resolve(here, '../../../content/exercises/binary-search.json');
let oracleData = [];

// 启动时加载数据
try {
  const raw = await readFile(oraclePath, 'utf-8');
  oracleData = JSON.parse(raw);
} catch (e) {
  console.error("无法读取题库数据，请检查路径:", oraclePath);
}

// GET /api/exercises：展示题目，白名单剥离答案
export function handleGetExercises(req, res) {
  const publicExercises = oracleData.map(ex => ({
    id: ex.id,
    version: ex.version, // 修复审查意见：保留版本号
    topicId: ex.topicId,
    type: ex.type,
    prompt: ex.prompt,
    context: ex.context,
    options: ex.options || []
  }));

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ exercises: publicExercises }));
}

// POST /api/exercises/check：判分
export function handleCheckExercise(req, res, body) {
  try {
    const { exerciseId, answer, hintLevel } = JSON.parse(body);
    
    if (!exerciseId || answer === undefined) {
      return sendError(res, 400, 'INVALID_INPUT', '缺少 exerciseId 或 answer');
    }

    // 修复审查意见：严格校验 hintLevel
    const level = hintLevel === undefined ? 1 : hintLevel;
    if (![1, 2, 3].includes(level)) {
      return sendError(res, 400, 'INVALID_INPUT', 'hintLevel 必须是 1, 2, 或 3');
    }

    const exercise = oracleData.find(ex => ex.id === exerciseId);
    if (!exercise) {
      return sendError(res, 404, 'NOT_FOUND', '题目不存在');
    }

    let isCorrect = false;
    let isInvalidType = false;

    if (exercise.type === 'value' || typeof exercise.answer === 'number') {
      if (typeof answer === 'number' && Number.isSafeInteger(answer)) {
        isCorrect = (answer === exercise.answer);
      } else {
        isInvalidType = true;
      }
    } else if (exercise.type === 'choice') {
      // 修复审查意见：校验非空且存在于选项 ID 集合中
      if (typeof answer === 'string' && answer.trim() !== '') {
        const validOptions = (exercise.options || []).map(o => o.id);
        if (!validOptions.includes(answer)) {
          return sendError(res, 400, 'INVALID_INPUT', '选项 ID 不存在');
        }
        isCorrect = (answer === exercise.answer);
      } else {
        isInvalidType = true;
      }
    } else if (exercise.type === 'judgement') {
      if (typeof answer === 'boolean') {
        isCorrect = (answer === exercise.answer);
      } else {
        isInvalidType = true;
      }
    }

    if (isInvalidType) {
      return sendError(res, 400, 'INVALID_INPUT', '答案格式不符合题型要求');
    }

    const responsePayload = { correct: isCorrect };

    if (!isCorrect) {
      if (level >= 3) {
        responsePayload.correctAnswer = exercise.answer;
        responsePayload.explanation = exercise.explanation || '暂无解析';
      } else {
        responsePayload.hint = exercise.hints && exercise.hints[level - 1] ? exercise.hints[level - 1] : '再仔细想想哦';
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responsePayload));
  } catch (e) {
    sendError(res, 400, 'INVALID_INPUT', '请求体格式错误');
  }
}

function sendError(res, status, code, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code, message } }));
}