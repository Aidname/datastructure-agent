const markup = `
<header class="chat-header"><h2>步骤辅导</h2><span id="status-badge" class="badge mock">正在连接…</span><a href="/" class="back-link">返回工作台</a></header>
<div id="current-step-label" class="current-step-label">先创建一次运行，再针对步骤提问。</div>
<div id="chat-messages" class="chat-messages" aria-live="polite"><div class="message system"><div class="message-body">暂停在感兴趣的一步，问问它为什么这样执行。</div></div></div>
<div class="chat-input-area"><div class="input-row context-row"><label for="run-id-input">运行 ID<input id="run-id-input" type="text" placeholder="runId"></label><label for="step-index-input">步骤索引<input id="step-index-input" type="number" min="0" step="1"></label></div>
<div class="input-row"><label class="chat-controls-label" for="hint-level-select">提示级别<select id="hint-level-select"><option value="1">1 · 观察当前状态</option><option value="2" selected>2 · 理解更新规则</option><option value="3">3 · 完整解释</option></select></label></div>
<div class="input-row"><input id="question-input" type="text" maxlength="2000" aria-label="向辅导助手提问" placeholder="为什么下一步更新左边界？"><button id="send-btn" type="button">发送</button><button id="retry-btn" type="button" style="display:none">重试</button></div></div>
<div id="usage-info" class="usage-info" role="status"></div>`;

