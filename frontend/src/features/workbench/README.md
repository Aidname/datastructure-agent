# 正式工作台（成员02）

入口为 `frontend/index.html` 与 `/src/app.js`，按 `npm start` 后访问 `/`。只使用04真实run，不导入03开发页、协议Mock或本地二分引擎。原PR17放在仓库根的重复入口和Mock服务文件已移除。

## 输入与运行

数组最多100个非递减十进制安全整数，逗号/中文逗号分隔，允许空数组、负数及重复值；空项、无序、小数、Infinity、不安全整数拒绝，不自动排序或去重。目标必填。创建运行由 `services/api.js` 统一解析JSON、HTTP和网络错误；异常响应/缺少源码映射不会保留旧状态。

保留完整runId/sourceVersion/sourceLines/steps；行文字通过textContent渲染，按step.lineId高亮，mid=null显示未计算。修改输入/填入示例/重新运行会取消旧创建请求、销毁旧播放器和动画、清空高亮/变量/辅导关联。请求代次隔离迟到响应。示例只填入数据，不调用模型。

## 03动画与唯一播放指针

复用 `createVisualization` 与 `createPlayback`，不修改03的实现，不自己维护第二套stepIndex。按钮调用prev/next/play/pause/reset/setSpeed；reset停止并返回步骤0，保留当前输入和run。初始步骤由装配层显式同步给全部消费者。输入变化、换run、卸载均销毁旧实例。

键盘仅在动画区处理：左右单步、空格播放/暂停；输入、按钮、链接等控件保留原生按键行为，不重复推进。动画区对长数组局部横向滚动，桌面/窄屏适配由02宿主样式承担。

## 05聊天

`createAgentChat(container,{embedded:true,onBeforeSend})`挂载原05的共享聊天逻辑；工作台直接调用setContext，隐藏手工运行/步骤输入。点击发送先暂停播放。相同步骤/同一run的迟到回答标注原步骤；换run或输入失效时取消旧问答，旧结果不能写入新运行。独立chat.html仍可单独使用。

## 07挂载与上下文

当前07生产练习/记录模块尚未交付，因此工作台明确显示尚未开放，不实现或冒充07题目/记录逻辑。04题库与程序判分API保持可用。

- 07挂载点：`#exercise-mount`；外围标题与状态由02维护，07只修改挂载点内部。
- 从 `/src/app.js` 导入 `subscribeStep(listener)`。注册时立即收到当前context（含初始第0步），返回取消订阅函数；之后每次步骤/播放状态变化收到更新。
- context为 `{runId,stepIndex,step,total,playing,sourceVersion}` 或 `null`；step只读，消费者不能修改04快照。
- document同样广播 `workbench:step` CustomEvent，detail与context一致；动态订阅应优先用subscribeStep，以免漏掉初始状态。
- 输入失效/清空时广播null；07须取消旧异步工作、清理旧运行关联。固定题目context不等于当前run，不能伪称二者实时绑定。
- 挂载点data-run-id/data-step-index仅作当前关联标识，不是另一套权威状态；回收模块时取消订阅。

## 验证

```powershell
npm run check
node --test tests/workbench-input.test.mjs tests/knowledge-retrieval.test.mjs tests/agent-explain.test.mjs tests/agent-provider.test.mjs tests/agent-real-mode.test.mjs
# 本地已有Playwright与Edge，可选设置TEST_PLAYWRIGHT_MODULE
node tests/workbench.browser.mjs
node tests/agent-chat.browser.mjs
```

工作台浏览器验收包括实际启动入口、初始问答上下文、源码/变量/动画同步、键盘、播放/暂停/重置/速度/末步、输入清空、错误提示、迟到响应与旧问答取消、桌面/手机布局。模型测试使用Mock/本地桩，不代表真实模型效果和08独立验收。
