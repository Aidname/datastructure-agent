// backend/src/runs/store.js
export const runsStore = new Map();
const RUN_TTL = 1000 * 60 * 60; // 保留 1 小时

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
  
  // 查询时也顺便检查一次是否过期
  if (Date.now() - run.createdAt > RUN_TTL) {
    runsStore.delete(runId);
    return null;
  }
  return run;
}

// 后台定时主动清理过期数据
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, run] of runsStore.entries()) {
    if (now - run.createdAt > RUN_TTL) {
      runsStore.delete(id);
    }
  }
}, 60 * 1000);

// 修复审查意见：unref() 确保定时器不会阻止 Node 进程退出
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}