// shared/algorithms/binarySearch.js
// 二分查找执行引擎（04主责）

const SOURCE_VERSION = 'c-v1';

// C展示代码
const SOURCE_LINES = [
  { lineId: 'init-left', text: 'int left = 0;' },
  { lineId: 'init-right', text: 'int right = n - 1;' },
  { lineId: 'loop-check', text: 'while (left <= right) {' },
  { lineId: 'calc-mid', text: '  int mid = left + (right - left) / 2;' },
  { lineId: 'probe-match', text: '  if (arr[mid] == target) {' },
  { lineId: 'found', text: '    return mid;' },
  { lineId: 'probe-less', text: '  } else if (arr[mid] < target) {' },
  { lineId: 'update-left', text: '    left = mid + 1;' },
  { lineId: 'update-right', text: '  } else {' },
  { lineId: 'update-right-code', text: '    right = mid - 1;' },
  { lineId: 'not-found', text: 'return -1;' }
];

function createStep(stepIndex, event, array, target, left, right, mid, lineId, done = false, result = null) {
  return {
    schemaVersion: 'v1',
    algorithm: 'binary-search',
    stepIndex,
    event,
    sourceVersion: SOURCE_VERSION,
    lineId,
    array: [...array],
    target,
    variables: { left, right, mid },
    done,
    result,
  };
}

function generateSteps(array, target) {
  const steps = [];
  let stepIndex = 0;
  
  // 1. 初始化
  let left = 0;
  let right = array.length - 1;
  let mid = null;
  
  steps.push(createStep(stepIndex++, 'init', array, target, left, right, mid, 'init-left'));

  // 处理空数组
  if (array.length === 0) {
    steps.push(createStep(stepIndex++, 'not-found', array, target, left, right, mid, 'not-found', true, -1));
    return { steps, result: -1, sourceVersion: SOURCE_VERSION, sourceLines: SOURCE_LINES };
  }

  // 2. 循环
  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    
    // Probe 阶段
    steps.push(createStep(stepIndex++, 'probe', array, target, left, right, mid, 'calc-mid'));

    if (array[mid] === target) {
      steps.push(createStep(stepIndex++, 'found', array, target, left, right, mid, 'found', true, mid));
      return { steps, result: mid, sourceVersion: SOURCE_VERSION, sourceLines: SOURCE_LINES };
    } else if (array[mid] < target) {
      left = mid + 1;
      // 边界更新阶段（mid 置为 null）
      steps.push(createStep(stepIndex++, 'move-left', array, target, left, right, null, 'update-left'));
    } else {
      right = mid - 1;
      // 边界更新阶段（mid 置为 null）
      steps.push(createStep(stepIndex++, 'move-right', array, target, left, right, null, 'update-right-code'));
    }
  }

  // 3. 未找到
  steps.push(createStep(stepIndex++, 'not-found', array, target, left, right, mid, 'not-found', true, -1));
  return { steps, result: -1, sourceVersion: SOURCE_VERSION, sourceLines: SOURCE_LINES };
}

export { generateSteps, SOURCE_VERSION, SOURCE_LINES };