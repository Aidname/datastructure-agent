// shared/algorithms/binarySearch.js

const SOURCE_VERSION = 'c-v1';

// 修复7：补全 C 代码括号
const SOURCE_LINES = [
  { lineId: 'init-left', text: 'int left = 0;' },
  { lineId: 'init-right', text: 'int right = n - 1;' },
  { lineId: 'loop-check', text: 'while (left <= right) {' },
  { lineId: 'calc-mid', text: '  int mid = left + (right - left) / 2;' },
  { lineId: 'probe-match', text: '  if (arr[mid] == target) {' },
  { lineId: 'found', text: '    return mid;' },
  { lineId: 'probe-less', text: '  } else if (arr[mid] < target) {' },
  { lineId: 'update-left', text: '    left = mid + 1;' },
  { lineId: 'probe-greater', text: '  } else {' },
  { lineId: 'update-right', text: '    right = mid - 1;' },
  { lineId: 'loop-end', text: '  }' },
  { lineId: 'loop-end-2', text: '}' },
  { lineId: 'not-found', text: 'return -1;' }
];

function createStep(stepIndex, event, array, target, left, right, mid, lineId, done = false, result = null) {
  return {
    schemaVersion: '1.0', // 修复3：符合现有Schema
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
  
  let left = 0;
  let right = array.length - 1;
  let mid = null;
  
  steps.push(createStep(stepIndex++, 'init', array, target, left, right, mid, 'init-left'));

  if (array.length === 0) {
    steps.push(createStep(stepIndex++, 'not-found', array, target, left, right, null, 'not-found', true, -1)); // 修复4
    return { steps, result: -1, sourceVersion: SOURCE_VERSION, sourceLines: SOURCE_LINES };
  }

  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    
    steps.push(createStep(stepIndex++, 'probe', array, target, left, right, mid, 'calc-mid'));

    if (array[mid] === target) {
      steps.push(createStep(stepIndex++, 'found', array, target, left, right, mid, 'found', true, mid));
      return { steps, result: mid, sourceVersion: SOURCE_VERSION, sourceLines: SOURCE_LINES };
    } else if (array[mid] < target) {
      left = mid + 1;
      steps.push(createStep(stepIndex++, 'move-left', array, target, left, right, null, 'update-left')); // mid 置 null
    } else {
      right = mid - 1;
      steps.push(createStep(stepIndex++, 'move-right', array, target, left, right, null, 'update-right')); // mid 置 null
    }
  }

  // 修复4：结束时明确使用 null 避免过期
  steps.push(createStep(stepIndex++, 'not-found', array, target, left, right, null, 'not-found', true, -1));
  return { steps, result: -1, sourceVersion: SOURCE_VERSION, sourceLines: SOURCE_LINES };
}

export { generateSteps, SOURCE_VERSION, SOURCE_LINES };