# 十人任务分配（第一次作业）

2026-10-14 最新细化方案见 [方案 A：具体任务与验收清单](plan-a-detailed.md)。该文件保留原任务、依赖和计划日期；当前交付以[任务看板](progress.md)为准。后端运行/判分、06内容及09需求/原型设计已合并，生产全流程仍待集成。

编号对应团队角色。当前[成员登记表](roster.md)已有8人，05/10资料待补；各成员复核自己的真实信息。以下日期均为 2026 年 10 月，北京时间。

| 成员 | 本次负责的具体实现/成果 | 主责路径 | 首个 PR | 完成验收 |
|---|---|---|---|---|
| 01 | 固定接口与状态格式；管理登记、分工和 PR；整合运行；完成启动说明和验收清单 | shared/schemas、docs/architecture、scripts、启动入口 | 14 日 | 22 日 |
| 02 | 实现数组/目标输入、校验提示、代码高亮、变量面板、错误/加载显示；连接动画与聊天区域 | frontend/index.html、app.js、styles、features/workbench | 15 日 | 18 日 |
| 03 | 实现数组格子、左右边界/中点/区间动画；开始暂停、前进回看、速度和重置；发布当前步骤 | frontend/src/features/visualization、playback | 15 日 | 18 日 |
| 04 | 实现二分查找轨迹；C/C++ 展示代码行映射；创建运行、查状态、题目读取/判分接口；边界处理 | backend/src/algorithms、runs、routes、shared/algorithms | 15 日 | 17 日 |
| 05 | 实现 DeepSeek 适配、状态查询/知识检索工具、当前步骤解释、三级提示、聊天界面、调用用量记录 | backend/src/agent、knowledge、frontend/src/features/agent | 15 日 | 19 日 |
| 06 | 核验并整理二分查找知识卡与出处；编写不少于 5 道过程题及答案/提示；协助完整覆盖表 | content/knowledge、exercises、sources、coverage | 15 日 | 17 日 |
| 07 | 组织约 5 人真实访谈及试用；实现题目呈现、作答反馈、逐级提示、本机错题与进度记录 | frontend/src/features/exercises、records、docs/research | 15 日 | 19 日 |
| 08 | 制作独立预期轨迹与边界测试；检查联动和模型失败；完成三个真实前后对比及证据整理 | tests、docs/evaluation | 15 日 | 20 日 |
| 09 | 完成正式版界面原型、项目标志、思维导图、类图及需求文档；逐项拆分 408 覆盖与动画清单 | docs/product、docs/architecture/diagrams、docs/prototype | 15 日 | 20 日 |
| 10 | 收集真实团队资料与合照；完成团队博客、10 分钟 PPT、演示脚本、录屏与六分钟问答准备 | docs/presentation、docs/team/roster.md（与01协作） | 15 日 | 22 日 |

详细步骤、依赖和验收见 [个人任务单](tasks/)。模块初次集成在 17 日进行，19 日完成第二次集成，22 日完成并冻结本次范围。23 日至 24 日答辩前预留约一天半用于修复、复测、检查和演练，不增加新功能；24 日答辩；25 日提交博客。

## 每个人提交什么

代码角色提交可运行模块、接口说明、操作证据；资料角色提交真实资料、核验记录和可用于 PPT 的结论。每个人至少有一个可复核 PR。AI 辅助不代替本人验收。

## 公共文件规则

`frontend/index.html` 与 `app.js` 的主整合由 02 负责；03、05、07 向独立目录实现模块。`backend/src/server.js` 主整合由 04 负责；05 提供独立 Agent handler。共有 schema、启动脚本和依赖由 01 协调。06 负责知识题目文件，07、08 提交问题反馈或小 PR。

初版不做账号、公开部署、BFS 实现、其他算法动画或 408 全量内容填充。正式版目标保持全内容覆盖，但不能将本次骨架说成成品。
