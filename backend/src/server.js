import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// 引入我们写好的业务路由
import { handleCreateRun, handleGetRun, handleGetStep } from './routes/runs.js';
import { handleGetExercises, handleCheckExercise } from './routes/exercises.js';



const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, '../../frontend');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function json(response, code, value) {
  response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

// 辅助函数：读取 POST 请求体
async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
  }
  return body;
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const method = request.method;

    // 1. 健康检查
    if (pathname === '/api/health' && method === 'GET') {
      return json(response, 200, { ok: true, stage: 'scaffold', implemented: ['static-page', 'health'], modelCallsEnabled: false });
    }

    // 2. 04 的业务路由
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
        // 04 的题目与判分路由
    if (pathname === '/api/exercises' && method === 'GET') {
      return handleGetExercises(request, response);
    }
    if (pathname === '/api/exercises/check' && method === 'POST') {
      const body = await readBody(request);
      return handleCheckExercise(request, response, body);
    }


        // 05 的 Agent 接口（降级处理，防止阻塞其他业务）
    if (pathname === '/api/agent/explain' && method === 'POST') {
      request.resume();
      return json(response, 503, { error: { code: 'MODEL_NOT_CONFIGURED', message: '模型未配置，不影响算法和判分。' } });
    }

    // 3. 其他尚未实现的计划路由（返回 501）
    const plannedRoutes = [
     // ['POST', /^\/api\/agent\/explain$/, 'M05'],
      ['GET', /^\/api\/knowledge\/cards$/, 'M06'],
     // ['GET', /^\/api\/exercises$/, 'M04+M06'],
      //['POST', /^\/api\/exercises\/check$/, 'M04+M07']
    ];

    const planned = plannedRoutes.find(([m, pattern]) => m === method && pattern.test(pathname));
    if (planned) {
      request.resume();
      return json(response, 501, { error: { code: 'NOT_IMPLEMENTED', message: '当前仅为协作骨架，业务功能待实现。', owner: planned[2] } });
    }

    // 4. 静态文件处理等原有逻辑
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