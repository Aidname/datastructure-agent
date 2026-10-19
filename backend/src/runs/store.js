// backend/src/runs/store.js
export const runsStore = new Map();
const RUN_TTL = 1000 * 60 * 60; // 保留1小时

export function createRun(runData) {
  const runId = 'run_' + Math.random().toString(36).substring(2, 10);
  const run = {
    runId,
    createdAt: Date.now(),
    ...runData
  };
  runsStore.set(runId, run);
  return run;
}

export function getRun(runId) {
  const run = runsStore.get(runId);
  if (!run) return null;
  
  // 检查是否过期
  if (Date.now() - run.createdAt > RUN_TTL) {
    runsStore.delete(runId);
    return null;
  }
  return run;
}