const MAX_ANSWER_LENGTH = 2000;

export function guardOutput(answer) {
  if (typeof answer !== 'string' || !answer.trim()) return { valid: false, reason: '输出为空' };
  if (answer.length > MAX_ANSWER_LENGTH) return { valid: false, reason: '输出过长', truncated: answer.slice(0, MAX_ANSWER_LENGTH) + '…（内容已截断）' };
  return { valid: true };
}
