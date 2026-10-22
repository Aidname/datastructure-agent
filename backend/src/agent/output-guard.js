const MAX_ANSWER_LENGTH = 2000;

export function guardOutput(answer) {
  if (!answer || typeof answer !== 'string') {
    return { valid: false, reason: '输出为空' };
  }

  if (answer.length > MAX_ANSWER_LENGTH) {
    return {
      valid: false,
      reason: '输出超过最大长度限制',
      truncated: answer.slice(0, MAX_ANSWER_LENGTH) + '...'
    };
  }

  return { valid: true };
}
