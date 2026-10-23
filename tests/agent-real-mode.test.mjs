import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const children = [], directories = [];
after(async () => {
  for (const child of children) if (child.exitCode === null) { const exit = once(child, 'exit'); child.kill(); await exit; }
  for (const path of directories) rmSync(path, { recursive: true, force: true });
});
async function start(env = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'agent-http-')); directories.push(directory);
  const child = spawn(process.execPath, ['--import', new URL('./fixtures/deepseek-fetch.mjs', import.meta.url).href, 'backend/src/server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', DEEPSEEK_API_KEY: 'test-dummy', AGENT_MOCK: 'false', RATE_LIMIT: 'false',
      BUDGET_ENABLED: 'true', BUDGET_DAILY_YUAN: '5', MODEL_TEST_BUDGET_CNY: '30', MODEL_CALL_RESERVE_CNY: '0.05',
      RATE_LIMIT_DAILY_TOKENS: '1000000', MODEL_TIMEOUT_MS: '50', MODEL_INPUT_CNY_PER_MILLION: '1', MODEL_OUTPUT_CNY_PER_MILLION: '2',
      AGENT_BUDGET_FILE: join(directory, 'budget.json'), ...env }
  }); children.push(child);
  return new Promise((resolve, reject) => {
    let output = '', errors = '';
    const timer = setTimeout(() => reject(new Error('startup timeout ' + errors)), 10000);
    child.stderr.on('data', d => { errors += d; });
    child.once('error', reject); child.once('exit', code => { clearTimeout(timer); reject(new Error('exit ' + code + errors)); });
    child.stdout.on('data', d => { output += d; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
  });
}
async function call(base, path, body) {
  const r = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}
async function input(base) {
  const run = await call(base, '/api/algorithms/binary-search/runs', { array: [1,3,5,7,9], target: 7 });
  return { runId: run.body.runId, stepIndex: 1, question: '这一步为什么', hintLevel: 1, sessionId: 'test-session' };
}

test('real HTTP mode uses server page state; explicit Mock overrides a configured Key', async () => {
  const real = await start(); const request = await input(real);
  const response = await call(real, '/api/agent/explain', request);
  assert.equal(response.status, 200); assert.equal(response.body.usage.mock, false);
  assert.equal(response.body.usage.tokens.totalTokens, 15);
  assert.equal(response.body.stepRefs[0].event, 'probe'); assert.deepEqual(response.body.sourceRefs, []);assert.equal(response.body.knowledgeUsed,false);
  const usage = await call(real, '/api/agent/usage?sessionId=test-session');
  assert.equal(usage.body.requests, 1); assert.equal(usage.body.tokensUsed, 15);
  assert.ok(usage.body.costUsed > 0);
  const mock = await start({ AGENT_MOCK: 'true' });
  const result = await call(mock, '/api/agent/explain', await input(mock));
  assert.equal(result.body.usage.mock, true); assert.equal(result.body.usage.cost, 0);
  assert.equal((await call(mock, '/api/health')).body.modelCallsEnabled, false);
});

test('model failures/timeout leave algorithms working and preserve unknown accounting', async () => {
  const base = await start(); const request = await input(base);
  for (const [question, status, code] of [['中点 TEST_FAILURE',502,'MODEL_CALL_FAILED'], ['中点 TEST_TIMEOUT_BODY',504,'MODEL_TIMEOUT']]) {
    const r = await call(base, '/api/agent/explain', { ...request, question });
    assert.equal(r.status, status); assert.equal(r.body.error.code, code);
    assert.equal(JSON.stringify(r).includes('sensitive-upstream'), false);
  }
  const result = await call(base, '/api/agent/explain', { ...request, question: '中点 TEST_UNKNOWN_USAGE' });
  assert.equal(result.status, 200); assert.equal(result.body.usage.cost, null); assert.equal(result.body.usage.tokens, null);
  const usage = (await call(base, '/api/agent/usage?sessionId=test-session')).body;
  assert.equal(usage.requests, 3); assert.equal(usage.failures, 2); assert.equal(usage.costUsed, null);
  assert.equal((await call(base, '/api/algorithms/binary-search/runs', { array: [], target: 1 })).status, 200);
});

test('real input validation rejects coercion before model accounting', async () => {
  const base = await start(); const request = await input(base);
  for (const stepIndex of ['', false, [], '1', -1, 0.5]) assert.equal((await call(base, '/api/agent/explain', { ...request, stepIndex })).status, 400);
  assert.equal((await call(base, '/api/agent/usage?sessionId=test-session')).body.requests, 0);
});

test('HTTP budgets reserve concurrently and source rate limits survive a new run/session', async () => {
  const budget = await start({ BUDGET_DAILY_YUAN: '0.05' }); const request = await input(budget);
  const results = await Promise.all([1,2].map(() => call(budget, '/api/agent/explain', { ...request, question: '中点 TEST_TIMEOUT_BODY' })));
  assert.deepEqual(results.map(r => r.status).sort(), [429,504]);
  const limit = await start({ RATE_LIMIT: 'true', RATE_LIMIT_MAX: '2' }); const limited = await input(limit);
  assert.equal((await call(limit, '/api/agent/explain', limited)).status, 200);
  assert.equal((await call(limit, '/api/agent/explain', limited)).status, 200);
  assert.equal((await call(limit, '/api/agent/explain', { ...limited, sessionId: 'new-session' })).status, 429);
});



test('knowledge HTTP catalog/search works without model credentials and validates query parameters', async () => {
  const base = await start({DEEPSEEK_API_KEY:'',AGENT_MOCK:'false'});
  const catalog = await call(base,'/api/knowledge/cards?topicId=binary-search');
  assert.equal(catalog.status,200); assert.equal(catalog.body.cards.length,10);
  const result = await call(base,'/api/knowledge/cards?' + new URLSearchParams({topicId:'binary-search',q:'为什么必须有序',limit:'1'}));
  assert.equal(result.status,200); assert.equal(result.body.cards[0].id,'bs-k01');
  assert.equal(result.body.sourceRefs[0].sourceType,'original');
  assert.deepEqual((await call(base,'/api/knowledge/cards?topicId=unknown&q=mid')).body.cards,[]);
  for (const query of ['q=','limit=0','limit=1.5','topicId=']) assert.equal((await call(base,'/api/knowledge/cards?'+query)).status,400);
  assert.ok((await call(base,'/api/health')).body.implemented.includes('knowledge'));
});



test('every valid phrasing reaches model with source code, highlight and previous state; no knowledge references', async () => {
 const base=await start({MODEL_TIMEOUT_MS:'500',TEST_BLOCK_KNOWLEDGE_READ:'true'});const body=await input(base);
 assert.equal((await call(base,'/api/knowledge/cards')).status,503);
 for(const question of ['为什么这一步是到6不是5 TEST_PAGE_CONTEXT','能再讲详细一点吗？','随便换一种问法','红黑树怎样旋转','你是谁','为什么选999不是888']) {
  const result=await call(base,'/api/agent/explain',{...body,stepIndex:2,question});
  assert.equal(result.status,200,question);assert.equal(result.body.usage.mock,false);assert.equal(result.body.usage.tokens.totalTokens,15);
  assert.equal(result.body.retrieval.status,'disabled');assert.equal(result.body.knowledgeUsed,false);assert.deepEqual(result.body.sourceRefs,[]);
  assert.equal(result.body.stepRefs[0].mid,null);assert.ok(!('knowledgeCard' in result.body.stepRefs[0]));
 }
 assert.equal((await call(base,'/api/agent/usage?sessionId=test-session')).body.requests,6);
 assert.equal((await call(base,'/api/agent/explain',{...body,question:'x'.repeat(2001)})).status,400);
});

test('empty model output is a retryable failure rather than a successful canned answer', async () => {
 const base=await start();const body={...await input(base),question:'TEST_EMPTY_OUTPUT',conversationId:'empty-conversation',turnId:'empty-turn-0001'};
 for(let i=0;i<2;i++)assert.equal((await call(base,'/api/agent/explain',body)).status,502);
 assert.equal((await call(base,'/api/agent/usage?sessionId=test-session')).body.requests,2);
});
