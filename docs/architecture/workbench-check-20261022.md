# 02工作台接手修复与联调（2026-10-22）

基于PR #17的f58cfbf，已包含主分支6e000a3及05/检索。本轮由成员01按用户授权接手02，直接更新原PR，未直接合并主分支。

## 交付

- 删除PR17误放在仓库根的四个重复文件，正式入口在frontend/，按npm start即可访问，无需私自改静态服务根目录。
- 输入安全整数/非递减/100项边界校验；允许空数组、负数、重复值，错误有文字反馈；加载防重复，旧创建请求取消及代次隔离。
- 保存完整04 run/sourceLines/sourceVersion；13行源码按lineId同步高亮；变量显示left/right/mid/A[mid]，null不当0。
- 消费03原渲染和唯一播放指针，实现单步、回看、播放/暂停、速度、终止及重置；初始0步显式同步，输入变化/卸载销毁旧实例。
- 05聊天抽为共享panel供正式工作台和独立页复用。自动传当前run/step，提问暂停；同run回答保留原步骤标签，换run/输入失效取消旧问答；重试、用量、来源继续保留。
- 07尚无生产练习/记录实现，保留明确未开放区、挂载点和上下文订阅；不冒充07已完成，不在02模块代写练习逻辑。
- 同步C06接入说明、公开API/共享上下文、状态及启动文档。未更改04算法、06内容、03渲染/播放实现或05后端接口。

## 检查

- npm run check：39 JS、17 JSON通过。
- 原后端/检索27组加工作台输入与异常run检查3组，共30组原生测试通过。
- 工作台浏览器8组检查通过：正常入口和初始提问、源码/变量/键盘/播放/重置/末步、输入销毁、非法输入/空数组、HTTP失败/异常run、旧请求隔离、旧问答取消、桌面/手机布局及无脚本异常。
- 独立Agent浏览器检查通过：发送、用量、来源、原步骤归属和失败重试无回归。
- 截图人工检查修正窄屏数组被居中裁切，标准5格均可见；更长数组使用局部横向滚动，不使页面整体溢出。
- 全部模型测试/演示使用AGENT_MOCK=true或本地桩，未调用真实付费API；这不代表真实模型效果或08独立验收。

```powershell
npm run check
node --test tests/workbench-input.test.mjs tests/knowledge-retrieval.test.mjs tests/agent-explain.test.mjs tests/agent-provider.test.mjs tests/agent-real-mode.test.mjs
# 本地已有Playwright与Edge，可选TEST_PLAYWRIGHT_MODULE
node tests/workbench.browser.mjs
node tests/agent-chat.browser.mjs
```

## 演示证据

[桌面截图](evidence/workbench/desktop.png)、[本地操作录屏](evidence/workbench/demo.webm)、[网络请求/实际响应](evidence/workbench/network.json)。录屏使用真实04运行及明确标注的Mock辅导，覆盖填示例、逐步、提问、回看、播放、重置、改目标及未找到。network中的runId仅代表当次服务进程，后续重启不可据此重新查询。

## 尚未完成

07练习与本机记录仍待其模块交付；02已提供挂载和同步接口。真实Key联调、08独立复核和真实定制对比仍需后续完成。没有公开部署、没有录制或声称真实模型效果，不把设计原型和开发页替身当正式业务实现。
