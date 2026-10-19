import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// 读取 06 的数据文件（请确保路径正确，可能需要根据实际调整）
const oraclePath = resolve(here, '../../../content/exercises/binary-search-oracle.json');
let oracleData = [];

// 启动时加载数据
try {
  const raw = await readFile(oraclePath, 'utf-8');
  oracleData = JSON.parse(raw);
} catch (e) {
  console.error("无法读取题库数据，请检查路径:", oraclePath);
}

// GET /api/exercises：展示题目，剥离答案
export function handleGetExercises(req, res) {
  // 剥离 result 和 why，防止被学生看到
  const publicExercises = oracleData.map(ex => ({
    id: ex.id,
    array: ex.array,
    target: ex.target
  }));

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ exercises: publicExercises }));
}

// POST /api/exercises/check：判分
export function handleCheckExercise(req, res, body) {
  try {
    const { exerciseId, answer } = JSON.parse(body);
    
    if (!exerciseId || answer === undefined) {
      return sendError(res, 400, 'INVALID_INPUT', '缺少 exerciseId 或 answer');
    }

    const exercise = oracleData.find(ex => ex.id === exerciseId);
    if (!exercise) {
      return sendError(res, 404, 'NOT_FOUND', '题目不存在');
    }

    // 判断是否正确 (answer 可能是字符串，转成数字比较)
    const studentAnswer = parseInt(answer, 10);
    const isCorrect = (studentAnswer === exercise.result);

    const responsePayload = {
      correct: isCorrect,
    };

    // 如果答错，提供标准解析作为解释
    if (!isCorrect) {
      responsePayload.explanation = exercise.why;
      responsePayload.correctAnswer = exercise.result; 
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