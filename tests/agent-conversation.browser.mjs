import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.TEST_PLAYWRIGHT_MODULE?pathToFileURL(process.env.TEST_PLAYWRIGHT_MODULE).href:'playwright');
const child=spawn(process.execPath,['backend/src/server.js'],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:'0',HOST:'127.0.0.1',AGENT_MOCK:'true',DEEPSEEK_API_KEY:'',RATE_LIMIT:'false'}});
let browser;
try{
 const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);child.on('error',reject);child.stdout.on('data',b=>{out+=b;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],requests=[],responses=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().endsWith('/api/agent/explain'))requests.push(r.postDataJSON());});
 await page.goto(base);await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 1 步'));
 await page.click('#tutor-toggle');
 const ask=async question=>{await page.fill('#question-input',question);const waiting=page.waitForResponse(r=>r.url().endsWith('/api/agent/explain'));await page.click('#send-btn');responses.push(await(await waiting).json());await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);};
 await ask('为什么必须有序？');const first=requests.at(-1);assert.ok(first.conversationId);assert.ok(first.turnId);
 await page.click('#nextBtn');await ask('能再讲详细一点吗？');
 assert.equal(requests.at(-1).conversationId,first.conversationId);assert.notEqual(requests.at(-1).turnId,first.turnId);assert.equal(requests.at(-1).stepIndex,1);
 assert.equal(responses.at(-1).retrieval.status,'matched');assert.equal(responses.at(-1).stepRefs[0].mid,2);
 assert.ok(responses.at(-1).sourceRefs.some(ref=>ref.cardId==='bs-k01'));assert.ok(!('history' in requests.at(-1)));
 assert.ok(!responses.at(-1).answer.includes('📖'));assert.match(await page.locator('.message.assistant').last().innerText(),/依据：/);
 await page.click('#tutor-close');await page.click('#tutor-toggle');await ask('换个说法');assert.equal(responses.at(-1).retrieval.status,'matched');
 let firstFailure=true;await page.route('**/api/agent/explain',route=>{if(firstFailure){firstFailure=false;return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:{message:'测试失败'}})});}return route.continue();});
 await ask('为什么中点向下取整');const failure=requests.at(-1);await page.click('#retry-btn');await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);assert.deepEqual(requests.at(-1),failure);
 await page.unroute('**/api/agent/explain');
 const oldId=requests.at(-1).conversationId;await page.fill('#targetInput','9');await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 1 步'));await ask('能再讲详细一点吗？');
 assert.notEqual(requests.at(-1).conversationId,oldId);assert.equal(responses.at(-1).retrieval.status,'no-match');
 // A late answer for the invalidated run cannot appear or seed the new conversation.
 let held;await page.route('**/api/agent/explain',route=>{held=route;});await page.fill('#question-input','为什么必须有序');await page.click('#send-btn');while(!held)await new Promise(r=>setTimeout(r,5));
 await page.fill('#targetInput','7');await held.fulfill({status:200,contentType:'application/json',body:JSON.stringify({answer:'不该出现的旧回答'})}).catch(()=>{});await page.waitForTimeout(50);
 assert.equal(await page.getByText('不该出现的旧回答',{exact:true}).count(),0);assert.equal(await page.locator('#send-btn').isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log('Browser passed: server history follows questions/steps, close preserves conversation, retry keeps IDs, new run isolates history, stale response is ignored, sources remain without full card text.');
}finally{await browser?.close();child.kill();if(child.exitCode===null)await once(child,'exit');}
