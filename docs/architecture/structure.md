# 模块结构与依赖

技术方案：原生 HTML/CSS/JavaScript、Node.js 后端；浏览器模块按功能目录划分。当前无第三方依赖、数据库、登录和模型调用。

| 目录 | 职责 | 负责人 |
|---|---|---|
| frontend/src/features/workbench | 输入、代码变量、模块装配 | 02 |
| frontend/src/features/visualization、playback | 动画、播放指针 | 03 |
| frontend/src/features/agent | 聊天、提示级别、引用 | 05 |
| frontend/src/features/exercises、records | 练习、本机记录 | 07 |
| frontend/src/services | 同源接口调用；错误统一呈现 | 02，公共契约01 |
| backend/src/algorithms | 引擎目录说明；当前实现见shared/algorithms | 04 |
| backend/src/runs | 服务端run保存、step查询 | 04 |
| backend/src/routes | 输入校验、run/练习路由与Agent接入 | 04，Agent handler由05提供 |
| backend/src/agent | 模型适配、工具协调、使用记录 | 05 |
| backend/src/knowledge | 检索已核验知识卡 | 05，数据06 |
| shared/algorithms | JS确定性引擎、C/C++展示片段与lineId映射 | 04，资料06核验 |
| shared/schemas、examples | 版本化契约，人工协议示例 | 01+04 |
| content | 知识、题目、出处、覆盖表 | 06 |
| docs/product、prototype、architecture/diagrams | 需求v0.9、独立交互原型、标志、覆盖规划与领域图 | 09，01协调复核 |

## 单一执行来源

04生成run.steps；03只播放这些步骤；02只高亮相应代码和变量；05只从服务端工具查询状态。前端不另算答案，模型不生成权威轨迹。

一次run的输入固定。更改输入创建新run；旧的播放、聊天关联和练习上下文必须按runId隔离。未来更多算法可以注册独立engine/renderer，但本次只做二分。

## 渐进接入

截至2026-10-20，后端已提供run/step与题库判分，生产前端仍占位，Agent固定503、知识501。09设计原型位于docs/prototype，通过专用预览服务运行；它复用共享引擎在浏览器本地计算，以prototype前缀标识和独立本机记录演示，不视作生产模块联调。生产消费应读取服务端真实run/step；原型和mock不得替代真实模型或端到端验收。详见[任务看板](../team/progress.md)。
