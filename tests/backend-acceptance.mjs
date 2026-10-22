import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Server } from 'node:http';
import { once } from 'node:events';
import { spawn, execFileSync } from 'node:child_process';

// Run against this checkout; never overwrite historical audit evidence.
const root = fileURLToPath(new URL('../', import.meta.url));
let reviewedHead = null, workingTreeDirty = null;
try {
  reviewedHead = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root, encoding:'utf8', windowsHide:true, stdio:['ignore','pipe','ignore']}).trim();
  workingTreeDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {cwd:root, encoding:'utf8', windowsHide:true, stdio:['ignore','pipe','ignore']}).trim());
} catch { /* Source archives can run the checks without Git metadata. */ }
const json = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const engine = await import(pathToFileURL(resolve(root, 'shared/algorithms/binarySearch.js')));
const schema = await json('shared/schemas/step.schema.json');
const questions = await json('content/exercises/binary-search.json');
const oracles = await json('content/exercises/binary-search-oracle.json');
const results = [];
const stringify = value => JSON.stringify(value);
async function check(name, fn) {
  try { results.push({ name, passed: true, detail: await fn() }); }
  catch (error) { results.push({ name, passed: false, detail: error.message }); }
}
function validate(value, rule, path = 'step') {
  const kinds = { object: v => v !== null && typeof v === 'object' && !Array.isArray(v), array: Array.isArray,
    integer: Number.isInteger, number: v => typeof v === 'number', null: v => v === null,
    string: v => typeof v === 'string', boolean: v => typeof v === 'boolean' };
  if (rule.type) assert.ok([rule.type].flat().some(type => kinds[type](value)), path + ': type');
  if (Object.hasOwn(rule, 'const')) assert.deepEqual(value, rule.const, path + ': const');
  if (rule.enum) assert.ok(rule.enum.includes(value), path + ': enum');
  if (typeof value === 'number' && rule.minimum !== undefined) assert.ok(value >= rule.minimum, path + ': minimum');
  if (typeof value === 'string' && rule.minLength !== undefined) assert.ok(value.length >= rule.minLength, path + ': minLength');
  if (Array.isArray(value) && rule.items) value.forEach((item, i) => validate(item, rule.items, `${path}[${i}]`));
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required || []) assert.ok(Object.hasOwn(value, key), path + ': required ' + key);
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) assert.ok(Object.hasOwn(rule.properties || {}, key), path + ': extra ' + key);
    for (const [key, child] of Object.entries(rule.properties || {})) if (Object.hasOwn(value, key)) validate(value[key], child, path + '.' + key);
  }
}
function inspectTrace(array, target) {
  const run = engine.generateSteps(array, target);
  const ids = new Set(run.sourceLines.map(line => line.lineId));
  assert.equal(ids.size, run.sourceLines.length);
  assert.ok(run.steps.length >= 2);
  assert.equal(run.steps[0].event, 'init');
  assert.deepEqual(run.steps[0].variables, { left: 0, right: array.length - 1, mid: null });
  const matches = array.map((value, i) => value === target ? i : -1).filter(i => i >= 0);
  if (matches.length) assert.ok(matches.includes(run.result)); else assert.equal(run.result, -1);
  assert.equal(new Set(run.steps.map(step => step.array)).size, run.steps.length);
  assert.equal(new Set(run.steps.map(step => step.variables)).size, run.steps.length);
  for (const [index, step] of run.steps.entries()) {
    validate(step, schema);
    assert.equal(step.stepIndex, index);
    assert.deepEqual(step.array, array);
    assert.equal(step.target, target);
    assert.equal(step.sourceVersion, run.sourceVersion);
    assert.ok(ids.has(step.lineId));
    assert.equal(step.done, index === run.steps.length - 1);
    if (!step.done) assert.equal(step.result, null);
    const vars = step.variables;
    if (step.event === 'probe') {
      assert.ok(vars.left <= vars.right);
      assert.equal(vars.mid, vars.left + Math.floor((vars.right - vars.left) / 2));
      assert.ok(vars.mid >= 0 && vars.mid < array.length);
    }
    if (['move-left', 'move-right'].includes(step.event)) {
      assert.equal(vars.mid, null);
      const prev = run.steps[index - 1];
      assert.equal(prev.event, 'probe');
      if (step.event === 'move-left') {
        assert.ok(array[prev.variables.mid] < target);
        assert.equal(vars.left, prev.variables.mid + 1);
        assert.equal(vars.right, prev.variables.right);
      } else {
        assert.ok(array[prev.variables.mid] > target);
        assert.equal(vars.right, prev.variables.mid - 1);
        assert.equal(vars.left, prev.variables.left);
      }
    }
  }
  const end = run.steps.at(-1);
  assert.equal(end.result, run.result);
  if (run.result === -1) {
    assert.equal(end.event, 'not-found');
    assert.ok(end.variables.left > end.variables.right);
    assert.equal(end.variables.mid, null);
  } else {
    assert.equal(end.event, 'found');
    assert.equal(end.variables.mid, run.result);
  }
  return run;
}

