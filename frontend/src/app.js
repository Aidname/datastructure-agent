import { createRun, requestJSON } from './services/api.js';
import { parseInput, validateRun } from './features/workbench/input.js';
import { describeStep } from './features/visualization/index.js';
import { createVizWindow } from './features/visualization/window.js';
import { createPlayback } from './features/playback/index.js';
import { createExercises } from './features/exercises/index.js';
import { createAgentChat } from './features/agent/panel.js';
import { createWorkbenchUI } from './features/workbench/ui.js';

const $ = id => document.getElementById(id);
let run = null, playback = null, viz = null, pending = null, generation = 0;
let currentContext = null;
const speedMs = 1000;
const ui = createWorkbenchUI();
function mountWindow() {
  $('visualization-panel').replaceChildren();
  viz = createVizWindow($('visualization-panel'), {
    onSeek(index) { playback?.seek(index); },
    onTransport(action) { playback?.[action]?.(); }
  });
}
const listeners = new Set();
const sourceNodes = new Map();
const agent = createAgentChat($('agent-panel'), {embedded:true,onBeforeSend:()=>playback?.pause()});

// 07 may subscribe immediately on mount, including the current initial step.
export function subscribeStep(listener) {
  listeners.add(listener); listener(currentContext);
  return () => listeners.delete(listener);
}
const exercises = createExercises($('exercise-mount'), {onBeforeAnswer:()=>playback?.pause()});
const unsubscribeExercises = subscribeStep(exercises.setContext);
function publish(context) {
  currentContext = context;
  agent.setContext(context);
  ui.setContext(context);
  $('exercise-context').textContent = context ? `当前运行：第 ${context.stepIndex+1} 步 / 共 ${context.total} 步。题目情境由练习模块单独标明。` : '当前无工作台运行，可独立完成固定题练习。';
  const host = $('exercise-mount');
  if (context) { host.dataset.runId=context.runId; host.dataset.stepIndex=String(context.stepIndex); }
  else { delete host.dataset.runId;delete host.dataset.stepIndex; }
  for (const listener of listeners) { try { listener(context); } catch(error) { console.error('步骤订阅失败',error); } }
  document.dispatchEvent(new CustomEvent('workbench:step',{detail:context}));
}
function message(text, error=false) { $('msgBox').textContent=text;$('msgBox').className=error?'error':''; }
function clearRun() {
  generation++; pending?.abort(); pending=null;
  playback?.destroy(); viz?.destroy(); playback=null;viz=null;run=null;
  sourceNodes.clear(); $('code-lines').replaceChildren();
  const placeholder=document.createElement('li');placeholder.textContent='开始分析后显示对应源码。';$('code-lines').append(placeholder);
  mountWindow();
  for(const id of ['varLeft','varRight','varValue'])$(id).textContent='—';
  $('varMid').textContent='未计算';$('stepText').textContent='尚未开始';$('step-description').textContent='';$('source-version').textContent='C/C++';
  $('startBtn').disabled=false;$('startBtn').textContent='开始分析';$('run-form').removeAttribute('aria-busy');
  publish(null);
}
function render(state) {
  if(!run || state.runId!==run.runId || !state.step)return;
  const step=state.step;
  viz.setStep(step, state);
  $('varLeft').textContent=step.variables.left;$('varRight').textContent=step.variables.right;
  $('varMid').textContent=step.variables.mid===null?'未计算':step.variables.mid;
  $('varValue').textContent=step.variables.mid===null?'—':step.array[step.variables.mid];
  $('stepText').textContent=`第 ${state.stepIndex+1} 步 / 共 ${state.total} 步`;
  $('step-description').textContent=describeStep(step);
  for(const [lineId,node] of sourceNodes){const active=lineId===step.lineId;node.classList.toggle('active',active);if(active)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');}
  publish({runId:run.runId,stepIndex:state.stepIndex,step,total:state.total,playing:state.playing,sourceVersion:run.sourceVersion});
}
async function start(event) {
  event.preventDefault(); clearRun();
  let input;try{input=parseInput($('arrInput').value,$('targetInput').value);}catch(error){message(error.message,true);return;}
  const ticket=generation;const controller=new AbortController();pending=controller;
  message('正在生成执行步骤…');$('startBtn').disabled=true;$('startBtn').textContent='分析中…';$('run-form').setAttribute('aria-busy','true');
  try{
    const result=validateRun(await createRun(input,controller.signal));
    if(ticket!==generation)return;
    run=result;$('code-lines').replaceChildren();
    for(const line of run.sourceLines){const node=document.createElement('li');node.textContent=line.text;node.dataset.lineId=line.lineId;sourceNodes.set(line.lineId,node);$('code-lines').append(node);}
    $('source-version').textContent=`C/C++ · ${run.sourceVersion}`;
    viz.setRun(run);
    playback=createPlayback({runId:run.runId,steps:run.steps,intervalMs:speedMs,onStepChange:render});
    render({...playback.getState(),step:run.steps[0]});
    message('运行已创建。从第 1 步开始，可单步查看或播放。');
  }catch(error){if(ticket!==generation||error.name==='AbortError')return;clearRun();message(error.message,true);}
  finally{if(ticket===generation){pending=null;$('startBtn').disabled=false;$('startBtn').textContent='开始分析';$('run-form').removeAttribute('aria-busy');}}
}
$('run-form').addEventListener('submit',start);
for(const id of ['arrInput','targetInput'])$(id).addEventListener('input',()=>{const old=Boolean(run||pending);clearRun();message(old?'输入已更改，请重新开始分析。':'');});
$('fillDemo').addEventListener('click',()=>{clearRun();$('arrInput').value='1,3,5,7,9';$('targetInput').value='7';message('示例已填入，点击开始分析。');});
$('visualization-panel').addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,button,a,[contenteditable]')||!playback)return;
  if(event.key==='ArrowLeft'){event.preventDefault();playback.prev();}
  else if(event.key==='ArrowRight'){event.preventDefault();playback.next();}
  else if(event.key===' '){event.preventDefault();playback.getState().playing?playback.pause():playback.play();}
});
requestJSON('/api/health').then(data=>{$('service-status').textContent=data.mode==='mock'?'服务已连接 · 辅导为 Mock 开发模板':data.modelCallsEnabled?'服务已连接 · 辅导使用真实模型':'服务已连接 · 模型未配置，动画仍可使用';}).catch(()=>{$('service-status').textContent='服务未连接，请按启动说明重试。';});
window.addEventListener('pagehide',()=>{generation++;pending?.abort();playback?.destroy();viz?.destroy();ui.destroy();agent.destroy();unsubscribeExercises();exercises.destroy();listeners.clear();},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
mountWindow();
publish(null);
