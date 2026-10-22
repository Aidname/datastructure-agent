# 2026-10-19 后端核验记录

核验基线：main `d1ce117`，合并[PR #10](https://github.com/tw1l1ghtcc/datastructure-agent/pull/10)，对应最终引擎/后端提交 `b21e40e7dda2a6726141014ede38e39383563005`。本轮只更新文档与人工协议示例，没有修改业务代码。

01借助Codex在用户指定本地副本重新执行独立检查：26组通过，0组失败。核验脚本与完整结果保留在本地 review-artifacts，不把团队其他成员视为已签字。

## 核验覆盖

- 11组人工预期、逐步Schema字段和源码映射；882组生成的有序数组结果及轨迹不变量。
- 安全整数端点、两元素、100元素、确定性及输入/快照引用隔离。
- 展示片段括号、更新语句、lineId唯一性；未执行完整C程序编译。
- 静态页面/脚本/样式、HEAD与health；11组HTTP创建/回读与引擎一致。
- run不存在/越界、两个run隔离、16类非法运行输入、损坏JSON。
- ASCII与UTF-8请求字节上限，判分接口体积上限。
- 10题公开字段与原题库一致、不泄露答案且保留version；全部题目正确判分和错误时三级提示/解析。
- 答案类型、选择题选项ID与空答案、hintLevel合法性。
- Agent503占位、知识接口501及未知API；run查询TTL与每分钟清理逻辑；SIGTERM关闭后子进程自然退出。

## 使用边界

这证明当前后端模块的上述行为通过01独立检查，不代表前端联调、08交叉验收、真实Agent/检索、真实访谈或效果对比完成。C/C++片段的检查也不等于编译执行证明。

原根目录审查文件的reviewedHead仍标记旧提交19a5576，不能用该元数据证明当前版本；本轮依据外部独立脚本在合并后代码上的重跑结果。2026-10-23整理时，原结果原样归档到[evidence/backend-pr10/results.json](evidence/backend-pr10/results.json)；脚本整理为[tests/backend-acceptance.mjs](../../tests/backend-acceptance.mjs)，按当前接口运行，不覆盖历史结果。

静态检查、内容检查、文档相对链接与人工样例一致性另在本轮提交前检查。具体接口以[API契约](api-contract.md)为准，消费者待确认事项见[接口对齐清单](contract-alignment.md)。
