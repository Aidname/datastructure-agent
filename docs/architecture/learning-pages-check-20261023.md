# 学习页面拆分检查

日期：2026-10-23。基线main为752a1e0（PR #27）；本轮分支codex/learning-pages。按用户要求调整四个导航入口、知识卡位置和对话窗口。

## 页面行为

- 算法工作台、知识与辅导、过程练习、错题与记录分别为独立视图，对应/#workbench、/#knowledge、/#practice、/#records。支持直接打开、刷新、浏览器前进后退及旧练习/知识卡锚点；顶部标题、侧栏选中态和页面标题同步。手机切页后收起导航。
- 工作台保留代码、变量、真实动画及输入；知识卡移至知识与辅导页，首次进入读取既有接口，可展开正文及来源，失败可重试。
- 右下辅导窗口只保留步骤聊天，移除“步骤问答”和“知识卡”选项卡。仅工作台显示对话球；切页收起窗口，回来打开仍保留草稿、历史及原运行。窗口层级高于悬浮球，避免球升起避让时间轴时遮挡发送按钮。
- 过程练习保留固定题、真实判分及三级提示；错题与记录使用原本机store，记录面板独立挂载，重练自动转到练习页并选题。无重复挂载点或第二套记录存储。
- 切页不重建模块或改变原算法步骤；离开工作台暂停播放。没有修改后端、模型提示词、公共HTTP接口、知识内容、题库或记录格式。

## 本地验证

Windows、Node.js 24.21.0、Playwright及Edge。浏览器脚本启动隔离端口的正式Node服务。问答为显式Mock/本地响应桩，未调用付费模型；这些结果不表示真实模型效果或08独立验收完成。

| 检查 | 结果 |
|---|---|
| npm run check | 通过 |
| npm test | 41/41通过 |
| learning-pages.browser.mjs | 3组通过：四页/卡片/聊天简化；判分记录重练及状态保留/历史导航；直接链接/刷新/390与320px/卡片失败重试 |
| workbench.browser.mjs | 8组通过：真实run、源码/变量/上下文、播放、输入校验、请求失败及迟到取消、窄屏 |
| workbench-layout.browser.mjs | 3组通过：代码动画布局、浮窗交互/知识页、长数组及320px |
| visualization-window.browser.mjs | 5组通过：唯一播放指针、动画操作、全屏回收、长数组/空数组及手机 |
| exercises.browser.mjs | 7组通过：判分、提示、重练、历史版本、存储/清理及失败恢复 |
| agent-conversation.browser.mjs | 通过：问答连续性、重试ID、换run隔离及旧回答取消 |

旧脚本已适配真实导航；创建新运行前收起可能覆盖输入栏的浮窗，保留原业务断言。新页面测试使用正常点击验证发送，无强制点击绕过遮挡。

## 正式页面截图

- [知识与辅导](evidence/learning-pages-20261023/knowledge-desktop.png)
- [过程练习](evidence/learning-pages-20261023/practice-desktop.png)
- [错题与记录](evidence/learning-pages-20261023/records-desktop.png)
- [简化后的步骤辅导窗口](evidence/learning-pages-20261023/tutor-desktop.png)
- [窄屏知识页](evidence/learning-pages-20261023/knowledge-mobile.png)

截图中的问答为Mock，不是模型效果证据。学习记录仍仅在本机保存；页面刷新不恢复后端运行或聊天草稿，只有同一次打开期间的页面切换会保留它们。前端文件刷新即可生效，无需重启后端。
