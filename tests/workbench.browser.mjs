import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
const {chromium}=await import(process.env.TEST_PLAYWRIGHT_MODULE?pathToFileURL(process.env.TEST_PLAYWRIGHT_MODULE).href:'playwright');
const child=spawn(process.execPath,['backend/src/server.js'],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:'0',HOST:'127.0.0.1',AGENT_MOCK:'true',DEEPSEEK_API_KEY:'',RATE_LIMIT:'false'}});
let browser;const passed=[];
try{
 const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('start timeout')),10000);child.on('error',reject);child.stdout.on('data',b=>{out+=b;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];const posts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push({url:r.url(),body:r.postDataJSON()});});
 await page.addInitScript(()=>{window.__steps=[];document.addEventListener('workbench:step',e=>window.__steps.push(e.detail));});
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#service-status').textContent.includes('已连接'));
 assert.equal(await page.locator('#send-btn').isDisabled(),true);assert.equal(await page.locator('#nextBtn').isDisabled(),true);
 await page.click('#fillDemo');assert.equal(posts.length,0);await page.click('#startBtn');
 await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 1 步'));
 const context=await page.evaluate(()=>window.__steps.at(-1));assert.equal(context.stepIndex,0);assert.ok(context.runId);assert.equal(await page.locator('#varMid').innerText(),'未计算');
 assert.equal(await page.locator('#code-lines li.active').getAttribute('data-line-id'),context.step.lineId);
 assert.equal(await page.locator('#exercise-mount').getAttribute('data-run-id'),context.runId);
 await page.fill('#question-input','这一步依据是什么？');await page.click('#send-btn');await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);
 const firstQuestion=posts.find(r=>r.url.endsWith('/api/agent/explain')).body;assert.equal(firstQuestion.runId,context.runId);assert.equal(firstQuestion.stepIndex,0);
 passed.push('normal service entry, true run, initial source/variables/07 context and initial Agent question');

 await page.click('#nextBtn');assert.equal(await page.locator('#varMid').innerText(),'2');assert.equal(await page.locator('#varValue').innerText(),'5');
 assert.equal(await page.locator('#code-lines li.active').getAttribute('data-line-id'),'calc-mid');
 await page.locator('#visualization-panel').focus();await page.keyboard.press('ArrowRight');assert.match(await page.locator('#stepText').innerText(),/第 3 步/);assert.equal(await page.locator('#varMid').innerText(),'未计算');
 await page.click('#resetBtn');assert.match(await page.locator('#stepText').innerText(),/第 1 步/);assert.equal(await page.inputValue('#targetInput'),'7');
 await page.selectOption('#speedSelect','250');await page.click('#playBtn');await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 5 步'));
 assert.equal(await page.locator('#nextBtn').isDisabled(),true);assert.equal(await page.locator('#playBtn').isDisabled(),true);assert.match(await page.locator('#step-description').innerText(),/下标 3/);
 await page.click('#resetBtn');await page.click('#playBtn');await page.fill('#question-input','为什么必须有序');await page.click('#send-btn');await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);
 assert.equal(await page.locator('#playBtn').innerText(),'播放');
 passed.push('single-step/keyboard, null mid, reset preserving input, speed/play/end, question pauses playback');

 await page.click('#playBtn');await page.fill('#targetInput','4');const count=await page.evaluate(()=>window.__steps.length);await page.waitForTimeout(600);
 assert.equal(await page.evaluate(()=>window.__steps.length),count);assert.equal(await page.locator('#code-lines li.active').count(),0);assert.equal(await page.locator('#send-btn').isDisabled(),true);assert.equal(await page.evaluate(()=>window.__steps.at(-1)),null);
 passed.push('input edits destroy old playback and clear code/variables/Agent/07 context');
 const countBefore=posts.filter(p=>p.url.endsWith('/runs')).length;
 for(const [array,target] of [['1,,2','1'],['3,1','1'],['1.5,2','2'],['Infinity','1'],['1','9007199254740992'],[Array(101).fill('1').join(','),'1']]){await page.fill('#arrInput',array);await page.fill('#targetInput',target);await page.click('#startBtn');assert.ok((await page.locator('#msgBox').innerText()).length>0);}
 assert.equal(posts.filter(p=>p.url.endsWith('/runs')).length,countBefore);
 await page.fill('#arrInput','');await page.fill('#targetInput','7');await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 1 步'));assert.equal(await page.locator('#varRight').innerText(),'-1');assert.match(await page.locator('#step-description').innerText(),/空数组/);
 passed.push('invalid input blocked before HTTP; valid empty array is rendered');

 await page.route('**/api/algorithms/binary-search/runs',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{message:'测试：创建失败'}})}));
 await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#msgBox').textContent.includes('创建失败'));assert.equal(await page.locator('#startBtn').isDisabled(),false);assert.equal(await page.locator('#nextBtn').isDisabled(),true);
 await page.unroute('**/api/algorithms/binary-search/runs');await page.route('**/api/algorithms/binary-search/runs',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#msgBox').textContent.includes('不完整'));
 await page.unroute('**/api/algorithms/binary-search/runs');passed.push('HTTP failure and malformed run produce visible errors with usable controls');

 async function apiRun(target){return(await fetch(base+'/api/algorithms/binary-search/runs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({array:[1,3,5,7,9],target})})).json();}
 const old=await apiRun(7),fresh=await apiRun(4),requests=[];
 await page.route('**/api/algorithms/binary-search/runs',route=>{requests.push(route);});await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#startBtn').disabled);
 await page.fill('#targetInput','4');await page.click('#startBtn');while(requests.length<2)await new Promise(r=>setTimeout(r,5));
 await requests[1].fulfill({status:200,contentType:'application/json',body:JSON.stringify(fresh)});await page.waitForFunction(id=>window.__steps.at(-1)?.runId===id,fresh.runId);
 await requests[0].fulfill({status:200,contentType:'application/json',body:JSON.stringify(old)}).catch(()=>{});await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.__steps.at(-1).runId),fresh.runId);
 await page.unroute('**/api/algorithms/binary-search/runs');passed.push('aborted old creation cannot overwrite a new run');

 let answerRoute;await page.route('**/api/agent/explain',route=>{answerRoute=route;});await page.fill('#question-input','这一步为什么');await page.click('#send-btn');while(!answerRoute)await new Promise(r=>setTimeout(r,5));
 await page.fill('#targetInput','9');await answerRoute.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'不应显示的旧运行回答',runId:fresh.runId,stepIndex:0})}).catch(()=>{});await page.waitForTimeout(50);
 assert.equal(await page.getByText('不应显示的旧运行回答',{exact:true}).count(),0);assert.equal(await page.locator('#send-btn').isDisabled(),true);await page.unroute('**/api/agent/explain');passed.push('input invalidation cancels old Agent replies');

 await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 1 步'));await page.click('#nextBtn');
 if(process.env.TEST_SCREENSHOT_DIR)await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/workbench-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.TEST_SCREENSHOT_DIR)await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/workbench-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);passed.push('desktop/mobile layout has no page overflow or uncaught errors');
 console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
}finally{if(browser)await browser.close();if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}}
