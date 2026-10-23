// Conservative fallback for colloquial questions referring to the displayed run.
// This supplies context; it does not claim a semantic knowledge-search match.
export function refersToRun(question, run, step) {
  const text = question.normalize('NFKC').replace(/[−–]/g,'-').trim();
  if (!/(为什么|为啥|为何|怎么|怎样|什么意思|什么区别|是不是)/.test(text)) return false;
  const numbers = (text.match(/-?\d+/g) || []).map(Number);
  const known = new Set([...(step.array || []), step.target, run.result,
    ...Object.values(step.variables || {}), ...Array.from({length:step.array?.length || 0},(_,i)=>i)]
    .filter(Number.isSafeInteger));
  if (numbers.length) {
    if (!numbers.some(number=>known.has(number))) return false;
    // Keep unrelated nouns out of this fallback, even if they mention the same numbers.
    const rest = text.replace(/-?\d+/g,'').replace(/为什么|为啥|为何|怎么|怎样|是不是|什么区别|什么意思|应该|直接|一下|突然|选择|选中|跳过|变成|开始|结束|而不是|而非|不是|没有|不用|不能|不等于|等于|到了|还是|而|却|就|只|又|还|要|能|是|不|没|了|的|呢|吗|呀|这|那|里|个|下|它|到|从|去|往|向|走|移|变|跳|停|过|选|看|找|比|大|小|[\s，,。！？?!：:、]/gu,'');
    return rest === '';
  }
  return /^(这|那|这里|那里|这个|那个|它)(是|到底是|又是)?(什么意思|怎么来的|为什么这样|为什么这样做)[呢吗？?\s]*$/.test(text);
}
