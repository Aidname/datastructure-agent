import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.TEST_PLAYWRIGHT_MODULE?pathToFileURL(process.env.TEST_PLAYWRIGHT_MODULE).href:'playwright');
const child=spawn(process.execPath,['backend/src/server.js'],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:'0',HOST:'127.0.0.1',AGENT_MOCK:'false',DEEPSEEK_API_KEY:'',RATE_LIMIT:'false'}});
let browser;const passed=[];
try {
 const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);child.on('error',reject);child.stdout.on('data',b=>{out+=b;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 const health=await (await fetch(base+'/api/health')).json();assert.equal(health.modelCallsEnabled,false);
 const catalog=(await(await fetch(base+'/api/exercises')).json()).exercises;assert.equal(catalog.length,10);
 assert.ok(catalog.every(q=>!('answer'in q)&&!('hints'in q)&&!('explanation'in q)));
 async function check(body){const res=await fetch(base+'/api/exercises/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,data:await res.json()};}
 assert.equal((await check({exerciseId:'bs-q01',answer:3})).data.correct,true);
 assert.equal((await check({exerciseId:'bs-q01',exerciseVersion:'old',answer:3})).status,409);
 assert.equal((await check({exerciseId:'bs-q01',exerciseVersion:1,answer:3})).status,400);
 assert.equal((await check({exerciseId:'bs-q04',answer:'false'})).status,400);
 assert.equal((await check({exerciseId:'bs-q04',answer:false})).data.correct,true);
 passed.push('real HTTP catalog whitelist, legacy callers, version mismatch and typed grading without a model');
 browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],posts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/api/exercises/check'))posts.push(r.postDataJSON());});
 const ready=()=>page.waitForFunction(()=>document.querySelector('#exercise-load-status').textContent.includes('已读取 10'));
 const status=text=>page.waitForFunction(text=>document.querySelector('#exercise-status').textContent.includes(text),text);
 const select=id=>page.selectOption('#exercise-select',id);
 const submit=async()=>{await page.click('#submit-exercise');await page.waitForFunction(()=>!document.querySelector('#submit-exercise').disabled);};
 // Existing grading scenarios now navigate to each independent view before interacting.
 for (const method of ['click','fill','selectOption','check']) {
   const original=page[method].bind(page);
   page[method]=async(selector,...args)=>{
     const node=page.locator(selector).first();
     if(await node.count()) {
       const name=await node.evaluate(n=>n.closest('[data-page-view]')?.dataset.pageView);
       if(name && await page.locator('body').getAttribute('data-page')!==name) {
         const link=page.locator('.nav-item[data-page-link="'+name+'"]');if(!await link.isVisible())await page.locator('#sidebar-toggle').click();
         await link.click();await page.waitForFunction(name=>document.body.dataset.page===name,name);
       }
     }
     return original(selector,...args);
   };
 }
 const key='datastructure-agent:learning:v1';
 const records=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{"attempts":[]}').attempts,key);
 await page.goto(base);await ready();assert.equal(await page.locator('#next-hint-btn').isDisabled(),true);
 const before=posts.length;await submit();assert.equal(posts.length,before);assert.match(await page.locator('#exercise-status').innerText(),/整数/);
 await select('bs-q02');await page.check('input[name=answer][value=A]');await submit();
 assert.match(await page.locator('#exercise-feedback').innerText(),/提示 1/);assert.doesNotMatch(await page.locator('#exercise-feedback').innerText(),/参考答案/);
 await page.click('#next-hint-btn');await status('下一级');await page.waitForFunction(()=>document.querySelector('#exercise-feedback').textContent.includes('提示 2'));
 assert.doesNotMatch(await page.locator('#exercise-feedback').innerText(),/参考答案/);
 await page.click('#next-hint-btn');await status('完整解析');assert.match(await page.locator('#exercise-feedback').innerText(),/参考答案：B/);
 assert.equal((await records()).length,1);assert.deepEqual((await records())[0].hintsUsed,[1,2,3]);
 await page.check('input[name=answer][value=B]');await submit();assert.equal((await records()).length,2);assert.equal((await records()).at(-1).correct,true);
 await page.selectOption('#records-filter','pending');assert.equal(await page.locator('.learning-record').count(),0);
 await page.selectOption('#records-filter','wrong');assert.equal(await page.locator('.learning-record').count(),1);assert.match(await page.locator('.record-heading').innerText(),/已订正/);
 await page.getByRole('button',{name:'重练此题',exact:true}).click();assert.equal(await page.locator('input[name=answer]:checked').count(),0);
 passed.push('three hints are voluntary and share one record; correction, wrong/pending filters and retry');
 await select('bs-q04');await page.check('input[name=answer][value=false]');await submit();assert.equal(posts.at(-1).answer,false);
 await select('bs-q07');await page.fill('#exercise-value','0');await submit();assert.equal(posts.at(-1).answer,0);assert.match(await page.locator('#exercise-feedback').innerText(),/回答正确/);
 await select('bs-q06');await page.fill('#exercise-value','-1');await submit();assert.equal(posts.at(-1).answer,-1);assert.equal((await records()).length,5);
 await page.reload();await ready();assert.equal((await records()).length,5);assert.match(await page.locator('#learning-progress').innerText(),/最近作答答对 4 题/);
 await page.evaluate(()=>localStorage.setItem('unrelated','keep'));
 passed.push('false, zero and negative answers are typed; records/progress survive page reload');
 // A response for an obsolete selection must never appear or be saved.
 let held;await page.route('**/api/exercises/check',route=>{held=route;});
 await page.fill('#exercise-value','0');await page.click('#submit-exercise');await status('正在提交');
 await page.waitForFunction(()=>document.querySelector('#submit-exercise').disabled);while(!held)await new Promise(r=>setTimeout(r,5));
 await select('bs-q02');await held.fulfill({status:200,contentType:'application/json',body:'{"correct":false,"hint":"obsolete response"}'}).catch(()=>{});
 await page.waitForTimeout(70);assert.doesNotMatch(await page.locator('#exercise-feedback').innerText(),/obsolete/);assert.equal((await records()).length,5);
 await page.unroute('**/api/exercises/check');
 await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 1 步'));
 await page.check('input[name=answer][value=A]');await submit();assert.ok((await records()).at(-1).origin.runId);
 const count=(await records()).length;held=null;await page.route('**/api/exercises/check',r=>{held=r;});await page.click('#next-hint-btn');while(!held)await new Promise(r=>setTimeout(r,5));
 await page.fill('#targetInput','4');await held.fulfill({status:200,contentType:'application/json',body:'{"correct":false,"hint":"old run"}'}).catch(()=>{});await page.waitForTimeout(70);
 assert.equal((await records()).length,count);assert.deepEqual((await records()).at(-1).hintsUsed,[1]);assert.equal(await page.locator('#next-hint-btn').isDisabled(),true);
 await page.unroute('**/api/exercises/check');passed.push('selection and run changes abort stale answers/hints; historical association remains explicit');
 await page.route('**/api/exercises/check',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":{"message":"测试判分失败"}}'}));await submit();await status('测试判分失败');assert.equal((await records()).length,count);
 await page.unroute('**/api/exercises/check');await submit();assert.equal((await records()).length,count+1);
 held=null;await page.route('**/api/exercises/check',r=>{held=r;});await page.click('#next-hint-btn');while(!held)await new Promise(r=>setTimeout(r,5));
 await page.click('#clear-records-btn');await page.click('#confirm-clear-records');await held.fulfill({status:200,contentType:'application/json',body:'{"correct":false,"hint":"cleared"}'}).catch(()=>{});await page.waitForTimeout(70);
 assert.equal((await records()).length,0);assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated')),'keep');await page.unroute('**/api/exercises/check');
 await page.reload();await ready();assert.equal((await records()).length,0);passed.push('HTTP failure creates no record, retry works; clear cancels requests and preserves other app data');
 // Version mismatch from the real server, not a fabricated grade.
 await page.route('**/api/exercises?*',async r=>{const data={exercises:catalog.map(q=>({...q,version:'obsolete'}))};await r.fulfill({json:data});});
 await page.click('#reload-exercises');await ready();await page.fill('#exercise-value','3');await submit();await status('版本已更新');assert.equal((await records()).length,0);await page.unroute('**/api/exercises?*');
 await page.route('**/api/exercises?*',r=>r.fulfill({json:{exercises:[]}}));await page.click('#reload-exercises');await page.waitForFunction(()=>document.querySelector('#exercise-load-status').textContent.includes('暂无题目'));assert.equal(await page.locator('#submit-exercise').isDisabled(),true);await page.unroute('**/api/exercises?*');
 await page.click('#reload-exercises');await ready();passed.push('stale question version is rejected before saving; empty catalog and reload recover');
 await page.evaluate(key=>localStorage.setItem(key,'{broken'),key);await page.reload();await ready();assert.match(await page.locator('#storage-warning').innerText(),/损坏/);
 await page.fill('#exercise-value','3');await submit();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'{broken');
 await page.click('#clear-records-btn');await page.click('#confirm-clear-records');
 await page.fill('#exercise-value','3');await submit();assert.equal((await records()).length,1);
 if(process.env.TEST_SCREENSHOT_DIR){await mkdir(process.env.TEST_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/exercises-desktop.png',fullPage:true});}
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.TEST_SCREENSHOT_DIR)await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/exercises-mobile.png',fullPage:true});
 const denied=await browser.newPage();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('SecurityError');}}));await denied.goto(base+'/#practice');await denied.waitForFunction(()=>document.querySelector('#exercise-load-status').textContent.includes('已读取'));await denied.fill('#exercise-value','3');await denied.click('#submit-exercise');await denied.waitForFunction(()=>document.querySelectorAll('.learning-record').length===1);assert.match(await denied.locator('#storage-warning').innerText(),/当前页面有效/);await denied.close();
 assert.deepEqual(errors,[]);passed.push('corrupt storage is preserved, permission-denied storage falls back visibly; desktop/mobile have no overflow or uncaught errors');
 console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
} finally {await browser?.close();child.kill();if(child.exitCode===null)await once(child,'exit');}
