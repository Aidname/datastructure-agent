const MAX_ANSWER_LENGTH = 2000;

export function guardOutput(answer) {
  if (typeof answer !== 'string' || !answer.trim()) return { valid: false, reason: '输出为空' };
  if (answer.length > MAX_ANSWER_LENGTH) return { valid: false, reason: '输出过长', truncated: answer.slice(0, MAX_ANSWER_LENGTH) + '…（内容已截断）' };
  return { valid: true };
}

export function verifyOutput(answer, card) {
  if (!answer || !card) return { pass: true };
  // A narrow contradiction check, not a guarantee of factual correctness.
  // Direct explanations and numeric answers to visible algorithm states are allowed.
  const wrongEquality = answer.split(/[。！？\n]/).some(sentence =>
    /left\s*={1,2}\s*right/.test(sentence) && /查找.{0,5}结束/.test(sentence) &&
    !/(不|未|没|仍|还|并非|不能)/.test(sentence) && !/(找到目标|命中|left\s*>\s*right)/.test(sentence));
  if (card.id === 'bs-k02' && wrongEquality) return { pass: false,
    violations: ['把left=right误说成查找结束'],
    suggestion: 'left 和 right 相等时，区间里还剩一个元素，仍需要检查；只有左边界超过右边界，才表示候选区间已经空了。' };
  return { pass: true };
}
