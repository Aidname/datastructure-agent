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
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{
  window.__steps=[];document.addEventListener('workbench:step',e=>window.__steps.push(e.detail));
  window.__keys=new Set();const add=window.addEventListener,remove=window.removeEventListener;
  window.addEventListener=function(type,fn,...args){if(type==='keydown')window.__keys.add(fn);return add.call(this,type,fn,...args);};
  window.removeEventListener=function(type,fn,...args){if(type==='keydown')window.__keys.delete(fn);return remove.call(this,type,fn,...args);};
 });
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('.vizwin')&&document.querySelector('#exercise-load-status').textContent.includes('10'));
 assert.equal(await page.locator('.win-actions button').count(),1);assert.equal(await page.locator('[data-viz-fit],[data-viz-reset]').count(),0);assert.equal(await page.locator('[data-viz-full]').innerText(),'全屏');assert.equal(await page.locator('#playBtn').isDisabled(),true);assert.equal(await page.locator('[data-tl-ruler]').getAttribute('aria-disabled'),'true');
 const keyCount=await page.evaluate(()=>window.__keys.size);
 await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);
 await page.waitForFunction(()=>document.querySelector('[data-viz-scene]').style.transform.includes('scale('));
 assert.equal(await page.locator('.bsviz-cell').count(),5);assert.equal(await page.locator('.viz-empty').count(),0);assert.equal(await page.locator('.viewport-grid').count(),0);
 assert.equal(await page.locator('[data-tl-ruler]').getAttribute('aria-valuemax'),'5');assert.equal(requests.some(url=>url.includes('/fixtures/')),false);
 const runId=await page.evaluate(()=>window.__steps.at(-1).runId),run=await(await fetch(base+'/api/runs/'+runId)).json();
 assert.equal(run.sourceVersion,'c-v1');passed.push('white window/empty controls use real server run with no fixture dependency');
 const ruler=page.locator('[data-tl-ruler]');
 let count=await page.evaluate(()=>window.__steps.length);await page.locator('.tl-tick[data-index="3"]').click();
 assert.equal(await page.evaluate(()=>window.__steps.length),count+1);assert.equal(await page.evaluate(()=>window.__steps.at(-1).stepIndex),3);
 assert.equal(await page.locator('#code-lines li.active').getAttribute('data-line-id'),run.steps[3].lineId);
 await ruler.focus();count=await page.evaluate(()=>window.__steps.length);await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>window.__steps.length),count+1);assert.equal(await ruler.getAttribute('aria-valuenow'),'3');
 await page.keyboard.press('Home');assert.equal(await ruler.getAttribute('aria-valuenow'),'1');await page.keyboard.press('End');assert.equal(await ruler.getAttribute('aria-valuenow'),'5');assert.equal(await page.locator('#playBtn').isDisabled(),true);
 await page.click('#resetBtn');await page.click('#playBtn');assert.equal(await page.locator('#playBtn').innerText(),'暂停');
 await page.locator('.tl-tick[data-index="1"]').click();assert.equal(await page.locator('#playBtn').innerText(),'播放');
 count=await page.evaluate(()=>window.__steps.length);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__steps.length),count);
 await page.evaluate(()=>{if(document.querySelector('#tutor-window').hidden)document.querySelector('#tutor-toggle').click();});await page.fill('#question-input','这一步依据是什么');await page.click('#send-btn');await page.waitForFunction(()=>!document.querySelector('#send-btn').disabled);
 assert.equal(await page.locator('#exercise-mount').getAttribute('data-step-index'),'1');
 passed.push('timeline click/keyboard/first/last preserve one pointer, source and 05/07 contexts; seeking stops playback');
 await page.click('#tutor-close');
 // Fit, zoom and drag move the viewport, never the algorithm step.
 const view=page.locator('[data-viz-body]'),scene=page.locator('[data-viz-scene]');
 await page.click('[data-viz-view-reset]');await page.waitForTimeout(40);let before=await scene.getAttribute('style');
 const box=await view.boundingBox(),x=box.x+box.width*.32,y=box.y+box.height*.78;
 await page.mouse.move(x,y);await page.mouse.wheel(0,-120);assert.notEqual(await scene.getAttribute('style'),before);
 before=await scene.getAttribute('style');await page.mouse.down();await page.mouse.move(x+40,y+25,{steps:5});await page.mouse.up();assert.notEqual(await scene.getAttribute('style'),before);
 await view.focus();await page.keyboard.press('Home');assert.match(await scene.getAttribute('style'),/translate\(0px, 0px\)/);assert.equal(await ruler.getAttribute('aria-valuenow'),'2');
 const bar=await page.locator('.win-title').boundingBox();await page.mouse.move(bar.x+bar.width/2,bar.y+bar.height/2);await page.mouse.down();await page.mouse.move(bar.x+bar.width/2+8,bar.y+bar.height/2+8,{steps:4});await page.mouse.up();assert.ok(await page.locator('.vizwin').getAttribute('style'));
 passed.push('wheel zoom, viewport pan, Home fit and window drag preserve the selected step');
 await page.click('[data-viz-full]');assert.equal(await page.locator('body').getAttribute('class'),'is-viz-full');
 const full=await page.locator('.vizwin').boundingBox();assert.ok(Math.abs(full.x)<1&&Math.abs(full.y)<1&&Math.abs(full.width-1600)<2&&Math.abs(full.height-1000)<2);
 await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.querySelector('.vizwin').contains(document.activeElement)));
 await page.click('[data-viz-full]');assert.notEqual(await page.locator('body').getAttribute('class'),'is-viz-full');assert.equal(await page.locator('[data-viz-full]').innerText(),'全屏');assert.equal(await ruler.getAttribute('aria-valuenow'),'2');
 await page.click('[data-viz-full]');assert.equal(await page.locator('[data-viz-full]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-viz-full]').innerText(),'退出全屏');await page.keyboard.press('Escape');assert.notEqual(await page.locator('body').getAttribute('class'),'is-viz-full');assert.equal(await page.locator('[data-viz-full]').getAttribute('aria-pressed'),'false');
 await page.click('[data-viz-full]');await page.fill('#targetInput','4');await page.waitForTimeout(320);
 assert.notEqual(await page.locator('body').getAttribute('class'),'is-viz-full');assert.equal(await page.locator('.vizwin').count(),1);assert.equal(await page.locator('#nextBtn').isDisabled(),true);
 for(let i=0;i<12;i++)await page.fill('#targetInput',String(i));
 assert.equal(await page.evaluate(()=>window.__keys.size),keyCount);assert.equal(await page.locator('.vizwin').count(),1);
 passed.push('fullscreen covers viewport, traps focus, exits on the same button, Escape and run replacement; listeners do not accumulate');
 await page.click('#fillDemo');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);await page.click('#nextBtn');await page.waitForTimeout(80);
 if(process.env.TEST_SCREENSHOT_DIR){await mkdir(process.env.TEST_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/window-desktop.png',fullPage:true});await page.locator('.workspace').screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/window-workspace.png'});await page.click('[data-viz-full]');await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/window-fullscreen.png'});await page.keyboard.press('Escape');}
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>{
 const canvas=document.querySelector('[data-viz-body]').getBoundingClientRect(),content=document.querySelector('[data-viz-scene]').getBoundingClientRect();
 return content.left>=canvas.left-1 && content.right<=canvas.right+1;
});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('#speedSelect').count(),0);
 if(process.env.TEST_SCREENSHOT_DIR){await page.screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/window-mobile.png',fullPage:true});await page.locator('.visualization-region').screenshot({path:process.env.TEST_SCREENSHOT_DIR+'/window-mobile-panel.png'});}
 await page.fill('#arrInput',Array.from({length:100},(_,i)=>i).join(','));await page.fill('#targetInput','99');await page.click('#startBtn');await page.waitForFunction(()=>window.__steps.at(-1)?.stepIndex===0);await page.waitForTimeout(80);
 assert.equal(await page.locator('.bsviz-cell').count(),100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const canvas=await view.boundingBox(),content=await scene.boundingBox();assert.ok(content.width<=canvas.width+1,`${content.width} > ${canvas.width}`);assert.ok(content.x>=canvas.x-1 && content.x+content.width<=canvas.x+canvas.width+1);
 await page.fill('#arrInput','');await page.click('#startBtn');await page.waitForFunction(()=>document.querySelector('#stepText').textContent.includes('第 1 步'));assert.match(await page.locator('#step-description').innerText(),/空数组/);
 assert.deepEqual(errors,[]);passed.push('desktop/mobile screenshots, 100-element fit and empty array work without overflow or uncaught errors');
 console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
} finally {await browser?.close();child.kill();if(child.exitCode===null)await once(child,'exit');}
