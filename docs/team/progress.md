# 团队任务看板

更新：2026-10-22（北京时间）；基线 main `a513411`，已包含04的PR #10、01的#11/#13、09的#12及03的[#14](https://github.com/tw1l1ghtcc/datastructure-agent/pull/14)。本分支另含待合并的05 [PR #15](https://github.com/tw1l1ghtcc/datastructure-agent/pull/15) Mock阶段成果。本表按仓库可核验交付记录，线下进度待队员补充。

已登记01、02、03、04、05、06、07、08、09，共9人；10资料待填，队名待确认。登记不代表业务完成。

## 当前交付

- 04已交付确定性二分查找、c-v1展示片段与行映射、完整run/单步接口、输入限制、内存保存与过期清理。
- 06已交付10张自编知识卡、10道题及固定提示、11组人工预期、40项候选知识单元；仅二分查找available，其余39项planned。用户允许本批自编来源，不要求教材具体章节/页码，详见[范围记录](../product/scope.md)。
- 04已接入06题库，公开题目不泄露答案，程序判分及提示接口可用。01独立后端检查26/26通过，见[核验记录](../architecture/backend-check-20261019.md)。
- 09需求v0.9、五页可点击原型、七张截图、彩色/单色标志与导出、思维导图/领域模型、40项覆盖规划已合并。见[原型入口](../prototype/README.md)和[09检查记录](../product/review-20261020.md)；本轮核对文件与入口，不把PR中的浏览器检查报告视为01重跑或08验收。
- 03动画/播放核心及开发页已随PR #14合并，待02装配；正式工作台、Agent/检索、练习前端与本机记录仍未完成。Agent默认503，知识接口501，没有真实模型调用或效果对比结果。
- 01后端审查不代表08交叉验收，也不代表02/03/05/07页面与模块联调已经通过。
- PR #15提供本地Mock阶段接口：默认仍503，仅AGENT_MOCK=true时返回标注的模板、真实步骤引用和06卡片来源（model=mock、cost=0）；尚未合并，不计为真实模型/检索/聊天功能完成。

## 成员进度

| 成员 | 主责 | 当前可核验状态 | 依据 | 下一步 |
|---|---|---|---|---|
| 01 包学丰 | 统筹与集成、公共契约 | 统筹文档已合并；后端审查完成，本轮同步现状与契约；全流程集成待完成 | [#2](https://github.com/tw1l1ghtcc/datastructure-agent/pull/2)、[#8](https://github.com/tw1l1ghtcc/datastructure-agent/pull/8)、[接口对齐](../architecture/contract-alignment.md) | 收集消费者联调结果、剩余登记与验收证据 |
| 02 蒋书瑞 | 工作台、前端入口 | 已登记；未见合并业务实现 | 登记[#6](https://github.com/tw1l1ghtcc/datastructure-agent/pull/6) | 接04运行接口及源码，整合03/05/07前端模块 |
| 03 冯玄 | 动画与播放 | 核心渲染/播放与开发页已合并，待02装配及08复核 | [#14](https://github.com/tw1l1ghtcc/datastructure-agent/pull/14)、[02接入说明](../../frontend/src/features/visualization/C02-INTEGRATION.md) | 配合02正式接入，开发页替身不计为05/07生产实现 |
| 04 林为峰 | 引擎、run、后端入口 | 后端模块已合并并通过01独立检查，待消费者联调；Agent handler接入未完成 | [#10](https://github.com/tw1l1ghtcc/datastructure-agent/pull/10) | 配合02/03/05/07联调，确认容量策略及05状态工具接入 |
| 05 郑瀚 | Agent、检索与聊天 | PR #15：服务端状态/知识卡驱动的Mock接口，待合并及消费者联调；未完成真实Agent | [#15](https://github.com/tw1l1ghtcc/datastructure-agent/pull/15) | 接04真实状态与06内容，落实引用、失败处理、预算和真实用量 |
| 06 秦文昊 | 知识与题目 | 内容已合并，04读题/判分通过；其余接入及交叉验收待完成 | [#7](https://github.com/tw1l1ghtcc/datastructure-agent/pull/7)、[接入说明](../../content/exercises/HANDOFF.md) | 配合05检索、07练习、08复核；复核09已交40项覆盖与动画规划 |
| 07 吴圣洲 | 练习记录与真实调研 | 已登记；未见合并业务或调研成果 | 登记[#9](https://github.com/tw1l1ghtcc/datastructure-agent/pull/9) | 接题库/判分，保存题目版本与本机记录，补真实访谈/试用证据 |
| 08 乔震宇 | 测试与效果对比 | 已登记；未见本人提交的业务测试/效果验收成果 | 登记[#4](https://github.com/tw1l1ghtcc/datastructure-agent/pull/4)、[#5](https://github.com/tw1l1ghtcc/datastructure-agent/pull/5) | 独立复核04/06，验收联动并组织真实模型三案例对比 |
| 09 王元豪 | 原型与需求 | 可审阅设计成果已合并，待跨成员复核/真实材料补充；不等于生产功能验收 | [#12](https://github.com/tw1l1ghtcc/datastructure-agent/pull/12)、[需求](../product/requirements.md)、[原型](../prototype/README.md) | 01补课程规范/队名；02～08核对设计、内容和证据；10引用设计资产 |
| 10 待登记 | PPT、博客与演示 | 未见合并正式成果 | [展示材料目录](../presentation/) | 可引用09原型/标志/图表并保留设计标签；补真实材料及生产流程录屏 |

主责路径仍按[十人分工](assignments.md)和[个人任务单](tasks/)执行；02整合前端入口，04整合后端入口，01协调公共契约及依赖。未见合并实现不等于队员线下没有工作。

## 剩余检查点

- 原17/19日联调计划尚无全流程通过证据；当前先完成前端/播放、Agent、练习记录接入和真实试用，不将计划日期写成已完成。
- 20日：09设计材料已合并，待复核及补证；三案例真实对比和材料一致性尚无完成证据。21日计划全流程验收，不能提前标为通过。
- 22日：主要功能、材料、证据与录屏完成并冻结；23日至24日答辩前修复、复测与演练；24日答辩，25日提交博客。

每次更新填写实际PR、下一步、阻塞与证据。静态检查、后端离线检查与完整业务验收分别记录；联调结果归入[集成清单](integration-checklist.md)。
