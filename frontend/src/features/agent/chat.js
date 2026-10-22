const messagesEl = document.getElementById('chat-messages');
const sendBtn = document.getElementById('send-btn');
const retryBtn = document.getElementById('retry-btn');
const questionInput = document.getElementById('question-input');
const runIdInput = document.getElementById('run-id-input');
const stepIndexInput = document.getElementById('step-index-input');
const hintLevelSelect = document.getElementById('hint-level-select');
const usageInfo = document.getElementById('usage-info');
const statusBadge = document.getElementById('status-badge');
const currentStepLabel = document.getElementById('current-step-label');

let currentReqId = 0;
let activeController = null;

const params = new URLSearchParams(window.location.search);
if (params.get('runId')) runIdInput.value = params.get('runId');
if (params.get('stepIndex')) {
  stepIndexInput.value = params.get('stepIndex');
  updateCurrentStepLabel();
}

fetch('/api/health')
  .then(r => r.json())
  .then(data => {
    if (data.modelCallsEnabled) {
      statusBadge.textContent = `在线模式（${data.mode || 'deepseek'}）`;
      statusBadge.className = 'badge live';
    } else if (data.mode === 'mock') {
      statusBadge.textContent = 'Mock模式';
      statusBadge.className = 'badge mock';
    }
  })
  .catch(() => {});

function refreshUsage() {
  fetch('/api/agent/usage')
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        usageInfo.textContent = `调用 ${data.requests} 次 · Token ${data.tokensUsed} · 费用 ${data.costUsed.toFixed(4)} 元`;
      }
    })
    .catch(() => {});
}
refreshUsage();

function updateCurrentStepLabel() {
  const s = stepIndexInput.value;
  currentStepLabel.textContent = s === '' ? '未选择步骤' : `当前选中：步骤 ${Number(s) + 1}`;
}

stepIndexInput.addEventListener('change', () => {
  updateCurrentStepLabel();
  appendMessage('system', `已切换到步骤 ${Number(stepIndexInput.value) + 1}（上方历史回答仍归属原步骤）`, null);
});

function appendMessage(role, content, meta) {
  const div = document.createElement('div');
  div.className = `message ${role}`;

  if (meta) {
    const tag = document.createElement('div');
    tag.className = 'message-meta';
    tag.textContent = meta;
    div.appendChild(tag);
  }

  const body = document.createElement('div');
  body.className = 'message-body';
  body.textContent = content;
  div.appendChild(body);

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function setLoading(isLoading) {
  if (isLoading) {
    sendBtn.disabled = true;
    questionInput.disabled = true;
    retryBtn.style.display = 'none';
    const loading = appendMessage('system', '正在思考…', '加载中');
    loading.id = 'loading-msg';
  } else {
    sendBtn.disabled = false;
    questionInput.disabled = false;
    const loading = document.getElementById('loading-msg');
    if (loading) loading.remove();
  }
}

async function sendMessage() {
  const runId = runIdInput.value.trim();
  const stepIndex = stepIndexInput.value.trim();
  const hintLevel = parseInt(hintLevelSelect.value);
  const question = questionInput.value.trim();

  if (!runId) { alert('请先输入 runId'); return; }
  if (stepIndex === '') { alert('请输入步骤索引'); return; }
  if (!question) { alert('请输入问题'); return; }

  const thisReqId = ++currentReqId;

  if (activeController) activeController.abort();
  activeController = new AbortController();

  const boundMeta = `提问时步骤：第${Number(stepIndex) + 1}步 · 提示级别${hintLevel}`;
  appendMessage('user', question, boundMeta);
  questionInput.value = '';
  setLoading(true);

  const startedAt = Date.now();

  try {
    const res = await fetch('/api/agent/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-id': runId },
      body: JSON.stringify({ runId, stepIndex: parseInt(stepIndex), hintLevel, question, sessionId: runId }),
      signal: activeController.signal
    });

    const data = await res.json();
    setLoading(false);

    if (thisReqId !== currentReqId) {
      // 迟到回复：仍渲染但标注原步骤
      if (data.answer) {
        const elapsed = Date.now() - startedAt;
        const meta = `[迟到·原步骤${data.stepIndex !== undefined ? Number(data.stepIndex) + 1 : Number(stepIndex) + 1}] 回答归属：runId=${data.runId || runId} · 步骤${data.stepIndex !== undefined ? Number(data.stepIndex) + 1 : '?'} · ${elapsed}ms`;
        appendMessage('assistant', data.answer, meta);
      }
      return;
    }

    if (data.answer) {
      const elapsed = Date.now() - startedAt;
      const meta = `回答归属：runId=${data.runId} · 步骤${data.stepIndex + 1} · 级别${data.hintLevel || hintLevel} · ${elapsed}ms${data.usage?.degraded ? ' · 已降级' : ''}`;
      appendMessage('assistant', data.answer, meta);

      if (data.usage) {
        const costText = data.usage.cost === null || data.usage.cost === undefined
          ? '费用：未知（上游未返回用量）'
          : `费用：${data.usage.cost} 元`;
        const tokenText = data.usage.tokens
          ? ` · Token ${data.usage.tokens.totalTokens}`
          : ' · Token：未知';
        usageInfo.textContent = `${costText}${tokenText} · 模式：${data.usage.mock ? 'Mock' : data.usage.model}`;
      }
      refreshUsage();
    } else if (data.error) {
      appendMessage('system', `错误（${data.error.code}）：${data.error.message}`, `请求耗时 ${Date.now() - startedAt}ms`);
      retryBtn.style.display = 'inline-block';
    }
  } catch (err) {
    setLoading(false);
    if (err.name === 'AbortError') return;
    appendMessage('system', `请求失败：${err.message}。请检查服务是否运行。`, null);
    retryBtn.style.display = 'inline-block';
  }
}

sendBtn.addEventListener('click', sendMessage);
retryBtn.addEventListener('click', () => { retryBtn.style.display = 'none'; sendMessage(); });
questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
