const MAX_ANSWER_LENGTH = 2000;

export function guardOutput(answer) {
  if (!answer || typeof answer !== 'string') {
    return { valid: false, reason: '输出为空' };
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return {
      valid: false,
      reason: `输出超过最大长度限制（${MAX_ANSWER_LENGTH} 字符）`,
      truncated: answer.slice(0, MAX_ANSWER_LENGTH) + '…（内容已截断）'
    };
  }
  return { valid: true };
}

export function verifyOutput(answer, card) {
  if (!answer || !card) return { pass: true };
  const violations = [];
  const content = answer;
  if (/left\s*=\s*right.*查找.*结束/.test(content) && /left=right.*不.*结束/.test(card.content)) {
    violations.push('表述与知识卡矛盾：left=right 时区间内仍有一个元素，并未结束');
  }
  if (/直接给.*答案|答案是\s*[\[\(]?\d+[\]\)]?|结果就是\s*\d+/.test(content)) {
    violations.push('输出直接给出了答案，应以引导式提问代替');
  }
  if (violations.length > 0) {
    return {
      pass: false,
      violations,
      suggestion: `请对照知识卡“${card.title}”的规则，先观察当前真实步骤，再判断下一步操作。`
    };
  }
  return { pass: true };
}
