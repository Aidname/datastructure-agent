import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.TEST_PLAYWRIGHT_MODULE?pathToFileURL(process.env.TEST_PLAYWRIGHT_MODULE).href:'playwright');
const child=spawn(process.execPath,['backend/src/server.js'],{cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:'0',HOST:'127.0.0.1',AGENT_MOCK:'true',DEEPSEEK_API_KEY:'',RATE_LIMIT:'false'}});
let browser;const passed=[];
try {
 const base=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('server timeout')),10000);child.on('error',reject);child.stdout.on('data',b=>{out+=b;const m=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
 await page.addInitScript(()=>{window.__steps=[];document.addEventListener('workbench:step',e=>window.__steps.push(e.detail));});
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#exercise-load-status').textContent.includes('10'));
 assert.equal(await page.locator('#tutor-window').isVisible(),false);
 await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);
 await page.click('#nextBtn');await page.waitForTimeout(350);
 const code=await page.locator('#code-panel').boundingBox(),canvas=await page.locator('#visualization-panel').boundingBox();
 assert.equal(code.width,330);assert.ok(canvas.width>code.width*2);assert.ok(Math.abs(code.y-canvas.y)<1);assert.ok(code.x+code.width<canvas.x);
 const vars=await page.locator('.variables dd').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));assert.ok(vars.every(y=>Math.abs(y-vars[0])<1));
 assert.equal(await page.locator('#varMid').innerText(),'2');assert.equal(await page.locator('#varValue').innerText(),'5');
 assert.equal(await page.locator('[data-viz-body]').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
 assert.equal(await page.locator('[data-viz-body]').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
 assert.equal(await page.locator('.viewport-grid,#speedSelect,.tl-right').count(),0);
 const controls=await page.locator('[data-tl-transport]').boundingBox(),ruler=await page.locator('[data-tl-ruler]').boundingBox();
 assert.ok(ruler.x>controls.x+controls.width+10);assert.ok(Math.abs((ruler.y+ruler.height/2)-(controls.y+controls.height/2))<2);
 const ball=await page.locator('#tutor-toggle').boundingBox();assert.ok(ball.y+ball.height<=ruler.y || ball.y>=ruler.y+ruler.height);
 const context=await page.evaluate(()=>window.__steps.at(-1));
 await page.click('#sidebar-toggle');assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'true');
 assert.equal(await page.evaluate(()=>window.__steps.at(-1).stepIndex),context.stepIndex);
 await page.click('#sidebar-toggle');assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'false');
 passed.push('330px code beside dominant white animation; four variables in one row; no grid/speed/counter; timeline follows transport; sidebar keeps current step');

 await page.click('#playBtn');await page.click('#tutor-toggle');assert.equal(await page.evaluate(()=>window.__steps.at(-1).playing),true);
 await page.click('#playBtn');await page.fill('#question-input','保留这条尚未发送的问题');await page.click('#tutor-close');await page.click('#tutor-toggle');
 assert.equal(await page.inputValue('#question-input'),'保留这条尚未发送的问题');
 let held;await page.route('**/api/agent/explain',route=>{held=route;});
 await page.click('#playBtn');await page.click('#send-btn');while(!held)await new Promise(r=>setTimeout(r,5));
 assert.equal(await page.evaluate(()=>window.__steps.at(-1).playing),false);const body=held.request().postDataJSON();
 await page.click('#tutor-close');await page.click('#nextBtn');
 await held.fulfill({status:200,contentType:'application/json',body:JSON.stringify({runId:body.runId,stepIndex:body.stepIndex,hintLevel:body.hintLevel,answer:'收起期间收到的测试回复'})});
 await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);await page.click('#tutor-toggle');
 assert.match(await page.locator('.message.assistant').last().innerText(),new RegExp('步骤'+(body.stepIndex+1)));assert.match(await page.locator('.message.assistant').last().innerText(),/收起期间/);
 await page.unroute('**/api/agent/explain');
 const before=await page.locator('#tutor-window').boundingBox(),handle=await page.locator('[data-tutor-drag]').boundingBox();
 await page.mouse.move(handle.x+80,handle.y+25);await page.mouse.down();await page.mouse.move(handle.x+20,handle.y+40,{steps:4});await page.mouse.up();
 const after=await page.locator('#tutor-window').boundingBox();assert.ok(after.x<before.x-20);
 await page.locator('.nav-item[data-page-link="knowledge"]').click();await page.waitForFunction(()=>document.querySelector('#knowledge-status').textContent.includes('10'));
 assert.equal(await page.locator('#knowledge-cards details').count(),10);await page.locator('#knowledge-cards summary').first().click();assert.match(await page.locator('#knowledge-cards details').first().innerText(),/项目自编/);
 await page.locator('.nav-item[data-page-link="workbench"]').click();await page.click('#tutor-toggle');await page.keyboard.press('Escape');assert.equal(await page.locator('#tutor-window').isVisible(),false);
 passed.push('floating tutor preserves draft/history and pending answers, opens without pausing, pauses on send, retains original step, drags, uses separate knowledge page and closes with Escape');

 if(process.env.TEST_SCREENSHOT_DIR){await mkdir(process.env.TEST_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/layout-desktop.png',fullPage:true});await page.locator('.workspace').screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/layout-workspace.png'});await page.click('#tutor-toggle');await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/layout-tutor.png'});await page.click('#tutor-close');}
 await page.fill('#arrInput',Array.from({length:100},(_,i)=>i).join(','));await page.fill('#targetInput','100');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);
 const total=await page.locator('.tl-tick').count();assert.ok(total>5);
 for(const width of [1000,390,320]) {
   await page.setViewportSize({width,height:844});await page.waitForTimeout(200);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow at '+width);
   const a=await page.locator('[data-tl-transport]').boundingBox(),b=await page.locator('[data-tl-ruler]').boundingBox();assert.ok(b.x>a.x+a.width+5);assert.ok(Math.abs(b.y+b.height/2-a.y-a.height/2)<2);
   if(width===320)assert.ok(await page.locator('.tl-label').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).visibility==='visible').length)<total);
   await page.locator('[data-tl-ruler]').focus();await page.keyboard.press('End');assert.equal(await page.locator('[data-tl-ruler]').getAttribute('aria-valuenow'),String(total));
   await page.keyboard.press('Home');assert.equal(await page.locator('[data-tl-ruler]').getAttribute('aria-valuenow'),'1');
   await page.click('#tutor-toggle');const drawer=await page.locator('#tutor-window').boundingBox();assert.ok(drawer.x>=0&&drawer.y>=0&&drawer.x+drawer.width<=width+1&&drawer.y+drawer.height<=844);
   await page.click('#tutor-close');
 }
 await page.fill('#arrInput','-9007199254740991,9007199254740991');await page.fill('#targetInput','9007199254740991');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);await page.click('#nextBtn');
 assert.equal(await page.locator('#varMid').innerText(),'0');assert.equal(await page.locator('#varValue').innerText(),'-9007199254740991');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.TEST_SCREENSHOT_DIR){await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);await page.click('#nextBtn');await page.waitForTimeout(300);await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/layout-mobile.png',fullPage:true});}
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 passed.push('100 elements and longer timeline fit tablet/390/320px layouts; sparse labels retain all keyboard steps; moved tutor stays inside resized viewport; no page/resource errors');
 console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
} finally {await browser?.close();child.kill();if(child.exitCode===null)await once(child,'exit');}
