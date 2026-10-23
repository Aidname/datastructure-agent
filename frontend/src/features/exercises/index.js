import { requestJSON } from '../../services/api.js';
import { createRecordStore, STORAGE_KEY } from '../records/store.js';
import { createRecordsPanel } from '../records/panel.js';
import { publicQuestion, parseAnswer, gradeFeedback, answerText, contextText, exerciseText } from './model.js';

export function createExercises(container, { onBeforeAnswer = () => {}, store = createRecordStore(), recordsContainer = null, onPracticeRequested = () => {} } = {}) {
  container.innerHTML = `<div class="learning-layout"><div class="exercise-practice"><h3>过程练习</h3>
    <p class="learning-note">以下为固定题目，使用题目自己的数组与边界；可独立作答，不会调用模型。</p>
    <p id="exercise-load-status" role="status">正在读取题库…</p><button id="reload-exercises" class="secondary" type="button">刷新题库</button>
    <form id="exercise-form"><label for="exercise-select">选择题目<select id="exercise-select" disabled></select></label>
    <p id="exercise-version" class="learning-note"></p><h4 id="exercise-prompt"></h4><p id="exercise-scenario" class="exercise-scenario"></p>
    <fieldset id="exercise-answer" disabled><legend>你的答案</legend></fieldset><div class="exercise-actions"><button id="submit-exercise" type="submit" disabled>提交答案</button><button id="next-hint-btn" class="secondary" type="button" disabled>提示 2：理解规则</button></div></form>
    <p id="exercise-status" role="status" aria-live="polite"></p><div id="exercise-feedback" aria-live="polite"></div></div>${recordsContainer ? '' : '<div id="records-mount"></div>'}</div>`;
  const $ = id => container.querySelector('#' + id);
  const lifetime = new AbortController(); let catalog = [], selected = null, context = null, attempt = null;
  let controller = null, loadController = null, generation = 0, loadGeneration = 0, busy = false, alive = true;
  const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: lifetime.signal });
  const records = createRecordsPanel(recordsContainer || $('records-mount'), { store, onRetry(id, old) {
    $('exercise-select').value = id; selectQuestion();
    if (old) $('exercise-status').textContent = '已载入当前版本；旧版本作答仅作回顾。';
    onPracticeRequested(); $('exercise-select').focus();
  }, onClear() { cancel('作答记录已清除；需要提示时请重新提交答案。'); } });

  function controls() {
    $('exercise-answer').disabled = busy || !selected;
    $('submit-exercise').disabled = busy || !selected;
    $('submit-exercise').textContent = busy ? '正在判分…' : '提交答案';
    const level = attempt?.level || 1;
    $('next-hint-btn').disabled = busy || !attempt || attempt.correct || level >= 3;
    $('next-hint-btn').textContent = level >= 2 ? '提示 3：查看完整解析' : '提示 2：理解规则';
    $('exercise-form').setAttribute('aria-busy', String(busy));
  }
  function cancel(message = '') {
    generation++; controller?.abort(); controller = null; busy = false; attempt = null;
    $('exercise-feedback').replaceChildren(); $('exercise-status').textContent = message; controls();
  }
  function append(tag, text, parent = $('exercise-feedback')) { const node = document.createElement(tag); node.textContent = text; parent.append(node); return node; }
  function selectQuestion() {
    cancel(); selected = catalog.find(question => question.id === $('exercise-select').value) || null;
    const field = $('exercise-answer'); field.replaceChildren(); append('legend', '你的答案', field);
    if (!selected) { $('exercise-prompt').textContent = ''; $('exercise-scenario').textContent = ''; $('exercise-version').textContent = ''; controls(); return; }
    $('exercise-prompt').textContent = exerciseText(selected.prompt); $('exercise-scenario').textContent = contextText(selected.context);
    $('exercise-version').textContent = `题目 ${selected.id} · 版本 ${selected.version} · 固定题目情境`;
    if (selected.type === 'value') {
      const label = append('label', '整数答案', field); label.htmlFor = 'exercise-value';
      const input = document.createElement('input'); input.id = 'exercise-value'; input.name = 'answer'; input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off'; label.append(input);
    } else {
      const options = selected.type === 'judgement' ? [{ id: 'true', text: '正确' }, { id: 'false', text: '错误' }] : selected.options;
      for (const option of options) {
        const label = document.createElement('label'); label.className = 'exercise-option';
        const input = document.createElement('input'); input.type = 'radio'; input.name = 'answer'; input.value = option.id;
        label.append(input, document.createTextNode((selected.type === 'choice' ? option.id + ' · ' : '') + exerciseText(option.text))); field.append(label);
      }
    }
    controls();
  }
  async function load() {
    const ticket = ++loadGeneration; loadController?.abort(); loadController = new AbortController();
    cancel(); selected = null; catalog = []; records.setCatalog(catalog); controls(); $('exercise-select').disabled = true;
    $('exercise-prompt').textContent = ''; $('exercise-scenario').textContent = ''; $('exercise-version').textContent = '';
    $('exercise-answer').replaceChildren(); $('exercise-select').replaceChildren(); $('exercise-load-status').textContent = '正在读取题库…';
    try {
      const data = await requestJSON('/api/exercises?topicId=binary-search', { signal: loadController.signal });
      if (!alive || ticket !== loadGeneration) return;
      if (!Array.isArray(data.exercises)) throw new Error('题库响应格式不正确。');
      catalog = data.exercises.filter(question => question.topicId === 'binary-search').map(publicQuestion);
      if (new Set(catalog.map(q => q.id)).size !== catalog.length) throw new Error('题库包含重复题号。');
      for (const [i, question] of catalog.entries()) { const option = document.createElement('option'); option.value = question.id; option.textContent = `${i + 1}. ${exerciseText(question.prompt)}`; $('exercise-select').append(option); }
      $('exercise-select').disabled = !catalog.length; records.setCatalog(catalog); selectQuestion();
      $('exercise-load-status').textContent = catalog.length ? `已读取 ${catalog.length} 道题。答错后依次获得观察、规则与完整解析。` : '当前主题暂无题目。';
    } catch (error) {
      if (!alive || ticket !== loadGeneration || error.name === 'AbortError') return;
      catalog = []; selected = null; records.setCatalog(catalog); controls(); $('exercise-load-status').textContent = `题库读取失败：${error.message} 可点击刷新重试。`;
    }
  }
  function showFeedback(result, level, question, origin) {
    $('exercise-feedback').replaceChildren();
    append('p', origin ? `本次作答附带工作台第 ${origin.stepIndex + 1} 步的关联；判分使用上方固定题目情境。` : '本次为独立练习，判分使用上方固定题目情境。').className = 'learning-note';
    if (result.correct) append('p', '回答正确。').className = 'exercise-correct';
    else {
      append('p', '回答不正确。').className = 'exercise-incorrect';
      if (level < 3) append('p', `提示 ${level}：${exerciseText(result.hint)}`);
      else { append('p', `参考答案：${answerText(question, result.correctAnswer)}`); append('p', exerciseText(result.explanation)); }
    }
  }
  async function submit(level) {
    if (busy || !selected) return;
    let answer;
    try { answer = level === 1 ? parseAnswer(selected, selected.type === 'value' ? $('exercise-value').value : container.querySelector('input[name="answer"]:checked')?.value) : attempt?.answer; }
    catch (error) { $('exercise-status').textContent = error.message; return; }
    if (level > 1 && (!attempt || attempt.correct || level !== attempt.level + 1)) return;
    onBeforeAnswer();
    const question = selected, previous = attempt, ticket = ++generation;
    const origin = context ? { runId: context.runId, stepIndex: context.stepIndex, sourceVersion: context.sourceVersion } : null;
    controller = new AbortController(); busy = true; controls(); $('exercise-status').textContent = '正在提交给程序判分…';
    try {
      const data = await requestJSON('/api/exercises/check', { signal: controller.signal, body: { exerciseId: question.id, exerciseVersion: question.version, answer, hintLevel: level } });
      if (!alive || ticket !== generation) return;
      const result = gradeFeedback(data, level);
      if (level > 1 && result.correct) throw new Error('判分结果与上次不一致，请刷新题库后重新作答。');
      const linked = level > 1 ? previous.origin : origin;
      showFeedback(result, level, question, linked);
      if (level === 1) {
        const saved = store.addAttempt({ question, answer, correct: result.correct, feedback: result, origin: linked });
        attempt = { id: saved.id, answer, correct: result.correct, level: 1, origin: linked };
      } else {
        if (!store.addHint(previous.id, level, result)) { attempt = null; throw new Error('原作答记录已被清除，请重新提交答案。'); }
        attempt = { ...previous, level };
      }
      $('exercise-status').textContent = result.correct ? '已完成程序判分，结果已加入本机学习记录。' : level < 3 ? '可以修改答案重试，或继续查看下一级提示。' : '已展示完整解析，可重新作答或选择下一题。';
    } catch (error) {
      if (!alive || ticket !== generation || error.name === 'AbortError') return;
      $('exercise-status').textContent = `提交失败：${error.message}`;
    } finally { if (alive && ticket === generation) { busy = false; controller = null; controls(); } }
  }
  listen($('exercise-form'), 'submit', event => { event.preventDefault(); submit(1); });
  listen($('next-hint-btn'), 'click', () => { if (attempt) submit(attempt.level + 1); });
  listen($('exercise-select'), 'change', selectQuestion); listen($('reload-exercises'), 'click', load);
  listen($('exercise-answer'), 'input', () => { if (attempt) cancel('答案已修改，请重新提交。'); });
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) { cancel('本机记录已在其他页面更新，请重新提交答案。'); store.reload(); } }, { signal: lifetime.signal });
  load();
  return { setContext(next) {
    const changed = (context?.runId ?? null) !== (next?.runId ?? null);
    context = next;
    if (changed) cancel('工作台运行已更改。练习仍使用题目自己的固定情境；请重新提交答案。');
  }, destroy() { alive = false; generation++; loadGeneration++; controller?.abort(); loadController?.abort(); lifetime.abort(); records.destroy(); container.replaceChildren(); } };
}