await check('11组人工预期、逐步Schema字段及行映射', () => {
  for (const expected of oracles) {
    const run = inspectTrace(expected.array, expected.target);
    assert.equal(run.result, expected.result, expected.id);
    assert.deepEqual(run.steps.filter(step => step.event === 'probe').map(step => Object.values(step.variables)), expected.probes, expected.id);
    assert.deepEqual([run.steps.at(-1).variables.left, run.steps.at(-1).variables.right], expected.final);
  }
  return '11组通过；Schema检查覆盖当前文件的类型/常量/枚举/必填/范围/额外字段规则';
});
await check('882组有序数组的结果和全轨迹不变量', () => {
  let total = 0;
  function enumerate(array, next) {
    for (let target = -3; target <= 3; target++) { inspectTrace(array, target); total++; }
    if (array.length === 4) return;
    for (let value = next; value <= 2; value++) enumerate([...array, value], value);
  }
  enumerate([], -2);
  assert.equal(total, 882);
  return total;
});
await check('安全整数端点、两元素和100元素', () => {
  for (const [array, target] of [[[-Number.MAX_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER], Number.MAX_SAFE_INTEGER], [[1,3],1], [[1,3],3], [[1,3],2], [Array.from({ length: 100 }, (_,i) => i),99]]) inspectTrace(array,target);
});
await check('确定性与输入/快照引用隔离', () => {
  const input = [1,3,5,7,9];
  const one = inspectTrace(input,7);
  const two = inspectTrace(input,7);
  assert.deepEqual(one,two);
  input[0] = 999;
  assert.equal(one.steps[0].array[0],1);
  one.steps[0].array[0] = 888;
  assert.equal(one.steps[1].array[0],1);
  assert.equal(two.steps[0].array[0],1);
});
await check('展示C代码括号、更新语句及lineId唯一性', () => {
  const code = engine.SOURCE_LINES.map(line=>line.text).join('\n');
  assert.equal((code.match(/\{/g)||[]).length,(code.match(/\}/g)||[]).length);
  const byId = new Map(engine.SOURCE_LINES.map(line=>[line.lineId,line.text]));
  assert.ok(byId.get('update-left').includes('left = mid + 1'));
  assert.ok(byId.get('update-right').includes('right = mid - 1'));
});

