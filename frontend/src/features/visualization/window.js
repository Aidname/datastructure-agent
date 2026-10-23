/**
 * 成员03可视化窗口，从PR #14的dev-viz-window.js恢复并接入正式工作台。
 * 只读服务端run；时间轴与播放意图委托唯一createPlayback实例。
 * 提供白底画布、平移缩放、取景、窗口调整、全屏和逐步解释。
 */

import { createVisualization } from './index.js';


const TEMPLATE = `
<div class="win-bar">
  <span class="win-dot" aria-hidden="true"></span>
  <span class="win-title">执行过程</span>
  <span class="win-sub">二分查找 · 闭区间 · 数组视图</span>
  <span class="win-actions">
    <button class="win-action" type="button" data-viz-full aria-pressed="false" title="铺满整个屏幕（Esc 退出）">全屏</button>
  </span>
</div>
<div class="win-body-viz">
  <section class="viewport" aria-label="可视化演示">
    <div class="viewport-head">
      <span class="vh-title">数组视图</span>
      <span class="vh-sub">二分查找 · 闭区间</span>
      <span class="vh-actions">
        <button class="bl-btn" type="button" data-viz-view-reset title="复位视图（Home）">复位视图</button>
        <button class="bl-btn" type="button" data-viz-replay>重播入场动效</button>
      </span>
    </div>
    <div class="viewport-body" data-viz-body tabindex="0" aria-label="数组视口，拖拽平移，滚轮缩放，Home自适应取景">
      <div class="viewport-scene" data-viz-scene></div>
    </div>
    <div data-explain-host aria-label="本步解释"></div>
    <div class="viewport-legend" aria-label="指针图例"><span><b class="legend-left">L</b> 左边界</span><span><b class="legend-right">R</b> 右边界</span><span><b class="legend-mid">M</b> 比较位置</span><span>淡色：已排除</span></div>
    <div class="viewport-warn" data-viz-warn hidden></div>
    <div class="viewport-hint">拖拽平移 · 滚轮缩放 · Home 复位</div>
  </section>

  <section class="timeline" aria-label="播放控制">
    <div class="tl-transport" data-tl-transport>
        <button class="tl-btn" type="button" id="resetBtn" data-t="reset" title="跳到开始并停止（重置）" aria-label="重置">
          <svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2.5" width="1.6" height="9"/><path d="M11 2.5 5.2 7 11 11.5z"/></svg>
        </button>
        <button class="tl-btn" type="button" id="prevBtn" data-t="prev" title="上一步（恢复上一个快照）" aria-label="上一步">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M9.5 2.5 4 7l5.5 4.5z"/></svg>
        </button>
        <button class="tl-btn" type="button" id="playBtn" data-t="play" title="播放" aria-label="播放"><span data-play-label class="viz-sr-only">播放</span>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 2.5 10.5 7 3.5 11.5z"/></svg>
        </button>
        <button class="tl-btn" type="button" id="nextBtn" data-t="next" title="下一步" aria-label="下一步">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5 8.4 7 2.5 11.5z"/></svg>
        </button>
        <button class="tl-btn" type="button" data-t="last" title="跳到结束" aria-label="跳到结束">
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 2.5 6.8 7 1 11.5z"/><rect x="8.4" y="2.5" width="1.6" height="9"/></svg>
        </button>
      </div>
    <div class="tl-ruler" data-tl-ruler tabindex="0" role="slider"
         aria-label="步骤时间轴：点击或按左右方向键跳到某一步"
         aria-valuemin="1" aria-valuemax="1" aria-valuenow="1">
      <div class="tl-ticks" data-tl-ticks></div>
      <div class="tl-playhead" data-tl-playhead aria-hidden="true"></div>
    </div>
  </section>
</div>
`;

