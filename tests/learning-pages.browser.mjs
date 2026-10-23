import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.TEST_PLAYWRIGHT_MODULE?pathToFileURL(process.env.TEST_PLAYWRIGHT_MODULE).href:'playwright');
const child=spawn(process.execPath,['backend/src/server.js'],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:'0',HOST:'127.0.0.1',AGENT_MOCK:'true',DEEPSEEK_API_KEY:'',RATE_LIMIT:'false'}});
let browser;const passed=[];
try{
 const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);child.on('error',reject);child.stdout.on('data',b=>{out+=b;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];let knowledgeRequests=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/knowledge/cards'))knowledgeRequests++;});
 await page.addInitScript(()=>{window.__steps=[];document.addEventListener('workbench:step',e=>window.__steps.push(e.detail));});
 async function nav(name){const link=page.locator('.nav-item[data-page-link="'+name+'"]');if(!await link.isVisible())await page.click('#sidebar-toggle');await link.click();await page.waitForFunction(name=>document.body.dataset.page===name,name);}
 async function shot(name){if(process.env.TEST_SCREENSHOT_DIR){await page.evaluate(()=>window.scrollTo(0,0));await page.locator('.sidebar nav').evaluate(async node=>{await Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{})));});await mkdir(process.env.TEST_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/'+name+'.png',fullPage:true});}}
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#exercise-load-status').textContent.includes('10'));
 assert.equal(await page.locator('[data-page-view]:visible').count(),1);assert.equal(knowledgeRequests,0);assert.equal(await page.locator('#exercise-panel').isVisible(),false);assert.equal(await page.locator('#tutor-window [role=tab],#tutor-window #knowledge-cards').count(),0);assert.ok(!(await page.locator('#tutor-window').textContent()).includes('步骤问答'));
 assert.equal(await page.locator('.nav-item').first().getAttribute('data-page-link'),'catalog');
 await nav('catalog');assert.equal(await page.locator('#catalog').isVisible(),true);assert.equal(await page.locator('#tutor-toggle').isVisible(),false);assert.equal(await page.locator('#page-breadcrumb').innerText(),'课程目录');
 assert.equal(await page.locator('.course-card').count(),8);assert.equal(await page.locator('.course-topics li').count(),40);assert.equal(await page.locator('.course-topics .planned').count(),39);await page.locator('.course-card.featured summary').click();assert.equal(await page.locator('.course-topic-ready a').innerText(),'二分查找 →');
 assert.deepEqual(await page.locator('.course-card h2').allTextContents(),['数据结构概述','线性表','栈、队列与数组','串','树与二叉树','图','查找','排序']);
 await page.locator('.course-card details summary').first().click();await page.click('#sidebar-toggle');await shot('catalog-desktop');await page.click('#sidebar-toggle');await page.click('#catalog-enter-workbench');assert.equal(await page.locator('body').getAttribute('data-page'),'workbench');
 await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);await page.click('#nextBtn');const run=await page.evaluate(()=>window.__steps.at(-1));
 await page.click('#tutor-toggle');await page.fill('#question-input','为什么这一轮要更新左边界？');await page.click('#send-btn');await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);assert.ok(await page.locator('.message.assistant').count()>0);await page.fill('#question-input','切换页面后保留的草稿');
 await nav('catalog');await page.locator('.course-footer [data-page-link="workbench"]').click();assert.equal(await page.evaluate(()=>window.__steps.at(-1).runId),run.runId);assert.equal(await page.inputValue('#question-input'),'切换页面后保留的草稿');
 await nav('knowledge');await page.waitForFunction(()=>document.querySelector('#knowledge-status').textContent.includes('10'));
 assert.equal(await page.locator('#tutor-window').isVisible(),false);assert.equal(await page.locator('#tutor-toggle').isVisible(),false);
 assert.equal(await page.locator('#knowledge-cards details').count(),10);assert.equal(await page.locator('#page-breadcrumb').innerText(),'知识与辅导');assert.equal(await page.locator('.nav-item[aria-current=page]').getAttribute('data-page-link'),'knowledge');
 await page.locator('#knowledge-cards summary').first().click();assert.match(await page.locator('#knowledge-cards details').first().innerText(),/项目自编/);await shot('knowledge-desktop');
 passed.push('five exclusive views with the 8-chapter/40-unit course map, live binary-search entry, correct navigation/breadcrumb and lazy knowledge cards outside the simplified floating chat');
 await nav('practice');await page.fill('#exercise-value','1');await page.click('#submit-exercise');await page.waitForFunction(()=>!document.querySelector('#submit-exercise').disabled);
 assert.equal(await page.locator('#exercise-feedback').isVisible(),true);assert.match(await page.locator('#exercise-feedback').innerText(),/回答不正确/);await shot('practice-desktop');
 await nav('records');assert.equal(await page.locator('.learning-record').count(),1);assert.match(await page.locator('#learning-progress').innerText(),/保留 1 次作答/);assert.equal(await page.locator('#exercise-form').isVisible(),false);await shot('records-desktop');
 await page.getByRole('button',{name:'重练此题',exact:true}).click();assert.equal(await page.locator('body').getAttribute('data-page'),'practice');assert.equal(await page.inputValue('#exercise-value'),'');assert.equal(await page.locator('#exercise-select').inputValue(),'bs-q01');
 await page.fill('#exercise-value','3');await page.click('#submit-exercise');await page.waitForFunction(()=>!document.querySelector('#submit-exercise').disabled);await nav('records');
 await page.selectOption('#records-filter','pending');assert.equal(await page.locator('.learning-record').count(),0);await page.selectOption('#records-filter','wrong');assert.equal(await page.locator('.learning-record').count(),1);
 await page.goBack();assert.equal(await page.locator('body').getAttribute('data-page'),'practice');await page.goForward();assert.equal(await page.locator('body').getAttribute('data-page'),'records');
 await nav('workbench');assert.equal(await page.locator('#varMid').innerText(),'2');assert.equal(await page.evaluate(()=>window.__steps.at(-1).runId),run.runId);
 await page.click('#tutor-toggle');assert.equal(await page.inputValue('#question-input'),'切换页面后保留的草稿');await shot('tutor-desktop');await page.click('#tutor-close');
 await page.click('#playBtn');await nav('knowledge');const index=await page.evaluate(()=>window.__steps.at(-1).stepIndex);assert.equal(await page.evaluate(()=>window.__steps.at(-1).playing),false);await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.__steps.at(-1).stepIndex),index);
 passed.push('practice grading and records share the same store; retry opens practice; back/forward, run/draft retention and navigation pause work');
 await page.goto(base+'/#catalog');assert.equal(await page.locator('body').getAttribute('data-page'),'catalog');await page.reload();assert.equal(await page.locator('#catalog').isVisible(),true);
 await page.goto(base+'/#records');await page.waitForFunction(()=>document.querySelector('#exercise-load-status').textContent.includes('10'));assert.equal(await page.locator('body').getAttribute('data-page'),'records');assert.match(await page.locator('#learning-progress').innerText(),/保留 2 次作答/);
 for(const width of [390,320]){await page.setViewportSize({width,height:844});for(const name of ['catalog','workbench','knowledge','practice','records']){await nav(name);assert.equal(await page.locator('[data-page-view]:visible').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' at '+width);} }
 await nav('catalog');await page.locator('.course-card details summary').first().click();await shot('catalog-mobile');await nav('knowledge');await shot('knowledge-mobile');
 const retry=await browser.newPage();let fail=true;await retry.route('**/api/knowledge/cards?*',r=>fail?r.fulfill({status:503,json:{error:{message:'测试知识卡暂不可用'}}}):r.continue());await retry.goto(base+'/#knowledge');await retry.waitForFunction(()=>!document.querySelector('#knowledge-retry').hidden);fail=false;await retry.click('#knowledge-retry');await retry.waitForFunction(()=>document.querySelector('#knowledge-cards').children.length===10);await retry.close();
 assert.deepEqual(errors,[]);passed.push('direct page URLs/reload preserve records, 390/320px views fit, and knowledge failure can retry');
 console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
}finally{await browser?.close();child.kill();if(child.exitCode===null)await once(child,'exit');}