// Capture the newly introduced timer only to clean up this review process.
// The separate child-process lifecycle test below uses the unmodified timer.
const timers = [];
const originalInterval = globalThis.setInterval;
globalThis.setInterval = (callback, delay, ...args) => {
  const handle = originalInterval(callback, delay, ...args);
  timers.push({ callback, delay, handle });
  return handle;
};
let store;
let server;
const originalListen = Server.prototype.listen;
Server.prototype.listen = function (...args) { server = this; return originalListen.apply(this, args); };
process.env.PORT = '0'; process.env.HOST = '127.0.0.1';
process.env.AGENT_MOCK = 'false'; process.env.DEEPSEEK_API_KEY = '';
try {
  store = await import(pathToFileURL(resolve(root,'backend/src/runs/store.js')));
  await import(pathToFileURL(resolve(root,'backend/src/server.js')));
  globalThis.setInterval = originalInterval;
  if (!server.listening) await once(server,'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function req(path, data, options = {}) {
    const response = await fetch(base+path, { ...options, ...(data === undefined ? {} : {method:'POST',headers:{'content-type':'application/json'},body:stringify(data)}) });
    const text = await response.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    return { status:response.status, data:body };
  }
  const invalidResponse = (result, status = 400) => { assert.equal(result.status,status,stringify(result)); assert.ok(result.data.error?.code); assert.equal(typeof result.data.error.message,'string'); };
  await check('主页/脚本/样式及HEAD仍可访问', async () => {
    for (const path of ['/','/src/app.js','/src/styles/workbench.css']) assert.equal((await req(path)).status,200);
    const head = await req('/',undefined,{method:'HEAD'}); assert.equal(head.status,200); assert.equal(head.data,'');
    assert.equal((await req('/not-existing.js')).status,404);
    assert.equal((await req('/',{},{})).status,405);
  });
  await check('health公布runs/exercises且无模型调用', async () => {
    const value=await req('/api/health'); assert.equal(value.status,200); assert.equal(value.data.modelCallsEnabled,false);
    assert.ok(value.data.implemented.includes('runs')&&value.data.implemented.includes('exercises'));
  });
  await check('11组HTTP创建和回读与引擎一致', async () => {
    for(const expected of oracles) {
      const created=await req('/api/algorithms/binary-search/runs',{array:expected.array,target:expected.target});
      assert.equal(created.status,200); assert.equal(created.data.result,expected.result);
      const fetched=await req(`/api/runs/${created.data.runId}`); assert.deepEqual(fetched.data,created.data);
      for(const step of created.data.steps) validate(step,schema);
      const last=await req(`/api/runs/${created.data.runId}/steps/${created.data.steps.length-1}`);
      assert.deepEqual(last.data,{runId:created.data.runId,step:created.data.steps.at(-1)});
    }
  });
  await check('运行查询不存在/越界与两个run互不污染', async () => {
    invalidResponse(await req('/api/runs/not-existing'),404);
    const a=await req('/api/algorithms/binary-search/runs',{array:[1],target:1});
    const b=await req('/api/algorithms/binary-search/runs',{array:[2],target:1});
    assert.notEqual(a.data.runId,b.data.runId); assert.equal((await req(`/api/runs/${a.data.runId}`)).data.result,0);
    invalidResponse(await req(`/api/runs/${a.data.runId}/steps/999`));
  });
  await check('16类运行非法输入及无序/长度上限', async () => {
    const invalid=[{},null,[],{array:[1]},{array:[],target:null},{array:'1,2',target:1},{array:['1',3],target:3},{array:[1.5,2],target:2},{array:[null,2],target:2},{array:[{},2],target:2},{array:[2,1],target:1},{array:[1,2],target:1.5},{array:[1,2],target:Number.MAX_SAFE_INTEGER+1},{array:[Number.MIN_SAFE_INTEGER-1],target:1},{array:Array(101).fill(1),target:1},{array:[1],target:true}];
    for(const value of invalid) invalidResponse(await req('/api/algorithms/binary-search/runs',value));
    return invalid.length;
  });
  await check('损坏JSON不导致进程退出', async () => {
    for(const path of ['/api/algorithms/binary-search/runs','/api/exercises/check']) {
      const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:'{oops'});
      assert.equal(response.status,400); assert.ok((await response.json()).error?.code);
    }
    assert.equal((await req('/api/health')).status,200);
  });
  await check('ASCII请求超过声明10KB限制被拒绝', async () => {
    invalidResponse(await req('/api/algorithms/binary-search/runs',{array:[1],target:1,padding:'x'.repeat(11000)}));
  });
  await check('UTF-8请求超过声明10KB限制被拒绝', async () => {
    const data={array:[1],target:1,padding:'中'.repeat(4000)};
    const bytes=Buffer.byteLength(stringify(data)); assert.ok(bytes>10240);
    const response=await req('/api/algorithms/binary-search/runs',data);
    assert.ok(response.status>=400,`实际${bytes}字节却HTTP ${response.status}`);
  });
  await check('题目ID/题面/题型/选项与06一致且不泄露答案', async () => {
    const value=await req('/api/exercises?topicId=binary-search'); assert.equal(value.status,200);
    assert.deepEqual(value.data.exercises.map(q=>q.id),questions.map(q=>q.id));
    value.data.exercises.forEach((q,i)=>{
      for(const key of ['topicId','type','prompt','context','options']) assert.deepEqual(q[key],questions[i][key]);
      for(const key of ['answer','correctAnswer','explanation','hints','review']) assert.ok(!Object.hasOwn(q,key));
    });
  });
  await check('公开题目保留题库版本以保存学习记录', async () => {
    const value=await req('/api/exercises?topicId=binary-search');
    value.data.exercises.forEach((q,i)=>assert.equal(q.version,questions[i].version,`${q.id}缺失version`));
  });
  await check('全部10题正确答案确定判分', async () => {
    for(const q of questions){const value=await req('/api/exercises/check',{exerciseId:q.id,answer:q.answer,hintLevel:1});assert.equal(value.status,200);assert.equal(value.data.correct,true,q.id);}
  });
  for(const level of [1,2,3]) await check(`全部10题错误答案的第${level}级提示/解析`,async()=>{
    for(const q of questions){
      const wrong=q.type==='choice'?q.options.find(option=>option.id!==q.answer).id:q.type==='judgement'?!q.answer:q.answer+1;
      const value=await req('/api/exercises/check',{exerciseId:q.id,answer:wrong,hintLevel:level});
      assert.equal(value.status,200);assert.equal(value.data.correct,false);
      if(level<3){assert.equal(value.data.hint,q.hints[level-1]);assert.ok(!Object.hasOwn(value.data,'correctAnswer'));assert.ok(!Object.hasOwn(value.data,'explanation'));}
      else {assert.deepEqual(value.data.correctAnswer,q.answer);assert.equal(value.data.explanation,q.explanation);}
    }
  });
  await check('值/判断/选择题拒绝错误答案类型', async () => {
    for(const [id,answer] of [['bs-q01','3abc'],['bs-q01','3'],['bs-q01',null],['bs-q01',true],['bs-q04','false'],['bs-q02',1],['bs-q02',{}]]) invalidResponse(await req('/api/exercises/check',{exerciseId:id,answer,hintLevel:1}));
    invalidResponse(await req('/api/exercises/check',{exerciseId:'not-existing',answer:1}),404);
    invalidResponse(await req('/api/exercises/check',{exerciseId:'bs-q01'}));
  });
  await check('选择题拒绝不存在的选项ID与空答案', async () => {
    for(const answer of ['Z','']) invalidResponse(await req('/api/exercises/check',{exerciseId:'bs-q02',answer,hintLevel:1}));
  });
  await check('提示等级仅允许1/2/3', async () => {
    for(const hintLevel of [4,0,-1,1.5]) invalidResponse(await req('/api/exercises/check',{exerciseId:'bs-q02',answer:'A',hintLevel}));
  });
  await check('判分请求也有体积上限', async () => {
    const value=await req('/api/exercises/check',{exerciseId:'bs-q01',answer:3,padding:'x'.repeat(100000)});
    assert.ok(value.status>=400,`10万字节额外内容仍HTTP ${value.status}`);
  });
  await check('模型未配置时明确503，知识目录独立可用，未知API为404', async () => {
    invalidResponse(await req('/api/agent/explain',{runId:'none',stepIndex:0,question:'why',hintLevel:1}),503);
    const knowledge = await req('/api/knowledge/cards?topicId=binary-search');
    assert.equal(knowledge.status,200); assert.ok(knowledge.data.cards.length > 0);
    assert.ok(knowledge.data.sourceRefs.length > 0);
    assert.equal((await req('/api/unknown')).status,404);
  });
  await check('run查询TTL及每分钟后台清理逻辑', () => {
    const old=store.createRun({steps:[],result:-1}); old.createdAt=Date.now()-3600001;
    assert.equal(store.getRun(old.runId),null); assert.ok(!store.runsStore.has(old.runId));
    const old2=store.createRun({steps:[],result:-1}); old2.createdAt=Date.now()-3600001;
    const fresh=store.createRun({steps:[],result:0});
    const cleaner=timers.find(timer=>timer.delay===60000);assert.ok(cleaner);
    cleaner.callback(); assert.ok(!store.runsStore.has(old2.runId));assert.ok(store.runsStore.has(fresh.runId));
  });
} finally {
  globalThis.setInterval=originalInterval; Server.prototype.listen=originalListen;
  server?.closeAllConnections(); if(server)await new Promise(resolve=>server.close(resolve));
  for(const timer of timers)clearInterval(timer.handle);
}
await check('执行已有SIGTERM关闭处理后进程自然退出', async () => {
  const serverUrl=pathToFileURL(resolve(root,'backend/src/server.js')).href;
  const childCode=`import {Server} from 'node:http'; import {once} from 'node:events'; let server; const original=Server.prototype.listen; Server.prototype.listen=function(...args){server=this;return original.apply(this,args)}; process.env.PORT='0';process.env.HOST='127.0.0.1'; await import(${JSON.stringify(serverUrl)}); if(!server.listening) await once(server,'listening'); process.emit('SIGTERM'); console.log('shutdown-handler-executed'); setTimeout(()=>{console.log('still-alive-after-close');process.exit(7)},300).unref();`;
  const child=spawn(process.execPath,['--input-type=module','-e',childCode],{cwd:root,stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
  const watchdog=setTimeout(()=>child.kill(),5000);
  const [exitCode]=await once(child,'exit');clearTimeout(watchdog);
  assert.equal(exitCode,0,`退出码=${exitCode}; ${output.trim()}`);
});

const summary={reviewedHead,workingTreeDirty,total:results.length,passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,results};
if (process.env.TEST_REPORT_PATH) {
  const reportPath=resolve(process.env.TEST_REPORT_PATH);
  await mkdir(dirname(reportPath),{recursive:true});
  await writeFile(reportPath,JSON.stringify(summary,null,2),'utf8');
}
for(const result of results)console.log(JSON.stringify(result));
console.log(`Backend acceptance: ${summary.passed}/${summary.total} groups passed; ${summary.failed} failed.`);
if (summary.failed) process.exitCode = 1;