export function createVizWindow(host, {
  run = null,
  onSeek = null,
  onTransport = null
} = {}) {
  if (!host) throw new Error('createVizWindow 需要一个容器');

  const root = document.createElement('section');
  root.className = 'win vizwin';
  root.dataset.win = 'viz';
  root.innerHTML = TEMPLATE;
  host.append(root);

  // 防御：若上一个窗口异常销毁、body 上残留了全屏类，这里兜一次，保证"新窗口不是全屏"
  if (!document.querySelector('.vizwin[data-full="true"]')) {
    document.body.classList.remove('is-viz-full');
  }

  const $ = (selector) => root.querySelector(selector);
  const vizHost = $('[data-viz-scene]');
  const explainHost = $('[data-explain-host]');
  const body = $('[data-viz-body]');
  const scene = $('[data-viz-scene]');
  const warn = $('[data-viz-warn]');
  const tickHost = $('[data-tl-ticks]');
  const playhead = $('[data-tl-playhead]');
  const ruler = $('[data-tl-ruler]');
  const transport = $('[data-tl-transport]');

  const view = { x: 0, y: 0, scale: 1, min: 0.01, maxFit: 3, max: 6 };
  let destroyed = false, fitFrame = null;
  const queueFit = () => {
    if (destroyed) return;
    if (fitFrame !== null) cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => { fitFrame = null; if (!destroyed) fitView(); });
  };
  let viz = null;
  let currentRun = run;
  let state = { stepIndex: 0, total: 0, playing: false, canPrev: false, canNext: false };

  /* ---------------- 视口：平移 / 缩放 / 取景 ---------------- */
  function applyView() {
    scene.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  }

  function warnIfCanvasTiny() {
    const w = Math.round(body.clientWidth);
    const h = Math.round(body.clientHeight);
    const tiny = w < 240 || h < 170;
    warn.hidden = !tiny;
    if (tiny) warn.textContent = `可视区只有 ${w}×${h}px，数组会被压得很小：可以点「全屏」放大查看。`;
  }

  function fitView() {
    const cw = body.clientWidth || 1;
    const ch = body.clientHeight || 1;
    const sw = scene.offsetWidth || 1;
    const sh = scene.offsetHeight || 1;
    const fit = Math.min(cw / sw, ch / sh) * 0.92;
    view.scale = Math.min(view.maxFit, Math.max(view.min, fit));
    view.x = 0;
    view.y = 0;
    applyView();
    warnIfCanvasTiny();
  }

  let panning = false;
  let panStart = { x: 0, y: 0 };
  body.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest?.('button, select, input, .bsviz-explain')) return;
    body.focus({preventScroll:true});
    panning = true;
    panStart = { x: event.clientX - view.x, y: event.clientY - view.y };
    body.classList.add('is-panning');
    body.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  body.addEventListener('pointermove', (event) => {
    if (!panning) return;
    view.x = event.clientX - panStart.x;
    view.y = event.clientY - panStart.y;
    applyView();
  });
  const stopPan = () => { panning = false; body.classList.remove('is-panning'); };
  body.addEventListener('pointerup', stopPan);
  body.addEventListener('pointercancel', stopPan);
  body.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = body.getBoundingClientRect();
    const cx = event.clientX - rect.left - rect.width / 2;
    const cy = event.clientY - rect.top - rect.height / 2;
    const next = Math.min(view.max, Math.max(view.min, view.scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
    const k = next / view.scale;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.scale = next;
    applyView();
  }, { passive: false });

  const onHomeKey = (event) => {
    if (event.key !== 'Home') return;
    if (!host.contains(document.activeElement)) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) return;
    event.preventDefault();
    fitView();
  };
  window.addEventListener('keydown', onHomeKey);

  $('[data-viz-view-reset]').addEventListener('click', fitView);
  $('[data-viz-replay]').addEventListener('click', () => viz?.playEnterAnimation());

  /* 全屏：整个白底窗口铺满屏幕。
     全屏会盖住顶栏与分区胶囊，所以标题栏留「退出全屏」，并且 Esc 也能退。 */
  const fullBtn = $('[data-viz-full]');
  let fitTimer = null;

  function setFull(on) {
    root.dataset.full = on ? 'true' : 'false';
    // 全屏时页面里那层带 transform 的容器必须摘掉：祖先有 transform 时 position:fixed 会退化成相对定位
    document.body.classList.toggle('is-viz-full', on);
    if (on) {
      root.style.left = '';
      root.style.top = '';
      root.style.width = '';
      root.style.height = '';
    }
    if (on) { root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true'); root.setAttribute('aria-label','二分查找可视化'); }
    else { root.removeAttribute('role'); root.removeAttribute('aria-modal'); root.removeAttribute('aria-label'); }
    if (fullBtn) {
      fullBtn.textContent = on ? '退出全屏' : '全屏';
      fullBtn.title = on ? '退出全屏（Esc）' : '铺满整个屏幕（Esc 退出）';
      fullBtn.setAttribute('aria-pressed', String(on));
    }
    queueFit();
    // 延迟取景必须自己管住：窗口被销毁后这个回调还会跑，所以存住句柄、destroy 时清掉
    if (fitTimer) clearTimeout(fitTimer);
    fitTimer = setTimeout(() => { fitTimer = null; fitView(); }, 260);
  }
  fullBtn.addEventListener('click', () => setFull(root.dataset.full !== 'true'));
  const onEsc = (event) => {
    if (event.key === 'Tab' && root.dataset.full === 'true') {
      const controls = [...root.querySelectorAll('button:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(node=>node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (event.key === 'Escape' && root.dataset.full === 'true') {
      event.preventDefault();
      setFull(false);
    }
  };
  window.addEventListener('keydown', onEsc);

  /* ---------------- 时间轴 ---------------- */
  function renderRuler(total) {
    ruler.setAttribute('aria-valuemin', '1');
    const count = Math.max(1, total);
    tickHost.replaceChildren(...Array.from({ length: count }, (_, index) => {
      const tick = document.createElement('div');
      tick.className = 'tl-tick';
      tick.dataset.index = String(index);
      const dot = document.createElement('span');
      dot.className = 'tl-dot';
      const label = document.createElement('span'); label.className = 'tl-label'; label.textContent = String(index + 1);
      tick.title = `第 ${index + 1} 步`; tick.append(dot, label);
      return tick;
    }));
    ruler.setAttribute('aria-valuemax', String(count));
    updateLabelDensity();
  }

  function renderPlayhead() {
    const total = Math.max(1, state.total);
    const pos = ((state.stepIndex + 0.5) / total) * 100;
    const pct = `${Math.min(100, Math.max(0, pos))}%`;
    playhead.style.left = pct;
    ruler.setAttribute('aria-valuenow', String(state.stepIndex + 1));
    tickHost.querySelectorAll('.tl-tick').forEach((tick, index) => {
      tick.classList.toggle('is-done', index < state.stepIndex);
      tick.classList.toggle('is-current', index === state.stepIndex);
      tick.classList.toggle('is-end', index === state.total - 1);
    });
    ruler.setAttribute('aria-valuetext', `第 ${state.stepIndex + 1} 步，共 ${state.total} 步`);
    updateLabelDensity();
  }

  function updateLabelDensity() {
    const count = Math.max(1, tickHost.children.length);
    const cellWidth = ruler.clientWidth / count;
    const stride = Math.max(1, Math.ceil(26 / Math.max(1, cellWidth)));
    [...tickHost.children].forEach((tick, index) => {
      const current = index === state.stepIndex;
      const nearCurrent = state.stepIndex >= 0 && Math.abs(index - state.stepIndex) * cellWidth < 24;
      tick.querySelector('.tl-label').style.visibility = current || (!nearCurrent && (index % stride === 0 || index === count - 1)) ? 'visible' : 'hidden';
    });
  }

  function seekFromEvent(event) {
    if (!currentRun || !state.total) return;
    const rect = ruler.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
    const total = Math.max(1, state.total);
    const index = Math.min(total - 1, Math.max(0, Math.floor(ratio * total)));
    onSeek?.(index);
  }
  ruler.addEventListener('pointerdown', seekFromEvent);
  ruler.addEventListener('keydown', (event) => {
    if (!currentRun || !state.total) return;
    // 时间轴自己处理左右/Home/End 之后必须阻止冒泡：
    // 否则事件会继续冒到 document，宿主的全局快捷键再执行一次 next/prev，一次按键跳过两步（PR #14 复审问题 1）。
    if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); onSeek?.(Math.max(0, state.stepIndex - 1)); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); onSeek?.(Math.min(state.total - 1, state.stepIndex + 1)); return; }
    if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); onSeek?.(0); return; }
    if (event.key === 'End') { event.preventDefault(); event.stopPropagation(); onSeek?.(state.total - 1); }
  });

  transport.addEventListener('click', (event) => {
    const button = event.target.closest('[data-t]');
    if (!button || button.disabled) return;
    const action = button.dataset.t;
    if (action === 'reset') { onTransport?.('reset'); viz?.playEnterAnimation(); }
    else if (action === 'last') onSeek?.(Math.max(0, state.total - 1), { stop: true });
    else onTransport?.(action);
  });

  /* ---------------- 对外 ---------------- */
  function bindRun(nextRun) {
    currentRun = nextRun;
    if (!nextRun) return;
    if (viz) viz.destroy();
    scene.replaceChildren();
    viz = createVisualization(vizHost, { run: nextRun, legend: false, dots: false, explainContainer: explainHost });
    renderRuler(nextRun.steps.length);
    queueFit();
  }

  function setStep(step, nextState = {}) {
    state = { ...state, ...nextState };
    if (viz && step) viz.showStep(step);
    const active = Boolean(currentRun && state.total > 0);
    const play = $('#playBtn');
    const label = state.playing ? '暂停' : '播放';
    play.dataset.t = state.playing ? 'pause' : 'play';
    play.setAttribute('aria-label', label); play.title = label;
    $('[data-play-label]').textContent = label;
    play.querySelector('svg').innerHTML = state.playing ? '<path d="M3 2h2v9H3z M7 2h2v9H7z"/>' : '<path d="M3.5 2.5 10.5 7 3.5 11.5z"/>';
    play.disabled = !active || (!state.canNext && !state.playing);
    $('#prevBtn').disabled = !active || !state.canPrev;
    $('#nextBtn').disabled = !active || !state.canNext;
    $('#resetBtn').disabled = !active;
    $('[data-t="last"]').disabled = !active || !state.canNext;
    ruler.setAttribute('aria-disabled', String(!active));
    ruler.tabIndex = active ? 0 : -1;
    root.dataset.empty = String(!active);
    if (active) renderPlayhead();
    else {
      ruler.setAttribute('aria-valuenow','0');
      ruler.setAttribute('aria-valuemin','0');
      ruler.setAttribute('aria-valuemax','0');
      ruler.setAttribute('aria-valuetext','尚未创建运行');
    }
  }

  renderRuler(run ? run.steps.length : 0);
  if (run) bindRun(run);
  else {
    const empty = document.createElement('p'); empty.className = 'viz-empty';
    empty.textContent = '填入示例并开始分析，查看真实执行过程。'; scene.append(empty);
    applyView();
  }
  setStep(run?.steps[0] ?? null, {stepIndex:run ? 0 : -1,total:run?.steps.length ?? 0,canPrev:false,canNext:Boolean(run && run.steps.length > 1),playing:false});

  // Native resizing and responsive layout share the same fitting path.
  const observer = new ResizeObserver(queueFit); observer.observe(body);
  const rulerObserver = new ResizeObserver(updateLabelDensity); rulerObserver.observe(ruler);
  const bar = $('.win-bar'); let drag = null;
  bar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button') || root.dataset.full === 'true') return;
    const box = root.getBoundingClientRect(), bounds = host.getBoundingClientRect();
    drag = {x:event.clientX,y:event.clientY,left:box.left-bounds.left,top:box.top-bounds.top};
    root.style.width = box.width+'px'; root.style.height = box.height+'px';
    root.classList.add('is-dragging'); bar.setPointerCapture(event.pointerId); event.preventDefault();
  });
  bar.addEventListener('pointermove', event => {
    if (!drag) return;
    root.style.left = Math.max(0,Math.min(host.clientWidth-root.offsetWidth,drag.left+event.clientX-drag.x))+'px';
    root.style.top = Math.max(0,Math.min(host.clientHeight-root.offsetHeight,drag.top+event.clientY-drag.y))+'px';
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) bar.addEventListener(type,()=>{drag=null;root.classList.remove('is-dragging');});

  return {
    el: root,
    setRun: bindRun,
    setStep,
    fitView,
    replay: () => viz?.playEnterAnimation(),
    destroy: () => {
      destroyed = true; observer.disconnect(); rulerObserver.disconnect();
      if (fitFrame !== null) cancelAnimationFrame(fitFrame);
      window.removeEventListener('keydown', onHomeKey);
      window.removeEventListener('keydown', onEsc);
      // 销毁前必须把"全屏"这个页面级状态收干净（PR #14 复审问题 2）：
      // 否则换 run 重建窗口后 body 上仍留着 is-viz-full，panel/panels 的 transform 会被全屏 CSS 压住。
      if (root.dataset.full === 'true' || document.body.classList.contains('is-viz-full')) setFull(false);
      if (fitTimer) { clearTimeout(fitTimer); fitTimer = null; }
      viz?.destroy();
      root.remove();
    }
  };
}
