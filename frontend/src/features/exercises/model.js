export function publicQuestion(raw) {
  if (!raw || !['value', 'choice', 'judgement'].includes(raw.type) ||
      ['id', 'version', 'topicId', 'prompt'].some(key => typeof raw[key] !== 'string' || !raw[key].trim()) ||
      !raw.context || !Array.isArray(raw.context.array) || raw.context.array.length > 100 ||
      !raw.context.array.every(Number.isSafeInteger) || !Number.isSafeInteger(raw.context.target) ||
      !Number.isSafeInteger(raw.context.left) || !Number.isSafeInteger(raw.context.right) ||
      !(raw.context.mid === null || Number.isSafeInteger(raw.context.mid)) || !Array.isArray(raw.options)) throw new Error('题目数据不完整，请刷新题库。');
  const options = raw.options.map(option => {
    if (!option || typeof option.id !== 'string' || !option.id.trim() || typeof option.text !== 'string') throw new Error('题目选项格式不正确。');
    return { id: option.id, text: option.text };
  });
  if (raw.type === 'choice' && (!options.length || new Set(options.map(o => o.id)).size !== options.length)) throw new Error('题目选项缺失或重复。');
  // Deliberate whitelist: even an erroneous API response cannot preload answers/hints.
  return { id: raw.id, version: raw.version, topicId: raw.topicId, type: raw.type,
    prompt: raw.prompt, context: JSON.parse(JSON.stringify(raw.context)), options };
}

export function parseAnswer(question, raw) {
  if (question.type === 'value') {
    const text = String(raw ?? '').trim();
    if (!/^[+-]?\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error('请输入十进制安全整数答案。');
    return Number(text);
  }
  if (question.type === 'judgement') {
    if (raw !== 'true' && raw !== 'false') throw new Error('请选择“正确”或“错误”。');
    return raw === 'true';
  }
  if (!question.options.some(option => option.id === raw)) throw new Error('请选择一个选项。');
  return raw;
}

export function gradeFeedback(data, level) {
  if (!data || typeof data.correct !== 'boolean') throw new Error('判分响应不完整，请重新提交。');
  if (data.correct) return { correct: true };
  if (level < 3) {
    if (typeof data.hint !== 'string' || !data.hint.trim()) throw new Error('提示响应不完整，请重新提交。');
    return { correct: false, hint: data.hint };
  }
  if (!Object.hasOwn(data, 'correctAnswer') || !['number', 'string', 'boolean'].includes(typeof data.correctAnswer) || typeof data.explanation !== 'string') throw new Error('解析响应不完整，请重新提交。');
  return { correct: false, correctAnswer: data.correctAnswer, explanation: data.explanation };
}

export function answerText(question, answer) {
  if (question.type === 'judgement') return answer ? '正确' : '错误';
  if (question.type === 'choice') {
    const option = question.options.find(item => item.id === answer);
    return option ? `${option.id} · ${option.text}` : String(answer);
  }
  return String(answer);
}

export function contextText(context) {
  return `数组 [${context.array.join(', ')}]，目标 ${context.target}；题目情境 ${context.event || '未标注'}，left=${context.left}，right=${context.right}，mid=${context.mid == null ? '未计算' : context.mid}。`;
}
