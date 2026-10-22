# Fork 与 PR 协作

## 先认领

成员编号代表角色，不是实际账号。先在 `docs/team/roster.md` 登记，由成员 01 确认角色。每人读自己的任务单；公共文件由成员 01 协调修改。

## 建立自己的副本

在 GitHub 上点击 Fork。下面把 `YOUR_USERNAME` 替换为自己的 GitHub 用户名：

```powershell
git clone https://github.com/YOUR_USERNAME/datastructure-agent.git
cd datastructure-agent
git remote add upstream https://github.com/tw1l1ghtcc/datastructure-agent.git
git fetch upstream
git switch -c feat/m02-workbench upstream/main
```

分支名称换成个人任务单中的建议名称。每次新任务开始前从最新 `upstream/main` 建新分支。

## 提交与同步

只提交自己负责的文件，提交消息写清结果。同步过程中有冲突时，核对双方实现后再解决，不直接覆盖别人的代码。

```powershell
npm run check
git status
git add frontend/index.html frontend/src/features/workbench/
git commit -m "feat: add binary search input workbench"
git push -u origin feat/m02-workbench
```

以上文件路径只是成员 02 的示例；其他成员使用自己的实际路径。

GitHub 创建 PR：base=`tw1l1ghtcc/datastructure-agent:main`，compare=自己的功能分支。按 PR 模板填写结果、运行方式、验收截图/输出、未完成项。

## 合并节奏

- 10 月 15 日前提交模块接口或初步成果；不等全部做完才发第一次 PR。
- 10 月 17 日前提交可联调版本；10 月 19 日前完成主要功能集成。
- 10 月 22 日完成并冻结本次演示范围；23 日至 24 日答辩前预留约一天半，优先修复、复测和演练，不增加新功能。
- 成员 01 负责集成；相关模块负责人复核。确认公共字段与实际验收后合并。

## 主分支保护与审核

团队沿用独立分支和PR，由成员01/所有者安排审核与合并；用户已取消之前强制批准次数等额外审查要求，需要审查时再明确委托。旧交接记录中的严格配置不能当作现行规则。实际分支保护以GitHub当前设置为准，本次整理不修改远端设置。

当前仓库没有CI工作流，npm run check及测试均为本地执行；不要把本地通过写成GitHub CI已通过。

公共契约待确认事项见 [接口对齐清单](docs/architecture/contract-alignment.md)。在相关负责人确认前，不把候选字段或限制当作已冻结约定；PR 写明确认依据和受影响消费者。

## 使用 AI 辅助开发

把个人任务单、接口文档和状态格式一并提供给 AI。本人负责理解输出、执行验收及解释代码。不要把未运行的代码、协议 mock 或 AI 编造的出处当作真实结果。
