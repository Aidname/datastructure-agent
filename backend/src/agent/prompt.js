export function buildPrompt(run, step, level, question) {
  const arr = Array.isArray(step.array) ? step.array : [];
  const target = step.target;
  const left = step.variables?.left;
  const right = step.variables?.right;
  const mid = step.variables?.mid;
  const ev = step.event;
  const stepNo = step.stepIndex ?? 0;

  const levelDesc = level === 1 ? '基础信息（只说当前状态，不直接给答案）' :
                    level === 2 ? '详细分析（含推理过程，引导学生思考）' :
                    '完整推理链（含下一步预测，但仍不直接给最终答案）';

  const userContent = `你是二分查找辅导助手。学生正在学习二分查找算法。

当前步骤信息：
- 数组: [${arr.join(', ')}]
- 目标值: ${target}
- 事件: ${ev}
- 区间: [${left}, ${right}]
- mid: ${mid}
- 步骤序号: ${stepNo + 1}

提示级别要求：${levelDesc}

${question ? `学生追问：${question}` : '请基于当前步骤给出辅导提示。'}

要求：
1. 用中文回答
2. 引导学生思考，不要直接给答案
3. 结合当前步骤的事件和区间状态
4. 回答简洁清晰，适合学生理解`;

  return [
    { role: 'system', content: '你是算法教学助手，擅长用引导式提问帮助学生理解二分查找。绝不直接给出"答案是X"这样的回复。' },
    { role: 'user', content: userContent }
  ];
}
