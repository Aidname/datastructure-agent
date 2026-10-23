import { requestJSON } from '../../services/api.js';

// Layout state never owns or changes the algorithm's playback cursor.
export function createWorkbenchUI({ onNavigate = () => {} } = {}) {
  const $ = id => document.getElementById(id);
  const lifetime = new AbortController();
  const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: lifetime.signal });
  const panel = $('tutor-window'), ball = $('tutor-toggle'), sidebar = $('sidebar-toggle');
  const uiKey = 'datastructure-agent:workbench-ui:v1';
  let open = false, returnFocus = ball, drag = null, cardsLoaded = false, cardsBusy = false;
  let positionFrame = null;
  function queuePosition() {
    if (positionFrame !== null) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = null;
      // Leave every timeline step reachable even when its bar is near the screen bottom.
      const timeline = document.querySelector('.vizwin .timeline')?.getBoundingClientRect();
      const base = innerWidth <= 540 ? 14 : 24, right = innerWidth <= 540 ? 14 : 26;
      const x = innerWidth - right - ball.offsetWidth, y = innerHeight - base - ball.offsetHeight;
      const overlaps = timeline && timeline.bottom > y && timeline.top < innerHeight - base && timeline.right > x && timeline.left < innerWidth - right;
      ball.style.bottom = (overlaps ? innerHeight - timeline.top + 12 : base) + 'px';
    });
  }
  try { document.body.dataset.sidebarCollapsed = localStorage.getItem(uiKey) !== 'expanded' ? 'true' : 'false'; } catch { /* Layout preference is optional. */ }
  function updateSidebar() {
    const collapsed = document.body.dataset.sidebarCollapsed === 'true';
    sidebar.setAttribute('aria-expanded', String(!collapsed));
    sidebar.setAttribute('aria-label', collapsed ? '展开侧栏' : '收起侧栏');
    sidebar.title = collapsed ? '展开侧栏' : '收起侧栏';
    sidebar.querySelector('[data-sidebar-arrow]').textContent = collapsed ? '›' : '‹';
  }
  updateSidebar();
  listen(sidebar, 'click', () => {
    document.body.dataset.sidebarCollapsed = document.body.dataset.sidebarCollapsed === 'true' ? 'false' : 'true';
    updateSidebar();
    try { localStorage.setItem(uiKey, document.body.dataset.sidebarCollapsed === 'true' ? 'collapsed' : 'expanded'); } catch { /* Optional preference. */ }
  });
  async function loadCards() {
    if (cardsLoaded || cardsBusy) return;
    cardsBusy = true; $('knowledge-status').textContent = '正在读取知识卡…'; $('knowledge-retry').hidden = true;
    try {
      const data = await requestJSON('/api/knowledge/cards?topicId=binary-search', { signal: lifetime.signal });
      if (!Array.isArray(data.cards)) throw new Error('知识卡响应不完整。');
      const nodes = data.cards.map(card => {
        const node = document.createElement('details'), title = document.createElement('summary');
        const body = document.createElement('p'), source = document.createElement('small');
        title.textContent = card.title; body.textContent = card.content;
        source.textContent = `${card.id} · ${card.sourceType === 'original' ? '项目自编' : card.sourceId} · v${card.version}`;
        node.append(title, body, source); return node;
      });
      $('knowledge-cards').replaceChildren(...nodes); cardsLoaded = true;
      $('knowledge-status').textContent = nodes.length ? `共 ${nodes.length} 张知识卡，可独立于模型阅读。` : '当前没有可用知识卡。';
    } catch (error) {
      if (error.name !== 'AbortError') { $('knowledge-status').textContent = `读取失败：${error.message}`; $('knowledge-retry').hidden = false; }
    } finally { cardsBusy = false; }
  }
  const pages = { workbench: '算法工作台', knowledge: '知识与辅导', practice: '过程练习', records: '错题与记录' };
  let currentPage = null;
  function route() {
    const hash = location.hash.slice(1);
    return ({ 'exercise-panel': 'practice', 'records-mount': 'records', 'tutor-knowledge-view': 'knowledge' })[hash] || (Object.hasOwn(pages,hash) ? hash : 'workbench');
  }
  function navigate(name, { replace = false } = {}) {
    if (!Object.hasOwn(pages,name)) name = 'workbench';
    if (location.hash !== '#'+name) history[replace ? 'replaceState' : 'pushState'](null,'','#'+name);
    if (currentPage === name) return;
    document.querySelector('.vizwin[data-full="true"] [data-viz-full]')?.click();
    onNavigate(name);
    if (open) show(false, false);
    for (const view of document.querySelectorAll('[data-page-view]')) view.hidden = view.dataset.pageView !== name;
    for (const link of document.querySelectorAll('.nav-item[data-page-link]')) {
      const active = link.dataset.pageLink === name;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    }
    currentPage = name; document.body.dataset.page = name;
    if (innerWidth <= 540) { document.body.dataset.sidebarCollapsed = 'true'; updateSidebar(); }
    $('page-breadcrumb').textContent = pages[name]; document.title = pages[name] + ' · 看懂每一步';
    ball.hidden = name !== 'workbench';
    if (name === 'knowledge') loadCards();
    document.querySelector('[data-page-view="'+name+'"] h1')?.focus({preventScroll:true});
    window.scrollTo(0,0); queuePosition();
  }
  for (const link of document.querySelectorAll('[data-page-link]')) listen(link, 'click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(link.dataset.pageLink);
  });
  listen(window,'hashchange',()=>navigate(route(),{replace:true}));
  listen(window,'popstate',()=>navigate(route(),{replace:true}));

  function clampPosition() {
    if (!open || !panel.style.left) return;
    const rect = panel.getBoundingClientRect();
    panel.style.left = Math.max(12, Math.min(innerWidth - rect.width - 12, rect.left)) + 'px';
    panel.style.top = Math.max(12, Math.min(innerHeight - rect.height - 12, rect.top)) + 'px';
  }
  function show(value, restoreFocus = true) {
    open = value; panel.hidden = !value; ball.setAttribute('aria-expanded', String(value));
    ball.setAttribute('aria-label', value ? '收起步骤辅导' : '打开步骤辅导');
    if (value) {
      clampPosition(); $('tutor-close').focus({ preventScroll: true });
    } else if (restoreFocus) returnFocus.focus({ preventScroll: true });
  }
  listen(ball, 'click', () => { returnFocus = ball; show(!open); });
  listen($('tutor-close'), 'click', () => show(false));
  // Dismiss without consuming the click or moving focus away from the outside control.
  listen(document, 'pointerdown', event => {
    if (open && !drag && !panel.contains(event.target) && !ball.contains(event.target)) show(false, false);
  });
  listen($('knowledge-retry'), 'click', loadCards);
  listen(panel, 'keydown', event => {
    if (event.key === 'Escape' && !document.body.classList.contains('is-viz-full')) { event.preventDefault(); event.stopPropagation(); show(false); }
  });
  const handle = panel.querySelector('[data-tutor-drag]');
  listen(handle, 'pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = panel.getBoundingClientRect();
    drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    panel.style.left = rect.left + 'px'; panel.style.top = rect.top + 'px'; panel.style.right = 'auto'; panel.style.bottom = 'auto';
    handle.setPointerCapture(event.pointerId); event.preventDefault();
  });
  listen(handle, 'pointermove', event => {
    if (!drag) return;
    panel.style.left = (event.clientX - drag.x) + 'px'; panel.style.top = (event.clientY - drag.y) + 'px'; clampPosition();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(handle, type, () => { drag = null; });
  listen(window, 'resize', () => { clampPosition(); queuePosition(); });
  listen(window, 'scroll', queuePosition);
  const layoutObserver = new ResizeObserver(queuePosition);
  layoutObserver.observe($('visualization-panel'));
  const prompts = {
    init: '二分查找为什么要求数组有序？',
    probe: '这次比较后，可以排除哪一半区间？',
    'move-left': '更新左边界后，为什么 mid 暂时是“未计算”？',
    'move-right': '更新右边界后，为什么 mid 暂时是“未计算”？',
    found: '如果数组有重复值，这次一定返回第一个位置吗？',
    'not-found': '哪个边界条件说明目标已经不在数组中了？'
  };
  navigate(route(), {replace:true});
  return {
    navigate,
    setContext(context) { $('tutor-prompt').textContent = prompts[context?.step?.event] || prompts.init; queuePosition(); },
    destroy() { lifetime.abort(); layoutObserver.disconnect(); if (positionFrame !== null) cancelAnimationFrame(positionFrame); }
  };
}
