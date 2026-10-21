import http from 'http';
import { URL } from 'url';
import { handleAgentExplain } from './agent/explain.mjs';
import { handleCreateRun, handleGetRun, handleGetStep } from './routes/runs.js';

const PORT = process.env.PORT || 3000;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // 限制10KB
      if (body.length > 10240) {
        reject(new Error('请求体过大'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 健康检查
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // 创建 run
  if (pathname === '/api/algorithms/binary-search/runs' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      handleCreateRun(req, res, body);
    } catch (err) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'PAYLOAD_TOO_LARGE', message: err.message } }));
    }
    return;
  }

  // 获取 run
  if (pathname.match(/^\/api\/runs\/[^/]+\/?$/) && req.method === 'GET') {
    const runId = pathname.split('/')[3];
    handleGetRun(req, res, runId);
    return;
  }

  // 获取 step
  if (pathname.match(/^\/api\/runs\/[^/]+\/steps\/\d+\/?$/) && req.method === 'GET') {
    const parts = pathname.split('/');
    const runId = parts[3];
    const stepIndex = parts[5];
    handleGetStep(req, res, runId, stepIndex);
    return;
  }

  // Agent explain
  if (pathname === '/api/agent/explain' && req.method === 'POST') {
    // P2: Mock需显式开启
    if (process.env.AGENT_MOCK !== 'true') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          code: 'MODEL_NOT_CONFIGURED',
          message: '模型未配置。开发阶段请设置 AGENT_MOCK=true 启用 Mock 模式。'
        }
      }));
      return;
    }

    try {
      const body = await parseBody(req);
      const input = body ? JSON.parse(body) : {};
      const result = await handleAgentExplain(input);

      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: { code: 'BAD_REQUEST', message: '请求体格式错误', detail: err.message }
      }));
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: '接口不存在' } }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mock mode: ${process.env.AGENT_MOCK === 'true' ? 'ENABLED' : 'DISABLED (set AGENT_MOCK=true to enable)'}`);
});
