const MAX_ANSWER_LENGTH = 2000;

function extractCardFacts(card) {
  if (!card?.content) return [];
  const facts = [];
  const content = card.content;
  if (/闭区间/.test(content) && /left=right.*不.*结束/.test(content)) {
    facts.push({ type: 'interval', claim: 'left=right 时区间内仍有一个元素待查', mustNotContain: ['left等于right时就结束', '只剩一个元素就结束查找'] });
  }
  if (/向下取整/.test(content) || /floor/.test(content)) {
    facts.push({ type: 'mid', claim: 'mid 计算采用向下取整' });
  }
  if (/A\[mid\]<target.*left=mid\+1/.test(content)) {
    facts.push({ type: 'move-left', claim: '中点值偏小时排除[left,mid]，left=mid+1' });
  }
  if (/A\[mid\]>target.*right=mid-1/.test(content)) {
    facts.push({ type: 'move-right', claim: '中点值偏大时排除[mid,right]，right=mid-1' });
  }
  return facts;
}

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
      suggestion: `让我换个方式引导你：当前这一步的区间是 [${extractCardFacts(card).map(f => f.claim).join('；') || '见知识卡'}]. 结合这些信息，你觉得下一步应该更新哪一边？`
    };
  }
  return { pass: true };
}
