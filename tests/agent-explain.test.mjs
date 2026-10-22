import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = [];
let mockBase;
let defaultBase;
let cards;

async function start(mock) {
  const child = spawn(process.execPath, ['backend/src/server.js'], {
    cwd: root, env: { ...process.env, PORT: '0', HOST: '127.0.0.1', AGENT_MOCK: String(mock), DEEPSEEK_API_KEY: '', RATE_LIMIT: 'false' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  });
  children.push(child);
  let out = '';
  let errors = '';
  child.stderr.on('data', data => { errors += data; });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timeout: ' + errors)), 10000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('server exited: ' + code + ' ' + errors)); });
    child.stdout.on('data', data => {
      out += data;
      const match = out.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
}

before(async () => {
  [mockBase, defaultBase] = await Promise.all([start(true), start(false)]);
  cards = JSON.parse(await readFile(new URL('../content/knowledge/cards.json', import.meta.url), 'utf8'));
});
after(async () => {
  await Promise.all(children.map(async child => {
    if (child.exitCode !== null) return;
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }));
});

async function call(path, body, base = mockBase) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}
async function run(array = [1, 3, 5, 7, 9], target = 7) {
  const response = await call('/api/algorithms/binary-search/runs', { array, target });
  assert.equal(response.status, 200);
  return response.body;
}
function input(runId, patch = {}) {
  return { runId, stepIndex: 1, question: '这一步依据是什么？', hintLevel: 1, ...patch };
}
async function explain(runId, patch = {}) { return call('/api/agent/explain', input(runId, patch)); }

test('default mode remains 503 without a model call', async () => {
  const response = await call('/api/agent/explain', {}, defaultBase);
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, 'MODEL_NOT_CONFIGURED');
  assert.equal((await call('/api/health', undefined, defaultBase)).body.modelCallsEnabled, false);
});

test('all six events and three levels cite the right real step and verified card', async () => {
  const runs = [await run(), await run([1, 3, 5], 0)];
  const expected = { init: 'bs-k01', probe: 'bs-k03', 'move-left': 'bs-k04',
    'move-right': 'bs-k05', found: 'bs-k08', 'not-found': 'bs-k06' };
  const events = new Set();
  for (const current of runs) for (const step of current.steps) for (const level of [1, 2, 3]) {
    const response = await explain(current.runId, { stepIndex: step.stepIndex, hintLevel: level,
      stepState: { left: 999, right: 1000, mid: 999, event: 'found' } });
    assert.equal(response.status, 200);
    const { body } = response;
    assert.ok(body.answer.startsWith('[Mock开发模式]'));
    assert.ok(!body.answer.includes('undefined'));
    assert.ok(!body.answer.includes('999'));
    assert.deepEqual(body.usage, { model: 'mock', cost: 0, mock: true });
    assert.equal(body.stepRefs[0].runId, current.runId);
    assert.equal(body.stepRefs[0].stepIndex, step.stepIndex);
    for (const key of ['left', 'right', 'mid']) assert.equal(body.stepRefs[0][key], step.variables[key]);
    const card = cards.find(card => card.id === expected[step.event]);
    assert.equal(body.sourceRefs[0].cardId, card.id);
    assert.equal(body.sourceRefs[0].sourceId, card.sourceId);
    assert.equal(body.sourceRefs[0].verified, true);
    assert.equal(body.sourceRefs[0].chapter, null);
    assert.equal(body.sourceRefs[0].pages, null);
    assert.ok(body.answer.includes(card.title));
    events.add(step.event);
  }
  assert.equal(events.size, 6);
});

test('reject coerced or missing step indexes instead of selecting a different step', async () => {
  const current = await run();
  for (const index of ['', '1', ' ', true, false, [], [1], {}, null, -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    const response = await explain(current.runId, { stepIndex: index });
    assert.equal(response.status, 400, JSON.stringify(index));
    assert.equal(response.body.error.code, 'INVALID_INPUT');
  }
  const payload = input(current.runId); delete payload.stepIndex;
  assert.equal((await call('/api/agent/explain', payload)).body.error.code, 'INVALID_INPUT');
});

test('reject blank, absent or non-string questions and invalid explicit hint levels', async () => {
  const current = await run();
  for (const question of ['', ' \n\t ', null, 1, false, [], {}]) {
    const response = await explain(current.runId, { question });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_INPUT');
  }
  const absent = input(current.runId); delete absent.question;
  assert.equal((await call('/api/agent/explain', absent)).body.error.code, 'INVALID_INPUT');
  for (const hintLevel of [null, 0, 4, 99, '3', true, [], {}]) {
    const response = await explain(current.runId, { hintLevel });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_INPUT');
  }
  const defaultLevel = input(current.runId); delete defaultLevel.hintLevel;
  assert.equal((await call('/api/agent/explain', defaultLevel)).status, 200);
});

test('unknown run, out-of-range step and malformed objects have explicit errors', async () => {
  assert.equal((await explain('missing-run')).body.error.code, 'RUN_NOT_FOUND');
  const current = await run();
  const response = await explain(current.runId, { stepIndex: current.steps.length });
  assert.equal(response.status, 400); assert.equal(response.body.error.code, 'STEP_OUT_OF_RANGE');
  for (const body of [null, [], 'text', 1, {}]) {
    assert.equal((await call('/api/agent/explain', body)).body.error.code, 'INVALID_INPUT');
  }
});

test('empty and exhausted intervals end; equal probes lead to found', async () => {
  for (const [array, target] of [[[], 2], [[1], 2], [[1], 0]]) {
    const current = await run(array, target);
    for (const step of current.steps.filter(step => step.variables.left > step.variables.right)) {
      for (const level of [1, 2, 3]) {
        const response = await explain(current.runId, { stepIndex: step.stepIndex, hintLevel: level });
        assert.match(response.body.answer, /not-found/);
        assert.ok(!response.body.answer.includes('下一步重新计算'));
      }
    }
  }
  const current = await run();
  const probe = current.steps.find(step => step.event === 'probe' && step.array[step.variables.mid] === step.target);
  const response = await explain(current.runId, { stepIndex: probe.stepIndex, hintLevel: 3 });
  assert.match(response.body.answer, /下一步：命中（found）/);
});

test('JSON errors and UTF-8 body limit preserve INVALID_INPUT on all POST routes', async () => {
  const malformed = await fetch(mockBase + '/api/agent/explain', { method: 'POST', body: '{' });
  assert.equal(malformed.status, 400); assert.equal((await malformed.json()).error.code, 'INVALID_INPUT');
  const current = await run();
  for (const [path, body] of [
    ['/api/agent/explain', input(current.runId)],
    ['/api/algorithms/binary-search/runs', { array: [1], target: 1 }],
    ['/api/exercises/check', { exerciseId: 'bs-q01', answer: 3 }]
  ]) {
    const response = await call(path, { ...body, padding: '中'.repeat(4000) });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_INPUT');
    assert.match(response.body.error.message, /10KB/);
  }
});

test('static assets and existing exercise routes still work with mock enabled', async () => {
  for (const path of ['/', '/src/features/visualization/dev-morph.html', '/src/features/visualization/index.js']) {
    const response = await fetch(mockBase + path);
    assert.equal(response.status, 200); await response.arrayBuffer();
  }
  const questions = await call('/api/exercises');
  assert.equal(questions.body.exercises.length, 10);
  assert.ok(questions.body.exercises.every(question => !Object.hasOwn(question, 'answer')));
  assert.deepEqual((await call('/api/exercises/check', { exerciseId: 'bs-q01', answer: 3 })).body, { correct: true });
});