export function createAgentChat(container, { embedded = false, onBeforeSend = () => {} } = {}) {
  container.innerHTML = markup;
  if (embedded) {
    container.classList.add('embedded');
    const original = container.querySelector('#question-input'), textarea = document.createElement('textarea');
    for (const attr of original.attributes) if (attr.name !== 'type') textarea.setAttribute(attr.name, attr.value);
    textarea.rows = 2; original.replaceWith(textarea);
  }
  const $ = id => container.querySelector('#' + id);
  const messages = $('chat-messages'), send = $('send-btn'), retry = $('retry-btn'), question = $('question-input');
  const runInput = $('run-id-input'), stepInput = $('step-index-input'), level = $('hint-level-select');
  const lifetime = new AbortController();
  let busy = false, context = null, failed = null, controller = null, serial = 0, usageTicket = 0, alive = true;
  let loading = null, conversationRun = null, conversationId = null;
  function resetConversation() { conversationRun = null; conversationId = null; }
  function identify(input) {
    if (!conversationId || conversationRun !== input.runId) {
      conversationId = crypto.randomUUID(); conversationRun = input.runId;
    }
    return { ...input, conversationId, turnId: crypto.randomUUID() };
  }
  const listen = (node, type, handler) => node.addEventListener(type, handler, { signal: lifetime.signal });

  function append(role, text, meta) {
    const node = document.createElement('div'); node.className = 'message ' + role;
    if (meta) { const tag = document.createElement('div'); tag.className = 'message-meta'; tag.textContent = meta; node.append(tag); }
    const body = document.createElement('div'); body.className = 'message-body'; body.textContent = text; node.append(body);
    messages.append(node); messages.scrollTop = messages.scrollHeight; return node;
  }
  function controls() { send.disabled = busy || (embedded && !context); question.disabled = busy || (embedded && !context); }
  function label() { $('current-step-label').textContent = stepInput.value === '' ? '先创建一次运行，再针对步骤提问。' : `当前选中：第 ${Number(stepInput.value)+1} 步`; }
  async function refreshUsage(sid = runInput.value.trim()) {
    const ticket = ++usageTicket;
    try {
      const res = await fetch('/api/agent/usage?sessionId=' + encodeURIComponent(sid), { signal: lifetime.signal });
      const data = await res.json();
      if (!alive || !res.ok || !data.ok || ticket !== usageTicket || sid !== runInput.value.trim()) return;
      $('usage-info').textContent = `本次服务会话调用 ${data.requests} 次 · 失败 ${data.failures || 0} 次 · Token ${data.tokensUsed ?? '未知'} · 费用 ${data.costUsed == null ? '未知' : Number(data.costUsed).toFixed(6) + ' 元（配置估算）'}`;
    } catch { /* Keep unknown data unknown. */ }
  }

  async function submit(snapshot) {
    if (busy || !alive || (embedded && !context)) return;
    const input = snapshot || identify({ runId: runInput.value.trim(), stepIndex: Number(stepInput.value), question: question.value.trim(), hintLevel: Number(level.value) });
    if (!input.runId) { alert('请先输入 runId'); return; }
    if ((!snapshot && stepInput.value === '') || !Number.isSafeInteger(input.stepIndex) || input.stepIndex < 0) { alert('请输入有效的步骤索引'); return; }
    if (!input.question) { alert('请输入问题'); return; }
    onBeforeSend();
    const ticket = ++serial;
    controller = new AbortController(); busy = true; failed = null; controls(); retry.style.display = 'none';
    const meta = `runId=${input.runId} · 步骤${input.stepIndex+1} · 级别${input.hintLevel}`;
    append('user', input.question, '提问归属：' + meta);
    if (!snapshot) question.value = '';
    loading = append('system', '正在思考…', meta);
    const requestLoading = loading, started = Date.now();
    try {
      const res = await fetch('/api/agent/explain', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...input,sessionId:input.runId}), signal:controller.signal });
      const data = await res.json();
      if (!alive || ticket !== serial) return;
      if (!res.ok || typeof data.answer !== 'string') throw new Error(data.error?.message || '服务返回了无效回复');
      const node = append('assistant', data.answer, `回答归属：runId=${data.runId || input.runId} · 步骤${(data.stepIndex ?? input.stepIndex)+1} · 级别${data.hintLevel || input.hintLevel} · ${Date.now()-started}ms`);
    } catch (error) {
      if (!alive || ticket !== serial || error.name === 'AbortError') return;
      failed = {...input}; append('system', '请求失败：' + error.message, '原请求：' + meta); retry.style.display = 'inline-block';
    } finally {
      requestLoading.remove();
      if (alive && ticket === serial) { loading = null; busy = false; controller = null; controls(); refreshUsage(input.runId); }
    }
  }

  function setContext(next) {
    const valid = next && typeof next.runId === 'string' && Number.isSafeInteger(next.stepIndex) && next.stepIndex >= 0;
    const oldRun = context?.runId;
    if (!valid || (oldRun && next.runId !== oldRun)) {
      serial++; controller?.abort(); controller = null; loading?.remove(); loading = null; busy = false;
      failed = null; retry.style.display = 'none'; resetConversation();
    }
    context = valid ? {runId:next.runId,stepIndex:next.stepIndex} : null;
    runInput.value = context?.runId || ''; stepInput.value = context ? String(context.stepIndex) : '';
    label(); controls(); if (!valid || oldRun !== context.runId) refreshUsage();
  }
  listen(send,'click',()=>submit());
  listen(retry,'click',()=>{ if (failed) submit({...failed}); });
  listen(question,'keydown',event=>{ if (event.key==='Enter' && !event.shiftKey) { event.preventDefault(); submit(); } });
  listen(stepInput,'change',label); listen(runInput,'change',()=>refreshUsage());
  fetch('/api/health',{signal:lifetime.signal}).then(r=>r.json()).then(data=>{
    if (!alive) return;
    $('status-badge').textContent = data.modelCallsEnabled ? '在线模式（DeepSeek）' : data.mode==='mock' ? 'Mock模式' : '模型未配置';
    $('status-badge').className = data.modelCallsEnabled ? 'badge live' : 'badge mock';
  }).catch(()=>{ if(alive) $('status-badge').textContent='服务不可用'; });
  if (!embedded) {
    const params = new URLSearchParams(location.search);
    runInput.value = params.get('runId') || ''; stepInput.value = params.get('stepIndex') || ''; label();
  }
  controls(); refreshUsage();
  return { setContext, destroy() { alive=false;serial++;controller?.abort();lifetime.abort();container.replaceChildren(); } };
}
