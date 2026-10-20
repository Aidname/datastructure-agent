// 09原型专用只读预览服务；不挂载生产API，不提供写入和模型调用。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.md': 'text/plain' };
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/docs/prototype/index.html' : pathname));
    const relative = file.slice(root.length + 1).split(sep);
    if (!file.startsWith(root + sep) || relative.some(x => x.startsWith('.')) || !types[extname(file)]) { res.writeHead(404); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] + (extname(file) === '.png' ? '' : '; charset=utf-8') });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const port = Number(process.env.PROTOTYPE_PORT || 3099);
server.listen(port, '127.0.0.1', () => console.log(`Prototype: http://127.0.0.1:${port}/docs/prototype/index.html`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
