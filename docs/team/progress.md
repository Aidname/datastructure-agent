# 团队任务看板

更新：2026-10-23（北京时间）。主分支已合并03的PR #14、05的#15/#18、知识检索#20、02工作台#17及07练习/记录#21（main 34f6c55）。07代码由01按用户授权代补，已合并。本表记录仓库可核验交付，不代表08独立验收或线下进度。

十名成员已登记，队名仍待团队确认。登记不代表业务完成。

## 当前交付

- 04已交付确定性二分查找、c-v1展示片段与行映射、完整run/单步接口、输入限制、内存保存与过期清理。
- 06已交付10张自编知识卡、10道题及固定提示、11组人工预期、40项候选知识单元；仅二分查找available，其余39项planned。用户允许本批自编来源，不要求教材具体章节/页码，详见[范围记录](../product/scope.md)。
- 04已接入06题库，公开题目不泄露答案，程序判分及提示接口可用。01独立后端检查26/26通过，见[核验记录](../architecture/backend-check-20261019.md)。
- 09需求v0.9、五页可点击原型、七张截图、彩色/单色标志与导出、思维导图/领域模型、40项覆盖规划已合并。见[原型入口](../prototype/README.md)和[09检查记录](../product/review-20261020.md)；本轮核对文件与入口，不把PR中的浏览器检查报告视为01重跑或08验收。
- 03动画/播放核心已合并；02正式工作台已装配04真实run、03动画/播放和05共享辅导并合并。本分支补齐07固定过程练习、三级提示、错题重练、版本快照和本机学习记录，已完成无模型Key的本地浏览器检查。
- 01本地检查不代表08交叉验收，也不代表真实模型效果或真实学生试用已经通过。
- PR #18模型适配/聊天/用量/限流预算、#20按问题检索已合并；本分支聊天自动跟随工作台run/步骤。显式Mock优先，真实模式需后端Key；本地测试未访问付费模型，真实效果案例仍无验收证据。

## 成员进度

| 成员 | 主责 | 当前可核验状态 | 依据 | 下一步 |
|---|---|---|---|---|
| 01 包学丰 | 统筹与集成、公共契约 | 统筹文档已合并；后端审查完成，本轮同步现状与契约；全流程集成待完成 | [#2](https://github.com/tw1l1ghtcc/datastructure-agent/pull/2)、[#8](https://github.com/tw1l1ghtcc/datastructure-agent/pull/8)、[接口对齐](../architecture/contract-alignment.md) | 收集消费者联调结果、剩余登记与验收证据 |
| 02 蒋书瑞 | 工作台、前端入口 | PR #17已合并：输入/请求隔离、源码/变量、03播放动画、05辅导已装配并通过本地检查 | [#17](https://github.com/tw1l1ghtcc/datastructure-agent/pull/17)、[验收](../architecture/workbench-check-20261022.md) | 08独立复核；本分支由01完成代码/动画并排、横排变量、可收起侧栏及悬浮辅导，已接07挂载/上下文 |
| 03 冯玄 | 动画与播放 | 核心已合并，本分支02已在正式入口消费；08复核待完成 | [#14](https://github.com/tw1l1ghtcc/datastructure-agent/pull/14)、[02接入说明](../../frontend/src/features/visualization/C02-INTEGRATION.md) | 本分支由01恢复03窗口、平移缩放和真实时间轴，并按用户确认改为白底；配合08复核 |
| 04 林为峰 | 引擎、run、后端入口 | 后端模块已合并并通过01独立检查，已由02/03/05消费；本分支07读题/判分联调通过，08独立复核待完成 | [#10](https://github.com/tw1l1ghtcc/datastructure-agent/pull/10) | 配合02/03/05/07联调，确认容量策略及07接入 |
| 05 郑瀚 | Agent、检索与聊天 | 模型适配/聊天与问题检索已合并；本分支已消费工作台上下文，真实效果待验收 | [#18](https://github.com/tw1l1ghtcc/datastructure-agent/pull/18)、[#20](https://github.com/tw1l1ghtcc/datastructure-agent/pull/20) | 真实Key联调，配合08提供真实对比及用量证据 |
| 06 秦文昊 | 知识与题目 | 内容已合并，04读题/判分通过；其余接入及交叉验收待完成 | [#7](https://github.com/tw1l1ghtcc/datastructure-agent/pull/7)、[接入说明](../../content/exercises/HANDOFF.md) | 配合05检索、07练习、08复核；复核09已交40项覆盖与动画规划 |
| 07 吴圣洲 | 练习记录与真实调研 | PR #21由01按用户授权代补代码并已合并，练习/三级提示/错题/本机进度通过本地检查；不计为07本人提交 | 登记[#9](https://github.com/tw1l1ghtcc/datastructure-agent/pull/9)、实现[#21](https://github.com/tw1l1ghtcc/datastructure-agent/pull/21)、[代码检查](../architecture/exercises-check-20261023.md) | 配合08独立验收；07仍须提供真实访谈/试用及匿名汇总 |
| 08 乔震宇 | 测试与效果对比 | 已登记；未见本人提交的业务测试/效果验收成果 | 登记[#4](https://github.com/tw1l1ghtcc/datastructure-agent/pull/4)、[#5](https://github.com/tw1l1ghtcc/datastructure-agent/pull/5) | 独立复核04/06，验收联动并组织真实模型三案例对比 |
| 09 王元豪 | 原型与需求 | 可审阅设计成果已合并，待跨成员复核/真实材料补充；不等于生产功能验收 | [#12](https://github.com/tw1l1ghtcc/datastructure-agent/pull/12)、[需求](../product/requirements.md)、[原型](../prototype/README.md) | 01补课程规范/队名；02～08核对设计、内容和证据；10引用设计资产 |
| 10 刘运昆 | PPT、博客与演示 | 已登记，原型录屏链接已合并；PR #19 PPT草稿待来源/证据等修正 | [#16](https://github.com/tw1l1ghtcc/datastructure-agent/pull/16)、[#19](https://github.com/tw1l1ghtcc/datastructure-agent/pull/19) | 修正PPT事实与状态；正式博客、答辩材料继续补齐 |

主责路径仍按[十人分工](assignments.md)和[个人任务单](tasks/)执行；02整合前端入口，04整合后端入口，01协调公共契约及依赖。未见合并实现不等于队员线下没有工作。

## 剩余检查点

- 原17/19日联调计划尚无全流程通过证据；当前代码接入已在本分支完成，仍需08独立验收、真实模型对比和真实试用，不将计划日期写成已完成。
- 20日：09设计材料已合并，待复核及补证；三案例真实对比和材料一致性尚无完成证据。21日计划全流程验收，不能提前标为通过。
- 22日：主要功能、材料、证据与录屏完成并冻结；23日至24日答辩前修复、复测与演练；24日答辩，25日提交博客。

每次更新填写实际PR、下一步、阻塞与证据。静态检查、后端离线检查与完整业务验收分别记录；联调结果归入[集成清单](integration-checklist.md)。
