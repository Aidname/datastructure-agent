export function buildPrompt(run, step, level, question, card) {
  const arr = Array.isArray(step.array) ? step.array : [];
  const target = step.target;
  const left = step.variables?.left;
  const right = step.variables?.right;
  const mid = step.variables?.mid;
  const ev = step.event;
  const stepNo = step.stepIndex ?? 0;

  const levelDesc = level === 1
    ? '基础信息：只陈述当前步骤的客观状态（区间、mid、比较值），不直接给下一步结论'
    : level === 2
      ? '详细分析：解释这一步为什么这样更新，引导学生自己推理'
      : '完整推理链：给出推理过程并对下一步做出预测，但仍不直接给出最终答案';

  const cardBlock = card ? `
【本轮必须依据的知识卡】
- 卡片ID：${card.id}（已核验，版本 ${card.version}）
- 标题：${card.title}
- 内容：${card.content}
- 来源：${card.sourceId}
请以上述卡片内容为准进行讲解。若卡片内容与你的常识有出入，以卡片为准。
` : '【本轮无可用知识卡，仅基于步骤客观数据回答，并明确说明依据是步骤快照而非外部资料】';

  const userContent = `你是二分查找辅导助手。学生正在学习二分查找算法。

【当前步骤客观数据】
- 数组: [${arr.join(', ')}]
- 目标值: ${target}
- 事件: ${ev}
- 闭区间: [${left}, ${right}]
- mid: ${mid}
- A[mid] 的值: ${typeof mid === 'number' && arr.length > mid ? arr[mid] : '（不可访问，区间可能为空）'}
- 步骤序号（从1开始）: ${stepNo + 1}

【提示级别要求】${levelDesc}

【学生问题】${question}
${cardBlock}

要求：
1. 用中文回答，语气像辅导老师
2. 严格以上述知识卡内容为准，不要引入卡片之外的结论
3. 引导学生思考，不要直接说"答案是X"
4. 回答简洁清晰，适合学生理解
5. 如果学生问题与当前步骤无关，请礼貌提醒并引导回算法话题`;

  return [
    { role: 'system', content: '你是算法教学助手，擅长用引导式提问帮助学生理解二分查找。绝不直接给出"答案是X"这样的回复。所有讲解必须基于提供的知识卡内容。' },
    { role: 'user', content: userContent }
  ];
}
