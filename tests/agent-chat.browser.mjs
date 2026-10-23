import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL, fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.TEST_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.TEST_PLAYWRIGHT_MODULE).href : 'playwright');
const child = spawn(process.execPath, ['backend/src/server.js'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true, stdio: ['ignore','pipe','pipe'],
  env: { ...process.env, HOST: '127.0.0.1', PORT: '0', AGENT_MOCK: 'true', DEEPSEEK_API_KEY: '', RATE_LIMIT: 'false' }
});
let browser;
try {
  const base = await new Promise((resolve, reject) => {
    let text = ''; const timer = setTimeout(() => reject(new Error('startup timeout')), 10000);
    child.on('error', reject);
    child.stdout.on('data', data => { text += data; const m = text.match(/http:\/\/127\.0\.0\.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } });
  });
  const run = await (await fetch(base + '/api/algorithms/binary-search/runs', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({array:[1,3,5,7,9],target:7}) })).json();
  browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/src/features/agent/chat.html?runId=${run.runId}&stepIndex=1`);
  await page.fill('#question-input', '这一步为什么？');
  await page.click('#send-btn');
  await page.waitForFunction(() => !document.querySelector('#send-btn').disabled && document.querySelector('#usage-info').textContent.includes('调用 1 次'));
  assert.match(await page.locator('.message.assistant').innerText(), /步骤2/);
  assert.match(await page.locator('#usage-info').innerText(), /Token 0/);
  assert.equal(await page.locator('.message.assistant .message-meta').count(), 1);

  let pending;
  await page.route('**/api/agent/explain', route => { pending = route; });
  await page.fill('#question-input', '等待旧步骤回复'); await page.click('#send-btn');
  await page.waitForFunction(() => document.querySelector('#send-btn').disabled);
  while (!pending) await new Promise(resolve => setTimeout(resolve, 5));
  await page.fill('#step-index-input', '4');
  await pending.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({runId:run.runId,stepIndex:1,hintLevel:2,answer:'旧步骤回答'}) });
  await page.waitForFunction(() => !document.querySelector('#send-btn').disabled);
  assert.match(await page.locator('.message.assistant').last().innerText(), /步骤2/);
  await page.unroute('**/api/agent/explain');

  const payloads = []; const dialogs = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await page.route('**/api/agent/explain', async route => {
    payloads.push(route.request().postDataJSON());
    const ok = payloads.length > 1;
    await route.fulfill({ status: ok ? 200 : 502, contentType:'application/json', body:JSON.stringify(ok ? {runId:run.runId,stepIndex:4,answer:'重试成功'} : {error:{message:'模拟失败'}}) });
  });
  await page.fill('#question-input', '重试必须保留这个问题'); await page.click('#send-btn');
  await page.waitForFunction(() => !document.querySelector('#send-btn').disabled);
  await page.fill('#step-index-input', '0'); await page.fill('#run-id-input', 'another-run');
  await page.click('#retry-btn'); await page.waitForFunction(() => !document.querySelector('#send-btn').disabled);
  assert.equal(payloads.length, 2); assert.deepEqual(payloads[1], payloads[0]);
  assert.equal(payloads[1].question, '重试必须保留这个问题'); assert.equal(payloads[1].stepIndex, 4);
  assert.equal(dialogs.length, 0);
  assert.equal(errors.length, 0);
  console.log('Browser passed: Mock send/session usage, no knowledge citation, old-step attribution, retry original payload; no page errors.');
} finally {
  if (browser) await browser.close();
  if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
}
