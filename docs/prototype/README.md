# 看懂每一步 · 正式版产品原型 v0.9

成员09：王元豪（102401629 / hsjjsjajja）；资料由用户2026-10-20提供，角色由01确认。可审阅设计，尚非生产前端。

## 运行与预览

在仓库根目录执行，Node.js >=22.9，无需安装依赖：

```powershell
node docs/prototype/preview.mjs
```

浏览器打开 [本机原型](http://127.0.0.1:3099/docs/prototype/index.html)。按 Ctrl+C 停止；端口冲突时先设置 `$env:PROTOTYPE_PORT='3100'`。本服务仅监听127.0.0.1，只读预览，不挂载生产API。生产应用仍使用原有 `npm start`。不能直接双击HTML使用模块和知识卡加载。

| 页面 | 范围与需求 | 可预览导出 |
|---|---|---|
| [课程目录](index.html#catalog) | 正式版规划；二分为本次样例入口，F06/F07 | [桌面截图](screenshots/catalog-desktop.png) |
| [算法工作台](index.html#workbench) | 本次样例设计，F01/F02/F03；数组/代码/变量/播放/辅导 | [桌面截图](screenshots/workbench-desktop.png)、[手机截图](screenshots/workbench-mobile.png) |
| [知识与辅导](index.html#knowledge) | 正式版规划/本次内容设计，F03/F06；原样加载06静态卡，非实时检索 | [截图](screenshots/knowledge-desktop.png) |
| [过程练习](index.html#practice) | 本次样例设计，F04/F05；固定bs-q01样题 | [截图](screenshots/practice-desktop.png) |
| [错题与记录](index.html#records) | 本次样例设计，F05；独立原型本机记录 | [空态](screenshots/records-empty.png)、[错题态](screenshots/records-populated.png) |

## 演示路径和证据边界

目录→工作台→创建新运行→单步/回看→询问当前步骤→知识卡→固定练习→记录。边界按钮填入后，点击“创建新运行”才能生效。含标准、空数组、重复值、未找到、无序输入，另可勾选请求失败模拟。Agent显示当前固定503降级状态，不编造回答。

轨迹直接复用04的 [generateSteps](../../shared/algorithms/binarySearch.js)，在浏览器本地计算；runId为prototype前缀模拟标识，不是服务端run。没有复制算法、没有修改生产模块、没有网络模型调用。创建的450ms等待仅演示加载。题目使用06的bs-q01固定原型答案/提示，非题库生产接入。页面常驻设计标签，截图只证明原型布局，不证明生产功能/08验收通过。

记录命名空间为 `m09-prototype-records-v1`，最多100条，仅在当前浏览器保存，清除前确认；不读取/覆盖07生产记录。题目情境是before-probe，独立于当前run，不把两个上下文混写。

## 可编辑资产与设计

- 页面源文件：[HTML](index.html)、[CSS](prototype.css)、[交互JS](prototype.js)、[专用预览服务](preview.mjs)。
- [操作/异常/手机说明](interaction-spec.md)、[需求正文](../product/requirements.md)、[覆盖规划](../product/coverage-plan.md)、[图表](../architecture/diagrams/README.md)。
- 标志源文件：[彩色SVG](assets/logo.svg)、[单色SVG](assets/logo-mono.svg)，常用导出：[128px PNG](assets/logo-128.png)、[512px PNG](assets/logo-512.png)。

标志使用阶梯节点和向前箭头表达逐步理解，薄荷绿起点代表可观察证据，紫色为主色（#6650cf）。SVG为手工矢量，可直接编辑，非AI位图。图标方形用于网页，PPT/博客可在旁边加“看懂每一步”；队名未确认，不把暂用名写成正式队名。留白至少图标宽度的1/8，小尺寸优先128px导出或SVG；不得去掉原型截图中的证据边界标签。

原型实查及缺项见[核验记录](../product/review-20261020.md)。图、页面、来源和异常需相关负责人复核，本文不代替团队确认。
