# 07练习与本机记录代码检查

日期：2026-10-23（北京时间）。基线main `62d9fa8`（已合并02 PR #17）；分支`codex/m07-exercises-records`。成员01按用户明确授权代补07代码，不能计作07本人提交，也不代表真实学生调研或08独立验收。

## 实际完成

- 正式工作台接入06的10题与04程序判分；整数、单选、判断类型正确，0、-1、false可用，空答案不能误当0。
- 错答先观察，再由用户主动逐级查看规则、完整答案与解析。继续提示更新原记录，重新作答生成新记录；不调用模型判分。
- 版本化本机存储，保留最近200次作答、题目公开快照、答案、提示和可选运行关联；进度、错题历史、尚未订正、重练、刷新恢复与主动清除可用。
- 固定题目情境独立于工作台运行；更换题目或运行取消旧请求，迟到判分/提示不能显示或落盘。提交前暂停播放。
- 提交始终带所见exerciseVersion；服务器发现版本不符返回409并提示刷新，兼容未传版本的旧调用。
- 接口失败不存记录，空题库可恢复；存储权限、损坏、配额问题可见，不静默覆盖损坏数据、不清除其他应用数据。

## 执行环境与结果

Windows、Node.js 24.21.0，Playwright使用本机Edge。07浏览器检查以`AGENT_MOCK=false`、空`DEEPSEEK_API_KEY`启动真实Node服务；正常判分使用实际题库及接口，只有异常/迟到响应场景使用受控HTTP拦截。没有访问付费模型。

| 检查 | 实际结果 |
|---|---|
| npm run check | 通过，45个JS/mjs、17个JSON；仅语法/JSON读取检查 |
| exercises-records.test.mjs | 6/6通过：白名单/类型，提示与恢复，版本进度，200条/清除，损坏/配额/禁用，其他标签数据 |
| exercises.browser.mjs | 7组通过：真实HTTP/版本，逐级提示/订正/重练，false/0/-1/刷新，换题/换运行隔离，失败/重试/清除，旧版本/空题库，存储异常/布局 |
| 全部现有Node测试及新增测试 | 36/36通过，包含工作台输入、知识检索、Agent解释/适配/真实模式本地桩 |
| workbench.browser.mjs | 原8组通过：运行/播放/源码变量/键盘/输入隔离/异常/旧请求/窄屏 |
| agent-chat.browser.mjs | 通过：Mock发送、会话用量、来源、原步骤归属与原请求重试；无页面错误 |

桌面1440×1000、手机390×844无页面横向溢出或未捕获错误。截图为自动化测试数据，不是真实学生试用：

- [桌面截图](evidence/exercises-20261023/exercises-desktop.png)
- [手机截图](evidence/exercises-20261023/exercises-mobile.png)

## 复现

```powershell
npm run check
node --test tests/workbench-input.test.mjs tests/knowledge-retrieval.test.mjs tests/agent-explain.test.mjs tests/agent-provider.test.mjs tests/agent-real-mode.test.mjs tests/exercises-records.test.mjs
# 本机已安装Playwright与Edge时运行；可用TEST_PLAYWRIGHT_MODULE指向模块绝对路径
node tests/exercises.browser.mjs
node tests/workbench.browser.mjs
node tests/agent-chat.browser.mjs
```

`TEST_BROWSER_CHANNEL`可切换可用浏览器渠道，默认msedge；`TEST_SCREENSHOT_DIR`可导出本轮截图。正常体验：npm start后访问工作台下方练习；无模型Key不影响程序判分。记录仅在同源浏览器中保留，换端口/浏览器不会自动同步。

## 剩余工作

07任务单中的真实访谈、真实学生试用、匿名汇总结论尚未提供；本次未编造资料。08仍须独立复核全流程，05/08仍须配置真实模型并完成效果对比。当前仅二分查找样例，其他408主题扩展继续按覆盖规划执行。localStorage不是考试成绩数据库，也不保证跨标签并发事务。
