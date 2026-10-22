import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleCreateRun, handleGetRun, handleGetStep } from './routes/runs.js';
import { handleGetExercises, handleCheckExercise } from './routes/exercises.js';

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, '../../frontend');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function json(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

// 按字节限制请求体大小（10KB），最后统一UTF-8解码
async function readBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 10240) {
      throw new Error('BODY_TOO_LARGE');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const method = request.method;

    // 1. 健康检查
    if (pathname === '/api/health' && method === 'GET') {
      return json(response, 200, { ok: true, stage: 'scaffold', implemented: ['static-page', 'health', 'runs', 'exercises'], modelCallsEnabled: false });
    }

    // 2. 04 的运行路由
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

    // 3. 04 的题目与判分路由
    if (pathname === '/api/exercises' && method === 'GET') {
      return handleGetExercises(request, response);
    }
    if (pathname === '/api/exercises/check' && method === 'POST') {
      const body = await readBody(request);
      return handleCheckExercise(request, response, body);
    }

    // 4. 05 Agent 解释路由（开发期 Mock；生产仍 503）
    if (pathname === '/api/agent/explain' && method === 'POST') {
      if (process.env.AGENT_MOCK !== 'true') {
        request.resume();
        return json(response, 503, {
          error: {
            code: 'MODEL_NOT_CONFIGURED',
            message: '模型未配置，不影响算法和判分。开发阶段请设置 AGENT_MOCK=true 启用 Mock 模式。'
          }
        });
      }
      try {
        const body = await readBody(request);
        let input = {};
        try {
          input = body ? JSON.parse(body) : {};
        } catch {
          return json(response, 400, { error: { code: 'INVALID_REQUEST', message: '请求体不是合法 JSON' } });
        }
        const { handleAgentExplain } = await import('./agent/explain.mjs');
        const result = await handleAgentExplain(input);
        return json(response, result.status, result.body);
      } catch (err) {
        request.resume();
        // BODY_TOO_LARGE 不在这里处理，让它自然抛到外层统一返回 400 INVALID_INPUT
        return json(response, 400, { error: { code: 'INVALID_INPUT', message: 'Agent 请求处理失败', detail: err.message } });
      }
    }

    // 5. 其他尚未实现的计划路由
    const plannedRoutes = [
      ['GET', /^\/api\/knowledge\/cards$/, 'M06']
    ];

    const planned = plannedRoutes.find(([m, pattern]) => m === method && pattern.test(pathname));
    if (planned) {
      request.resume();
      return json(response, 501, { error: { code: 'NOT_IMPLEMENTED', message: '当前仅为协作骨架，业务功能待实现。', owner: planned[2] } });
    }

    // 6. 静态文件处理
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
