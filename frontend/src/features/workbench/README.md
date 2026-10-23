# 正式工作台（成员02）

入口为 `frontend/index.html` 与 `/src/app.js`，按 `npm start` 后访问 `/`。只使用04真实run，不导入03开发页、协议Mock或本地二分引擎。原PR17放在仓库根的重复入口和Mock服务文件已移除。

## 输入与运行

数组最多100个非递减十进制安全整数，逗号/中文逗号分隔，允许空数组、负数及重复值；空项、无序、小数、Infinity、不安全整数拒绝，不自动排序或去重。目标必填。创建运行由 `services/api.js` 统一解析JSON、HTTP和网络错误；异常响应/缺少源码映射不会保留旧状态。

保留完整runId/sourceVersion/sourceLines/steps；行文字通过textContent渲染，按step.lineId高亮，mid=null显示未计算。修改输入/填入示例/重新运行会取消旧创建请求、销毁旧播放器和动画、清空高亮/变量/辅导关联。请求代次隔离迟到响应。示例只填入数据，不调用模型。

## 03动画与唯一播放指针

复用03的createVizWindow（内部createVisualization）与createPlayback；窗口已从原03开发交付恢复并适配正式页面，不自己维护第二套stepIndex。按钮调用prev/next/play/pause/reset；界面移除速度选择，默认1秒/步，底层setSpeed保留，时间轴及起止跳步调用seek；reset停止并返回步骤0，保留当前输入和run。初始步骤由装配层显式同步给全部消费者。输入变化、换run、卸载均销毁旧实例。

键盘仅在动画区处理：左右单步、空格播放/暂停；视口Home自适应取景，时间轴独立处理左右/Home/End并停止冒泡，避免一次跳两步；输入、按钮、链接等控件保留原生按键行为，不重复推进。视口采用白底无背景网格，支持平移缩放、居中取景及窗口全屏；长数组先适配视口再按需放大。桌面/窄屏适配由window.css与宿主workbench.css承担；源码栏330px与动画并排，四变量同排，时间轴在播放按钮右侧，原工作台格子尺寸覆盖已移除。

## 05聊天

`createAgentChat(container,{embedded:true,onBeforeSend})`挂载原05的共享聊天逻辑；工作台直接调用setContext，隐藏手工运行/步骤输入。ui.js管理四页hash导航、可收起侧栏、右下可拖动浮窗及独立知识卡页；浮窗上下各留12px、随视口占满可用高度；窄屏宽度自动限制在屏幕内。点击窗口外任意位置、缩小键或Escape均可收起；外部点击继续操作目标控件，不抢焦点。窗口内部点击和拖动不会收起。浮窗收起保留DOM、草稿、历史和进行中的请求，打开不暂停。点击发送先暂停播放。前端为同一运行保留独立conversationId，新问题生成turnId、重试复用原ID；换运行清空会话关联，服务端最多参考最近10轮并限制历史总长度。发送后直接用服务端页面状态/源码/历史调用模型，聊天不再检索知识或展示卡片出处；“知识与辅导”页首次打开时独立读取原目录；浮窗已移除问答/知识卡选项卡。相同步骤/同一run的迟到回答标注原步骤；换run或输入失效时取消旧问答，旧结果不能写入新运行。独立chat.html仍可单独使用。

## 页面导航

四个视图为workbench/knowledge/practice/records，分别对应同名hash。切页只改变可见视图，不重建运行、问答或练习实例；同页导航不重复处理。顶部标题、侧栏aria-current与document.title同步；新页标题获得焦点。支持前进/后退及旧练习/知识锚点兼容。切页收起辅导窗；离开工作台暂停播放。知识卡读取失败可重试；返回工作台保留源码、步骤和聊天。

## 07挂载与上下文

通过createExercises装配07过程练习与本机记录，并以subscribeStep同步工作台上下文；提交答案前暂停播放，pagehide销毁订阅与异步请求。固定题使用04真实题库/判分接口，详见[练习说明](../exercises/README.md)与[本地检查](../../../../docs/architecture/exercises-check-20261023.md)。

- 记录独立挂载点为`#records-mount`；与练习共享同一store，通过onPracticeRequested回到过程练习并选择题目。
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
node tests/workbench-layout.browser.mjs
```

工作台浏览器验收包括实际启动入口、初始问答上下文、源码/变量/动画同步、键盘、播放/暂停/重置/末步、输入清空、错误提示、迟到响应与旧问答取消、桌面/手机布局。模型测试使用Mock/本地桩，不代表真实模型效果和08独立验收。
