// 成员05：Agent Mock解释器
// 接收 { runId, stepIndex, question, stepState }
// 返回 { runId, stepIndex, answer, references, usage }

const eventCardMap = {
  'init': 'bs-k01',
  'probe': 'bs-k03',
  'move-left': 'bs-k04',
  'move-right': 'bs-k05',
  'found': 'bs-k08',
  'not-found': 'bs-k06'
};

const cardContents = {
  'bs-k01': '本样例要求数组按非递减顺序排列，二分查找利用有序性排除一半候选区间。',
  'bs-k02': '当前候选范围是闭区间[left,right]，初始化为left=0、right=n-1。',
  'bs-k03': 'mid=left+floor((right-left)/2)，算出的是下标，A[mid]才是中点值。',
  'bs-k04': '当A[mid]<target时，排除[left,mid]，令left=mid+1。',
  'bs-k05': '当A[mid]>target时，排除[mid,right]，令right=mid-1。',
  'bs-k06': '当left>right时区间为空，应结束并返回-1。',
  'bs-k07': '空数组直接结束并返回-1，单元素仍需比较一次。',
  'bs-k08': '本项目采用中点值相等就返回mid的版本，重复值允许返回实际命中的位置。',
  'bs-k09': '最坏时间复杂度O(log n)，最好一次比较命中O(1)。',
  'bs-k10': '初始化及更新边界后mid=null，表示当前轮中点尚未计算。'
};

export async function handleAgentExplain(input) {
  const { runId, stepIndex, question, stepState } = input || {};
  const left = stepState?.left ?? '?';
  const right = stepState?.right ?? '?';
  const mid = stepState?.mid ?? '?';
  const event = stepState?.event ?? 'probe';

  const cardId = eventCardMap[event] || 'bs-k03';
  const cardText = cardContents[cardId] || '';

  const answer = `【Agent辅导】步骤${stepIndex}（${event}）：当前区间[${left},${right}]，mid=${mid}。${cardText} 针对你的问题"${question}"，建议结合当前步骤状态理解。`;

  return {
    runId: runId || 'unknown',
    stepIndex: stepIndex ?? 0,
    answer,
    references: [cardId],
    usage: { model: 'mock', cost: 0 }
  };
}
