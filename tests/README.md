# 测试与验收

保留的脚本用于08独立验收及后续修复回归；根目录npm run check仅检查JS语法和JSON可解析性，不代替业务测试。生产启动无需第三方依赖，浏览器测试单独需要Playwright及可用浏览器。

## 日常命令

在仓库根目录执行：

```powershell
npm run check
npm test
npm run test:backend
npm run check:content
```

| 文件 | 用途及保留理由 |
|---|---|
| backend-acceptance.mjs | 由原pr10-full-audit.mjs整理；人工oracle、882组输入轨迹不变量、源码映射、真实HTTP、题库判分、TTL和关闭清理，共26组；按当前接口运行，失败返回非零退出码 |
| playback-seek.test.mjs | 时间轴停止原计时器、复用原快照、只广播一次、非法跳步和销毁隔离 |
| workbench-input.test.mjs | 输入边界及完整run/源码映射校验 |
| agent-conversation.test.mjs | 十轮/字符/TTL/容量上限、运行/来源隔离、幂等/并发、追问检索与prompt真实状态、输出规则 |
| agent-explain.test.mjs | 真实步骤/来源、三档提示、请求限制及缺配置处理 |
| agent-provider.test.mjs | 超时、用量、来源限流、预算持久预留 |
| agent-real-mode.test.mjs | 本地模型桩下的服务端真实模式、失败、预算和检索 |
| knowledge-retrieval.test.mjs | 问题匹配、空匹配、来源、排名、HTTP与prompt |
| exercises-records.test.mjs | 题型、版本进度、提示、存储恢复/损坏/配额及清除 |
| fixtures/deepseek-fetch.mjs | Agent真实模式测试使用的本地桩，不是生产模型或效果证据 |
| *.browser.mjs | 正式入口、动画/代码/变量、聊天、三级提示、错题记录、旧请求隔离及手机布局 |

npm test运行所有.test.mjs，当前43项；独立后端验收另用test:backend，避免普通单元回归重复启动整套审查。TEST_REPORT_PATH可指定后端结果输出文件，建议artifacts/local/backend-acceptance-results.json；默认不写结果，不覆盖历史证据。无Git的源代码副本仍可运行检查，报告中的提交信息为null。

## 浏览器检查

本机已有Playwright及Edge时执行：

```powershell
# 模块不在默认搜索路径时，TEST_PLAYWRIGHT_MODULE设置为已安装Playwright入口的绝对路径
node tests/workbench.browser.mjs
node tests/agent-chat.browser.mjs
node tests/agent-conversation.browser.mjs
node tests/exercises.browser.mjs
node tests/visualization-window.browser.mjs
node tests/workbench-layout.browser.mjs
```

布局检查覆盖侧栏、330px源码/四变量、白底、自适应同排时间轴、浮窗保留草稿/回答/步骤归属、知识卡及320px适配。恢复窗口检查覆盖真实run、时间轴/源码及05/07同步、平移缩放、窗口拖动/全屏/销毁、100项取景与手机布局；截图输出包括工作区、全屏和手机视口。

默认使用msedge渠道；TEST_BROWSER_CHANNEL可切换本机渠道。TEST_SCREENSHOT_DIR可指定工作台/练习截图输出目录。脚本自动启动本地临时端口服务并回收进程；Agent只用显式Mock或本地桩，不访问付费模型。07练习脚本以无Key、关闭Mock的真实程序接口验证独立可用性。

## 证据和边界

截图、网络记录和历史输出集中在[docs/architecture/evidence](../docs/architecture/evidence/)，说明见各日期的architecture检查文档。原根目录pr10-full-results.json已原样归档到[evidence/backend-pr10/results.json](../docs/architecture/evidence/backend-pr10/results.json)，旧提交元数据不代表当前状态。新生成结果保存artifacts/local/并由Git忽略。

空unit/integration/acceptance/evidence目录的占位README已合并到本说明；新增真实测试直接放tests/，按后缀区分，确有数量需要时再拆目录。08的人工独立预期、真实模型三案例、学生试用仍需本人提供；现有脚本通过不等于这些任务完成。不要将敏感材料、伪造出处或模型效果写入证据。
