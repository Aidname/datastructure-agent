import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// 修复 1：改为读取正式题库文件
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
  const publicExercises = oracleData.map(ex => {
    // 修复 1：只返回白名单字段，包括题面、题型和选项
    const pub = {
      id: ex.id,
      topicId: ex.topicId,
      type: ex.type,
      prompt: ex.prompt,
      context: ex.context,
      options: ex.options || []
    };
    // 注意：这里绝对不能返回 ex.answer
    return pub;
  });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ exercises: publicExercises }));
}

// POST /api/exercises/check：判分
export function handleCheckExercise(req, res, body) {
  try {
    const { exerciseId, answer, hintLevel = 1 } = JSON.parse(body);
    
    if (!exerciseId || answer === undefined) {
      return sendError(res, 400, 'INVALID_INPUT', '缺少 exerciseId 或 answer');
    }

    const exercise = oracleData.find(ex => ex.id === exerciseId);
    if (!exercise) {
      return sendError(res, 404, 'NOT_FOUND', '题目不存在');
    }

    let isCorrect = false;
    let isInvalidType = false;

    // 修复 5：严格按照题型验证并比较
    if (exercise.type === 'value' || typeof exercise.answer === 'number') {
      if (typeof answer === 'number' && Number.isSafeInteger(answer)) {
        isCorrect = (answer === exercise.answer);
      } else {
        isInvalidType = true;
      }
    } else if (exercise.type === 'choice') {
      if (typeof answer === 'string') {
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

    // 修复 6：答错时根据 hintLevel 决定是否展示答案和解析
    if (!isCorrect) {
      if (hintLevel >= 3) {
        responsePayload.correctAnswer = exercise.answer;
        responsePayload.explanation = exercise.why || exercise.explanation || '暂无解析';
      } else {
        // 如果 06 的题库里有 hints 字段，就返回对应等级的提示
        responsePayload.hint = exercise.hints && exercise.hints[hintLevel - 1] ? exercise.hints[hintLevel - 1] : '再仔细想想哦';
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