import { answerText, contextText, exerciseText } from '../exercises/model.js';
import { learningSummary } from './store.js';

export function createRecordsPanel(container, { store, onRetry, onClear }) {
  container.innerHTML = `<h3>本机学习记录</h3><p id="learning-progress" role="status"></p><p id="storage-warning" role="status"></p>
    <div class="records-toolbar"><label for="records-filter">查看<select id="records-filter"><option value="all">全部作答</option><option value="wrong">错题历史</option><option value="pending">尚未订正</option></select></label><button id="clear-records-btn" class="secondary" type="button">清除记录</button></div>
    <div id="clear-records-confirm" hidden><p>只清除此浏览器中本应用的练习记录，不能撤销。</p><button id="confirm-clear-records" type="button">确认清除</button><button id="cancel-clear-records" class="secondary" type="button">取消</button></div>
    <p class="learning-note">保留最近 200 次作答；仅存于此浏览器，不与账号同步。清理浏览器数据也会删除记录。</p><ol id="learning-records"></ol><button id="more-records" class="secondary" type="button" hidden>再显示 20 条</button>`;
  const $ = id => container.querySelector('#' + id);
  const lifetime = new AbortController(); let catalog = [], shown = 20;
  const key = record => `${record.question.id}@${record.question.version}`;
  const text = (tag, content, className) => { const node = document.createElement(tag); node.textContent = content; if (className) node.className = className; return node; };
  function render() {
    const records = store.list(); const stats = learningSummary(records, catalog);
    $('learning-progress').textContent = `当前题库 ${stats.total} 题 · 已练 ${stats.attempted} 题 · 最近作答答对 ${stats.solved} 题 · 保留 ${stats.attempts} 次作答`;
    $('storage-warning').textContent = store.status().warning;
    const latest = new Map(records.map(record => [key(record), record]));
    const filter = $('records-filter').value;
    const filtered = [...records].reverse().filter(record => filter === 'all' || (filter === 'wrong' ? !record.correct : latest.get(key(record))?.id === record.id && !record.correct));
    const list = $('learning-records'); list.replaceChildren();
    if (!filtered.length) list.append(text('li', filter === 'all' ? '还没有作答记录。' : '此分类暂无记录。', 'learning-empty'));
    for (const record of filtered.slice(0, shown)) {
      const node = document.createElement('li'); node.className = 'learning-record'; node.dataset.recordId = record.id;
      const result = record.correct ? '答对' : latest.get(key(record))?.correct ? '曾答错，已订正' : '答错，待订正';
      node.append(text('p', `${record.question.id} · v${record.question.version} · ${result}`, 'record-heading'));
      node.append(text('p', exerciseText(record.question.prompt)));
      node.append(text('p', `你的答案：${answerText(record.question, record.answer)}；已用提示：${record.hintsUsed.length ? record.hintsUsed.join('、') : '无'}`));
      node.append(text('p', new Date(record.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }), 'learning-note'));
      const details = document.createElement('details'); details.append(text('summary', '回顾题目情境与提示'));
      details.append(text('p', contextText(record.question.context)));
      details.append(text('p', record.origin ? `提交时附带工作台第 ${record.origin.stepIndex + 1} 步的关联；题目仍使用上面的固定情境。` : '独立练习，提交时没有关联工作台运行。', 'learning-note'));
      for (const level of record.hintsUsed) {
        const feedback = record.feedbackByLevel[level];
        if (feedback?.hint) details.append(text('p', `提示 ${level}：${exerciseText(feedback.hint)}`));
        if (level === 3 && feedback && Object.hasOwn(feedback, 'correctAnswer')) details.append(text('p', `第三级解析：参考答案 ${answerText(record.question, feedback.correctAnswer)}。${exerciseText(feedback.explanation)}`));
      }
      node.append(details);
      const current = catalog.find(q => q.id === record.question.id);
      if (current) {
        const old = current.version !== record.question.version;
        if (old) node.append(text('p', '题目版本已更新；此记录保留原版本，重新练习将使用当前版本。', 'learning-note'));
        const retry = text('button', old ? '练习当前版本' : '重练此题', 'secondary'); retry.type = 'button';
        retry.dataset.questionId = current.id; retry.dataset.oldVersion = String(old); node.append(retry);
      } else node.append(text('p', '当前题库没有此题，仅可回顾旧记录。', 'learning-note'));
      list.append(node);
    }
    $('more-records').hidden = filtered.length <= shown;
  }
  $('learning-records').addEventListener('click', event => {
    const retry = event.target.closest('button[data-question-id]');
    if (retry) onRetry(retry.dataset.questionId, retry.dataset.oldVersion === 'true');
  }, { signal: lifetime.signal });
  $('records-filter').addEventListener('change', () => { shown = 20; render(); }, { signal: lifetime.signal });
  $('more-records').addEventListener('click', () => { shown += 20; render(); }, { signal: lifetime.signal });
  $('clear-records-btn').addEventListener('click', () => { $('clear-records-confirm').hidden = false; }, { signal: lifetime.signal });
  $('cancel-clear-records').addEventListener('click', () => { $('clear-records-confirm').hidden = true; }, { signal: lifetime.signal });
  $('confirm-clear-records').addEventListener('click', () => { onClear(); store.clear(); $('clear-records-confirm').hidden = true; render(); }, { signal: lifetime.signal });
  const unsubscribe = store.subscribe(render); render();
  return { setCatalog(value) { catalog = value; render(); }, destroy() { unsubscribe(); lifetime.abort(); container.replaceChildren(); } };
}
