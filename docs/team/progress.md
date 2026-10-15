# 团队任务看板

更新日期：2026-10-15（北京时间）。本次核验基线为 main `3b9f9fdea34e8c479f374d823cbd5b413bda690c`。创建本轮进度更新分支前，PR #1～#7均已合并，没有待合并PR。

已登记01、02、03、06、08，共5人；其余5个位置待真实资料。成员06的姓名、学号和角色由用户提供的认领截图确认，GitHub账号按用户指认的PR #7提交人填写。登记不代表业务功能已经完成。

## 当前实际交付

- 已有静态页面与健康检查；算法运行、动画、Agent、练习接口和本机记录仍未实现，业务接口为501占位。
- 成员01首批统筹文档已通过[PR #2](https://github.com/tw1l1ghtcc/datastructure-agent/pull/2)合并。
- 成员06的[PR #7](https://github.com/tw1l1ghtcc/datastructure-agent/pull/7)已合并：10张自编知识卡、10道题及答案/三级提示、11组人工预期、40个候选知识单元。仅二分查找内容标记available，其余39项planned。
- 用户已明确允许本批项目自编内容，不要求查找教材具体章节/页码。这是来源方案调整，不是“教材已经核验”。详见[范围与决策](../product/scope.md)。
- 内容离线检查和独立复算通过，不等于04/05/07实际接入、08交叉验收或完整学习流程通过。

## 成员进度

“未开始（仓库业务）”表示未见可核验的业务实现；线下进度待队员补充，不据此推断队员没有工作。

| 成员 | 任务 | 主责路径 | 状态 | PR/成果链接 | 下一步/阻塞 | 验收证据 |
|---|---|---|---|---|---|---|
| 01 包学丰 | 统筹与集成 | docs/team、docs/architecture、shared/schemas、scripts、根配置协调 | 开发中：首批统筹文档已合并；业务集成未开始 | [#2](https://github.com/tw1l1ghtcc/datastructure-agent/pull/2)、登记[#3](https://github.com/tw1l1ghtcc/datastructure-agent/pull/3) | 完成剩余登记；协调接口提案与17/19日联调 | [核验记录](../architecture/takeover-check.md)、[接口对齐](../architecture/contract-alignment.md) |
| 02 蒋书瑞 | 工作台 | frontend/index.html、src/app.js、styles、features/workbench、services | 已登记；未开始（仓库业务） | 登记[#6](https://github.com/tw1l1ghtcc/datastructure-agent/pull/6) | 提供输入、面板和模块装配成果；对齐04/03接口 | 待真实页面操作证据 |
| 03 冯玄 | 动画与播放 | frontend/src/features/visualization、playback | 已登记；未开始（仓库业务） | 登记[#1](https://github.com/tw1l1ghtcc/datastructure-agent/pull/1) | 提供播放/动画模块，与02/04对齐状态 | 待播放、回看及计时器检查 |
| 04 待登记 | 引擎与接口 | backend/src/algorithms、runs、routes、server.js、shared/algorithms | 未开始（仓库业务） | 待提交 | 提供引擎、真实轨迹、限制与源码行映射；对接06数据 | 待08独立预期核验 |
| 05 待登记 | Agent | backend/src/agent、knowledge、frontend/src/features/agent | 未开始（仓库业务） | 待提交 | 读取06自编卡片，接04真实状态；落实模型账户与预算 | 待真实检索、引用、失败处理和用量证据 |
| 06 秦文昊 | 知识与题目 | content/knowledge、exercises、sources、coverage | 待联调：首批内容已合并，离线检查通过 | 内容[#7](https://github.com/tw1l1ghtcc/datastructure-agent/pull/7)、[审阅稿](../../content/REVIEW.md)、[接入说明](../../content/exercises/HANDOFF.md) | 与04/05/07接入数据；由08交叉复核；真实sourceVersion待04提供 | 10题答案及11组预期独立复算通过；未做实际模块联调 |
| 07 待登记 | 练习记录与调研 | frontend/src/features/exercises、records、docs/research | 未开始（仓库业务） | 待提交 | 接04判分与06题库；组织真实访谈/试用 | 待刷新记录、提示及匿名调研汇总 |
| 08 乔震宇 | 测试与效果对比 | tests、docs/evaluation | 已登记；未开始（仓库业务） | 登记[#4](https://github.com/tw1l1ghtcc/datastructure-agent/pull/4)、[#5](https://github.com/tw1l1ghtcc/datastructure-agent/pull/5) | 独立核对06内容与04轨迹；实现后验收联动及真实模型对比 | 登记完成不代表测试或对比已完成 |
| 09 待登记 | 原型与需求 | docs/product、prototype、architecture/diagrams | 未开始（仓库业务） | 待提交 | 与06核对候选覆盖目录；完善正式版原型与需求 | 待原型、需求、图示与范围核对 |
| 10 待登记 | PPT博客与演示 | docs/presentation；登记与01协作 | 未开始（仓库业务） | 待提交 | 收集真实团队资料与成果；样例可运行后录屏 | 待材料一致性及10分钟演练 |

主责路径继续按[十人分工](assignments.md)和[个人任务单](tasks/)执行：02整合前端入口，04整合后端入口，01协调公共契约和依赖。没有替其他成员认领或完成业务模块。

## 后续检查点

- 15日：每人提交可检查的首份成果；已有登记PR仍需继续交付自己的模块或材料。
- 16～17日：04提供真实轨迹，02/03首次联调；06内容与04/05/07对齐。
- 18～19日：Agent、练习与记录接入，第二次集成及真实试用。
- 20日：真实三案例对比和材料一致性检查；21日全流程验收。
- 22日：主要功能、材料、证据与录屏完成并冻结；23日至24日答辩前修复、复测与演练；24日答辩，25日博客提交。

更新时填写实际成果/PR、下一步、阻塞和证据。用未开始/开发中/待联调/已验收区分状态，mock、离线内容检查和静态检查不计为完整业务验收。接口确认与集成结果分别归入[接口对齐清单](../architecture/contract-alignment.md)和[集成清单](integration-checklist.md)。
