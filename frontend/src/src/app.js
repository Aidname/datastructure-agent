// 仅检查骨架服务；业务模块由各成员在对应目录实现。
const status = document.querySelector('#service-status');
try {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error('Service unavailable');
  const data = await response.json();
  status.textContent = data.stage === 'scaffold'
    ? '本地服务已连接；算法、动画、练习和 Agent 待实现。'
    : '本地服务已连接。';
} catch {
  status.textContent = '本地服务未连接，请按 README 启动后端。';
}
