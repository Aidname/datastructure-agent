import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleCreateRun, handleGetRun, handleGetStep } from './routes/runs.js';
import { handleGetExercises, handleCheckExercise } from './routes/exercises.js';
import { getUsage } from './agent/rate-limit.js';
import { knowledgeResponse } from './knowledge/retrieve.js';

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, '../../frontend');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function json(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 10240) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// ===== P1 FIX: AGENT_MOCK 显式优先 =====
const mockEnabled = process.env.AGENT_MOCK === 'true';
const hasRealModel = !mockEnabled && Boolean(process.env.DEEPSEEK_API_KEY);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const method = request.method;

    // 1. 健康检查
    if (pathname === '/api/health' && method === 'GET') {
      return json(response, 200, {
        ok: true,
        stage: 'scaffold',
        implemented: ['static-page', 'health', 'runs', 'exercises', 'agent', 'knowledge'],
        modelCallsEnabled: hasRealModel,
        mode: mockEnabled ? 'mock' : (hasRealModel ? 'deepseek' : 'disabled')
      });
    }

    // 2. 04 运行路由
    if (pathname === '/api/algorithms/binary-search/runs' && method === 'POST') {
      const body = await readBody(request);
      return handleCreateRun(request, response, body);
    }

    const stepMatch = pathname.match(/^\/api\/runs\/([^/]+)\/steps\/(\d+)$/);
    if (stepMatch && method === 'GET') {
      return handleGetStep(request, response, stepMatch[1], stepMatch[2]);
    }

    const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch && method === 'GET') {
      return handleGetRun(request, response, runMatch[1]);
    }

    // 3. 04 题目与判分路由
    if (pathname === '/api/exercises' && method === 'GET') {
      return handleGetExercises(request, response);
    }
    if (pathname === '/api/exercises/check' && method === 'POST') {
      const body = await readBody(request);
      return handleCheckExercise(request, response, body);
    }

    // 4. 05 Agent 解释路由
    if (pathname === '/api/agent/explain' && method === 'POST') {
      // P1 FIX: mockEnabled 优先，即使有 Key 也走 mock
      if (mockEnabled) {
        try {
          const body = await readBody(request);
          let input = {};
          try { input = body ? JSON.parse(body) : {}; } catch {
            return json(response, 400, { error: { code: 'INVALID_INPUT', message: '请求体不是合法 JSON' } });
          }
          const { handleAgentExplain } = await import('./agent/explain.mjs');
          const result = await handleAgentExplain(input, { mode: 'mock', req: request });
          return json(response, result.status, result.body);
        } catch (err) {
          if (err.message === 'BODY_TOO_LARGE') throw err;
          return json(response, 400, { error: { code: 'INVALID_INPUT', message: 'Agent 请求处理失败' } });
        }
      }

      if (hasRealModel) {
        try {
          const body = await readBody(request);
          let input = {};
          try { input = body ? JSON.parse(body) : {}; } catch {
            return json(response, 400, { error: { code: 'INVALID_INPUT', message: '请求体不是合法 JSON' } });
          }
          const { handleAgentExplain } = await import('./agent/explain.mjs');
          const result = await handleAgentExplain(input, { mode: 'real', req: request });
          return json(response, result.status, result.body);
        } catch (err) {
          if (err.message === 'BODY_TOO_LARGE') throw err;
          if (err.message === 'MODEL_TIMEOUT') {
            return json(response, 504, { error: { code: 'MODEL_TIMEOUT', message: '模型响应超时，请稍后重试' } });
          }
          return json(response, 502, { error: { code: 'MODEL_CALL_FAILED', message: '模型调用失败' } });
        }
      }

      return json(response, 503, {
        error: {
          code: 'MODEL_NOT_CONFIGURED',
          message: '模型未配置。请设置 AGENT_MOCK=true 启用 Mock 模式，或配置 DEEPSEEK_API_KEY 启用真实模型。'
        }
      });
    }

    // 5. 用量查询接口 —— P5 FIX: 支持 ?sessionId=xxx 查询参数
    if (pathname === '/api/agent/usage' && method === 'GET') {
      const url = new URL(request.url, 'http://localhost');
      const querySessionId = url.searchParams.get('sessionId');
      const headerSessionId = request.headers['x-session-id'];
      const sessionId = querySessionId || headerSessionId || 'anon';
      return json(response, 200, { ok: true, ...getUsage(request, sessionId) });
    }

    if (pathname === '/api/knowledge/cards' && method === 'GET') {
      const result = knowledgeResponse(new URL(request.url, 'http://localhost').searchParams);
      return json(response, result.status, result.body);
    }

    // 6. 静态文件
    if (pathname.startsWith('/api/')) return json(response, 404, { error: { code: 'NOT_FOUND', message: '接口不存在。' } });
    if (!['GET', 'HEAD'].includes(method)) return json(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持。' } });
    const file = resolve(frontendRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(frontendRoot + sep)) return json(response, 403, { error: { code: 'FORBIDDEN', message: '路径不允许。' } });
    const type = mime[extname(file)];
    if (!type) return json(response, 404, { error: { code: 'NOT_FOUND', message: '文件不存在。' } });
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
      response.end(method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) return json(response, 404, { error: { code: 'NOT_FOUND', message: '文件不存在。' } });
      throw error;
    }
  } catch (error) {
    if (error.message === 'BODY_TOO_LARGE') {
      return json(response, 400, { error: { code: 'INVALID_INPUT', message: '请求体超过 10KB 限制' } });
    }
    console.error(error);
    json(response, 400, { error: { code: 'INVALID_REQUEST', message: '请求无法处理。' } });
  }
});

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer between 0 and 65535');
server.listen(port, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`Scaffold running at http://${process.env.HOST ?? '127.0.0.1'}:${server.address().port}`);
});
server.on('error', (error) => { console.error(`Server startup failed: ${error.code}`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
