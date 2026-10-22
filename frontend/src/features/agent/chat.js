const messagesEl = document.getElementById('chat-messages');
const sendBtn = document.getElementById('send-btn');
const questionInput = document.getElementById('question-input');
const runIdInput = document.getElementById('run-id-input');
const stepIndexInput = document.getElementById('step-index-input');
const hintLevelSelect = document.getElementById('hint-level-select');
const usageInfo = document.getElementById('usage-info');
const statusBadge = document.getElementById('status-badge');

// 从 URL 参数自动填入
const params = new URLSearchParams(window.location.search);
if (params.get('runId')) runIdInput.value = params.get('runId');
if (params.get('stepIndex')) stepIndexInput.value = params.get('stepIndex');

// 检查后端状态
fetch('/api/health')
  .then(r => r.json())
  .then(data => {
    if (data.modelCallsEnabled) {
      statusBadge.textContent = '在线模式';
      statusBadge.className = 'badge live';
    }
  })
  .catch(() => {});

function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  const runId = runIdInput.value.trim();
  const stepIndex = stepIndexInput.value.trim();
  const hintLevel = parseInt(hintLevelSelect.value);
  const question = questionInput.value.trim();

  if (!runId) { alert('请先输入 runId'); return; }
  if (stepIndex === '') { alert('请输入步骤索引'); return; }
  if (!question) { alert('请输入问题'); return; }

  appendMessage('user', question);
  questionInput.value = '';
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/agent/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId,
        stepIndex: parseInt(stepIndex),
        hintLevel,
        question
      })
    });

    const data = await res.json();

    if (data.answer) {
      appendMessage('assistant', data.answer);
      if (data.usage) {
        usageInfo.textContent = `模型: ${data.usage.model || 'mock'} | 费用: ${data.usage.cost ?? 0} | Mock: ${data.usage.mock ? '是' : '否'}`;
      }
    } else if (data.error) {
      appendMessage('system', `错误: ${data.error.message}`);
    }
  } catch (err) {
    appendMessage('system', `请求失败: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendMessage);
questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
