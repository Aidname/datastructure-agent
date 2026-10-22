function integer(text, label) {
  if (!/^[+-]?\d+$/.test(text) || !Number.isSafeInteger(Number(text))) throw new Error(`${label}必须为十进制安全整数。`);
  return Number(text);
}
export function parseInput(arrayText, targetText) {
  const targetValue = targetText.trim();
  if (!targetValue) throw new Error('目标不能为空。');
  const target = integer(targetValue, '目标');
  const text = arrayText.trim();
  const values = text ? text.split(/[,，]/).map(value => value.trim()) : [];
  if (values.length > 100) throw new Error('数组最多包含 100 个元素。');
  const array = values.map(value => integer(value, '数组元素'));
  if (array.some((value,i) => i > 0 && value < array[i-1])) throw new Error('数组必须按非递减顺序排列，请勿自动排序或去重。');
  return { array, target };
}

export function validateRun(run) {
  if (!run || typeof run.runId !== 'string' || !run.runId || run.algorithm !== 'binary-search' || typeof run.sourceVersion !== 'string' || !run.sourceVersion ||
      !Array.isArray(run.steps) || !run.steps.length || !Array.isArray(run.sourceLines) || !run.sourceLines.length) throw new Error('运行数据不完整，无法展示步骤。');
  const ids = new Set(run.sourceLines.map(line => line?.lineId));
  if (ids.size !== run.sourceLines.length || run.sourceLines.some(line => typeof line?.lineId !== 'string' || typeof line.text !== 'string') ||
      run.steps.some((step,i) => !step || step.stepIndex !== i || !ids.has(step.lineId) || !Array.isArray(step.array) ||
        !step.variables || !Number.isSafeInteger(step.variables.left) || !Number.isSafeInteger(step.variables.right) ||
        (step.variables.mid !== null && !Number.isSafeInteger(step.variables.mid)))) throw new Error('步骤或源码映射不完整，无法同步展示。');
  return run;
}
