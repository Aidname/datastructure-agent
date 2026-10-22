import { publicQuestion, parseAnswer, gradeFeedback } from '../exercises/model.js';
export const STORAGE_KEY = 'datastructure-agent:learning:v1';
export const MAX_RECORDS = 200;
const clone = value => JSON.parse(JSON.stringify(value));

function validAttempt(record) {
  try {
    publicQuestion(record.question);
    const parsed = parseAnswer(record.question, String(record.answer));
    if (parsed !== record.answer) return false;
    if (!record.correct && (!record.hintsUsed.length || record.hintsUsed.some((level, i) => level !== i + 1))) return false;
    if (record.correct && record.hintsUsed.length) return false;
    for (const level of record.hintsUsed) if (gradeFeedback(record.feedbackByLevel[level], level).correct) return false;
  } catch { return false; }
  return record && typeof record.id === 'string' && record.id &&
    Number.isFinite(Date.parse(record.createdAt)) && Number.isFinite(Date.parse(record.updatedAt)) &&
    record.question && ['id', 'version', 'topicId', 'prompt'].every(key => typeof record.question[key] === 'string') &&
    ['value', 'choice', 'judgement'].includes(record.question.type) && Array.isArray(record.question.options) &&
    record.question.context && Array.isArray(record.question.context.array) &&
    ['string', 'boolean', 'number'].includes(typeof record.answer) && typeof record.correct === 'boolean' &&
    Array.isArray(record.hintsUsed) && record.hintsUsed.every(level => [1, 2, 3].includes(level)) &&
    new Set(record.hintsUsed).size === record.hintsUsed.length &&
    record.feedbackByLevel && typeof record.feedbackByLevel === 'object' &&
    (record.origin === null || (typeof record.origin?.runId === 'string' && Number.isSafeInteger(record.origin.stepIndex) && record.origin.stepIndex >= 0));
}

export function createRecordStore(options = {}) {
  let storage = null, memory = [], warning = '', protectedData = false, dirty = false;
  const listeners = new Set();
  const now = options.now || (() => new Date().toISOString());
  const newId = options.newId || (() => globalThis.crypto.randomUUID());
  try {
    storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage;
    if (!storage) throw new Error('STORAGE_DISABLED');
  } catch { warning = '无法访问本机存储，本次记录仅在当前页面有效，刷新后会丢失。'; }

  function diskRecords() {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return [];
    if (text.length > 2000000) throw new Error('INVALID_RECORDS');
    const data = JSON.parse(text);
    if (data?.schemaVersion !== 1 || !Array.isArray(data.attempts) || data.attempts.length > MAX_RECORDS || !data.attempts.every(validAttempt)) throw new Error('INVALID_RECORDS');
    return data.attempts;
  }
  function reload() {
    if (!storage) return;
    try { memory = diskRecords(); protectedData = false; dirty = false; warning = ''; }
    catch { protectedData = true; warning = '本机记录无法读取或格式已损坏，原数据未覆盖；新记录仅保留在本页，可清除后重新开始。'; }
  }
  reload();
  function emit() { for (const listener of listeners) listener(); }
  function prepare() {
    if (!storage || protectedData) return;
    try {
      const disk = diskRecords();
      memory = dirty ? [...new Map([...disk, ...memory].map(item => [item.id, item])).values()] : disk;
    } catch { protectedData = true; warning = '本机记录无法读取，原数据未覆盖；本次记录仅在当前页面有效。'; }
  }
  function persist() {
    memory = memory.slice(-MAX_RECORDS);
    if (storage && !protectedData) {
      try { storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, attempts: memory })); warning = ''; dirty = false; }
      catch { dirty = true; warning = '本机存储写入失败，可能空间不足；最新记录仅在本页有效，刷新可能丢失。'; }
    }
    emit();
  }
  function addAttempt({ question, answer, correct, feedback, origin = null }) {
    prepare();
    const stamp = now();
    const attempt = clone({ id: newId(), createdAt: stamp, updatedAt: stamp, question, answer, correct, origin,
      hintsUsed: correct ? [] : [1], feedbackByLevel: correct ? {} : { 1: feedback } });
    if (!validAttempt(attempt)) throw new Error('作答记录格式无效。');
    memory.push(attempt); persist(); return clone(attempt);
  }
  function addHint(id, level, feedback) {
    prepare(); const record = memory.find(item => item.id === id);
    if (!record) return false;
    if (record.correct || ![2, 3].includes(level) || level > Math.max(...record.hintsUsed) + 1) throw new Error('提示必须依次使用。');
    if (!record.hintsUsed.includes(level)) record.hintsUsed.push(level);
    record.feedbackByLevel[level] = clone(feedback); record.updatedAt = now(); persist(); return true;
  }
  function clear() {
    memory = []; dirty = false;
    try {
      if (!storage) throw new Error('STORAGE_DISABLED');
      storage.removeItem(STORAGE_KEY); protectedData = false; warning = '';
    } catch { warning = '本页记录已清空，但无法删除浏览器中的记录；请恢复存储权限后再次清除。'; }
    emit();
  }
  return {
    list: () => clone(memory), status: () => ({ warning, persistent: Boolean(storage) && !protectedData && !dirty }),
    addAttempt, addHint, clear, reload() { reload(); emit(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}

export function learningSummary(records, catalog) {
  const current = records.filter(record => catalog.some(q => q.id === record.question.id && q.version === record.question.version));
  const key = record => `${record.question.id}@${record.question.version}`;
  return { total: catalog.length, attempted: new Set(current.map(key)).size,
    solved: [...new Map(current.map(r => [key(r), r])).values()].filter(r => r.correct).length,
    wrongAttempts: records.filter(r => !r.correct).length, attempts: records.length };
}
