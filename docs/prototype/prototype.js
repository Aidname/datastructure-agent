import { generateSteps } from '../../shared/algorithms/binarySearch.js';

// 独立原型交互；仅复用04引擎，不维护第二份算法，不调用模型/生产API。
const $ = id => document.getElementById(id);
const labels = { catalog: '课程目录', workbench: '算法工作台', knowledge: '知识与辅导', practice: '过程练习', records: '错题与记录' };
const storeKey = 'm09-prototype-records-v1';
let run = null, index = 0, timer = null, serial = 0, requestSerial = 0;
let records = [];
try { records = JSON.parse(localStorage.getItem(storeKey) || '[]'); if (!Array.isArray(records)) records = []; }
catch { $('storage-status').textContent = '本机存储不可用或演示记录损坏；本次记录仅在内存中保留。'; }
const element = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };

function stop() { clearInterval(timer); timer = null; $('play').textContent = '播放'; }
function route() {
  stop();
  const name = Object.hasOwn(labels, location.hash.slice(1)) ? location.hash.slice(1) : 'catalog';
  for (const page of document.querySelectorAll('.page')) page.hidden = page.id !== name;
  for (const link of document.querySelectorAll('[data-page]')) { const active = link.dataset.page === name; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
  $('breadcrumb').textContent = labels[name];
  if (name === 'records') renderRecords();
}
addEventListener('hashchange', route);

const courses = [
  ['数据结构概述', '逻辑与存储结构、算法评价', 2], ['线性表', '顺序表、链表及基本操作', 4], ['栈、队列与数组', '栈与队列、应用、特殊矩阵', 5],
  ['串', '字符串、模式匹配与 KMP', 3], ['树与二叉树', '性质、遍历、平衡树与编码', 7], ['图', 'BFS / DFS、最短路径与关键路径', 6],
  ['查找', '二分查找、散列与树形查找', 6], ['排序', '插入、交换、选择、归并与外部排序', 7]
];
courses.forEach(([title, desc, count], i) => {
  const card = element('article', undefined, 'course-card' + (title === '查找' ? ' featured' : ''));
  card.append(element('span', `MODULE ${String(i + 1).padStart(2, '0')}`, 'course-number'), element('h2', title), element('p', desc));
  const bottom = element('div', undefined, 'course-footer');
  bottom.append(element('span', `${count}个候选单元 · ${title === '查找' ? '二分内容可接入' : '全部 planned'}`));
  const link = element('a', title === '查找' ? '进入二分 →' : '查看规划 →'); link.href = title === '查找' ? '#workbench' : '../product/coverage-plan.md'; bottom.append(link); card.append(bottom); $('catalog-grid').append(card);
});

function inputChanged() { stop(); ++requestSerial; $('create-run').disabled = false; $('input-message').textContent = '输入已修改，创建新运行后生效；当前面板仍是旧运行。'; }
$('array-input').addEventListener('input', inputChanged); $('target-input').addEventListener('input', inputChanged);
const presets = { standard: ['[1,3,5,7,9]', '7'], empty: ['[]', '7'], duplicates: ['[1,3,3,3,9]', '3'], missing: ['[1,3,5,7,9]', '4'], invalid: ['[9,3,5]', '7'] };
for (const b of document.querySelectorAll('[data-preset]')) b.addEventListener('click', () => { [$('array-input').value, $('target-input').value] = presets[b.dataset.preset]; inputChanged(); });
function parseInput() {
  let array; try { array = JSON.parse($('array-input').value); } catch { throw new Error('数组请用 JSON 格式，例如 [1,3,5]。'); }
  if (!Array.isArray(array) || array.length > 100 || !array.every(Number.isSafeInteger)) throw new Error('数组须为最多100项的安全整数数组，允许 []。');
  if (array.some((x, i) => i > 0 && x < array[i - 1])) throw new Error('数组必须非递减；请修改输入，系统不会自动排序。');
  const raw = $('target-input').value.trim();
  if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error('目标须为安全整数。');
  return { array, target: Number(raw) };
}
async function createRun(event) {
  event?.preventDefault(); stop(); const ticket = ++requestSerial; $('input-message').className = '';
  let data; try { data = parseInput(); } catch (error) { $('input-message').textContent = error.message; $('input-message').className = 'error'; return; }
  $('create-run').disabled = true; $('input-message').textContent = '正在创建演示运行…';
  await new Promise(resolve => setTimeout(resolve, 450));
  if (ticket !== requestSerial) return;
  $('create-run').disabled = false;
  if ($('request-fail').checked) { $('input-message').textContent = '请求失败（原型模拟）。取消勾选后可重试，旧运行未被替换。'; $('input-message').className = 'error'; return; }
  run = { runId: `prototype-${++serial}`, createdAt: Date.now(), algorithm: 'binary-search', ...generateSteps(data.array, data.target) };
  index = 0; $('input-message').textContent = '演示运行已创建。修改输入需重新创建；无业务API请求。'; renderStep();
}
$('run-form').addEventListener('submit', createRun);
const eventText = { init: '初始化闭区间，mid 尚未计算。', probe: '计算中点，观察目标与中点元素的关系。', 'move-left': '目标更大：left = mid + 1，下一轮重新计算 mid。', 'move-right': '目标更小：right = mid - 1，下一轮重新计算 mid。', found: '找到目标：返回实际命中下标，不保证是首个或末个。', 'not-found': '候选区间为空：未找到，返回 -1。' };
function renderStep() {
  if (!run) return;
  const step = run.steps[index], { left, right, mid } = step.variables;
  $('array-stage').replaceChildren();
  if (!step.array.length) $('array-stage').append(element('p', '空数组：没有可访问元素。'));
  step.array.forEach((value, i) => {
    const cell = element('div', undefined, 'cell' + (i >= left && i <= right ? ' in-range' : '') + (i === mid ? ' is-mid' : ''));
    cell.append(element('span', [i === left ? 'L' : '', i === mid ? 'M' : '', i === right ? 'R' : ''].filter(Boolean).join(' / '), 'pointer'), element('div', String(value), 'value'), element('small', `[${i}]`)); $('array-stage').append(cell);
  });
  $('step-label').textContent = `步骤 ${index} / ${run.steps.length - 1} · ${step.event}`;
  $('step-description').textContent = eventText[step.event] + (step.done ? ` 结果：${step.result}` : '');
  $('variables').replaceChildren(...Object.entries(step.variables).map(([key, value]) => { const box = element('div', key, 'variable'); box.append(element('b', value === null ? '未计算' : String(value))); return box; }));
  $('code-lines').replaceChildren(...run.sourceLines.map((line, i) => { const row = element('span', undefined, 'code-line' + (line.lineId === step.lineId ? ' active' : '')); row.append(element('span', String(i + 1).padStart(2, '0'), 'line-number'), document.createTextNode(line.text)); row.dataset.lineId = line.lineId; return row; }));
  $('run-context').textContent = `本地演示 ${run.runId} / stepIndex=${index} / sourceVersion=${step.sourceVersion} / lineId=${step.lineId} / target=${step.target}`;
  $('question-context').textContent = `当前提问上下文 ${run.runId} · 第${index}步`;
  $('previous').disabled = index === 0; $('next').disabled = index === run.steps.length - 1;
  if (step.done) stop();
}
$('previous').onclick = () => { stop(); if (index > 0) --index; renderStep(); };
$('next').onclick = () => { stop(); if (run && index < run.steps.length - 1) ++index; renderStep(); };
$('reset').onclick = () => { stop(); index = 0; renderStep(); };
$('play').onclick = () => { if (!run) return; if (timer) { stop(); return; } if (index === run.steps.length - 1) index = 0; renderStep(); $('play').textContent = '暂停'; timer = setInterval(() => { if (index < run.steps.length - 1) ++index; renderStep(); }, Number($('speed').value)); };
$('speed').onchange = stop;
$('ask').onclick = () => {
  if (!run || !$('question').value.trim()) { $('agent-answer').textContent = '请先创建运行，并填写问题。'; return; }
  $('agent-answer').textContent = `提问上下文：${run.runId} / stepIndex=${index}。MODEL_NOT_CONFIGURED（503）为当前后端占位状态；本原型未发请求，未生成模型回答。可阅读 bs-k02/bs-k03 自编知识卡，或继续做固定过程题。`;
};

try {
  const response = await fetch('../../content/knowledge/cards.json'); if (!response.ok) throw new Error('load failed'); const cards = await response.json();
  for (const card of cards) {
    const panel = element('article', undefined, 'panel'); panel.append(element('span', `${card.id} · ${card.sourceType}`, 'tag'), element('h2', card.title), element('p', card.content), element('small', `${card.sourceId} · v${card.version} · chapter/pages=null · 自编规则检查通过，非教材核验`)); $('knowledge-grid').append(panel);
  }
} catch { $('knowledge-grid').append(element('p', '知识卡加载失败。请通过 README 中的预览服务打开。')); }

function persist() { try { localStorage.setItem(storeKey, JSON.stringify(records)); $('storage-status').textContent = '演示记录已保存到当前浏览器。'; } catch { $('storage-status').textContent = '本机存储不可用；本次记录仅在内存中，刷新将丢失。'; } }
$('exercise-form').onsubmit = event => {
  event.preventDefault(); const text = $('exercise-answer').value.trim(), answer = Number(text), level = Number($('hint-level').value);
  if (!/^-?\d+$/.test(text) || !Number.isSafeInteger(answer)) { $('exercise-feedback').textContent = '请输入安全整数下标。'; return; }
  const correct = answer === 3;
  $('exercise-feedback').textContent = correct ? '正确：中点下标为3。演示结果已记录。' : ['先看题目问下标还是元素值。', '使用 left + floor((right-left)/2)。', '正确答案3：3 + floor((4-3)/2) = 3，不是该位置的值7。'][level - 1];
  records.unshift({ exerciseId: 'bs-q01', exerciseVersion: '1.0.0', answer, correct, hintLevel: level, answeredAt: new Date().toISOString(), contextSnapshot: { array: [1,3,5,7,9], target: 7, left: 3, right: 4, mid: null, event: 'before-probe' } }); records = records.slice(0, 100); persist();
};
function renderRecords() {
  const selected = records.filter(record => !$('wrong-only').checked || !record.correct); $('record-list').replaceChildren();
  if (!selected.length) { const empty = element('div', undefined, 'panel empty'); empty.append(element('h2', $('wrong-only').checked ? '暂时没有演示错题' : '还没有演示记录'), element('p', '完成一道过程题，从一次小小的预测开始。')); const link = element('a', '去做过程题 →', 'button primary'); link.href = '#practice'; empty.append(link); $('record-list').append(empty); return; }
  selected.forEach(record => { const panel = element('article', undefined, 'panel record'); const detail = element('div'); detail.append(element('h2', `${record.exerciseId} · v${record.exerciseVersion} · ${record.correct ? '正确' : '错题'}`), element('p', `作答 ${record.answer} · 提示等级 ${record.hintLevel} · ${new Date(record.answeredAt).toLocaleString('zh-CN')}`), element('p', '独立题目情境：[1,3,5,7,9]，target=7，left=3，right=4；非实时run。', 'muted')); const link = element('a', '再次练习 →'); link.href = '#practice'; panel.append(detail, link); $('record-list').append(panel); });
}
$('wrong-only').onchange = renderRecords;
$('clear-records').onclick = () => { if (confirm('仅清除当前浏览器的09原型演示记录？此操作不影响生产记录。')) { records = []; persist(); renderRecords(); } };
route(); await createRun();
