# 03可视化窗口恢复检查

> 历史记录：本文对应00a5f4f及深色窗口恢复阶段。用户随后确认的白底、并排工作台及悬浮辅导已应用；当前结果见[布局检查](workbench-layout-check-20261023.md)。下列旧截图不代表当前布局。

日期：2026-10-23。基线main 8f20f7c（已合并清理PR #22）；分支codex/restore-m03-visualization。按用户明确要求恢复03交付中有用的窗口交互，由01接入正式工作台。

## 恢复范围

从main 34f6c55中的dev-viz-window.js/.css和dev-grid.js恢复可复用窗口与网格，整理为frontend/src/features/visualization/window.js、window.css、grid.js。保留原03的深色画布、数组/指针动画、两层网格与窗口样式；增加正式挂载、控件同步、窄屏取景和生命周期适配。原开发页的假聊天/假记录、Mock run/source fixtures不恢复。

正式页面继续由04创建真实run，03 createPlayback为唯一播放指针。新增seek(index)只移动现有cursor、停止计时器并广播原快照；时间轴点击/方向键/Home/End、起止、速度均通过同一控制器同步源码/变量/Agent/07。窗口不产生run或独立算法结果。无运行时播放及跳步禁用，初始步骤由工作台显式同步。

窗口支持视口平移/光标中心缩放、Home取景、重播入场、标题栏拖动、桌面原生调整大小、最大化/复位、页面内全屏及Esc退出；全屏保留退出按钮与键盘焦点循环。Home仅作用于当前视口；时间轴键盘阻止冒泡。换输入/运行、页面卸载清理全屏、全局按键、ResizeObserver、动画帧和延迟取景，避免旧窗口污染新状态。

恢复原96px数组格子并移除工作台尺寸覆盖。桌面为左代码、中视口、右辅导；窄屏依次堆叠。长数组取景按真实视口居中，100元素在390px宽度也不造成页面溢出；全屏深色画布内文字保持可读。

## 实际检查

环境：Windows、Node.js 24.21.0、Playwright及本机Edge。浏览器脚本启动隔离临时端口的真实Node服务，窗口/工作台/聊天检查使用显式Mock；07检查无Key且关闭Mock，程序判分使用实际接口。没有访问付费模型。

| 检查 | 结果 |
|---|---|
| npm run check | 42个JS/mjs、11个JSON通过，仅语法与JSON读取 |
| npm test | 38/38通过，新增2项seek行为验证 |
| visualization-window.browser.mjs | 新增5组通过：真实run与空态，时间轴/原快照/上下文，平移缩放/窗口控制，全屏/换运行/监听清理，桌面手机/100项/空数组 |
| workbench.browser.mjs | 原8组全部通过 |
| exercises.browser.mjs | 原7组全部通过，题目判分/错题记录/刷新清除继续可用 |
| agent-chat.browser.mjs | 原聊天页回归通过 |

时间轴每次操作只增加一次步骤广播；12次输入替换后仅保留一个窗口且全局按键监听数量不增长。桌面1600×1000和手机390×844无页面横向溢出或未捕获错误；手机另核对内容左右边界均位于画布内。

- [桌面工作区](evidence/visualization-window-20261023/window-workspace.png)
- [全屏](evidence/visualization-window-20261023/window-fullscreen.png)
- [手机窗口](evidence/visualization-window-20261023/window-mobile-panel.png)

## 复现

启动npm start后访问根页面，填入示例→开始分析；拖动视口、滚轮缩放、Home取景，点击时间轴/方向键跳步，核对源码/变量/聊天/练习上下文；进入全屏后Esc退出。测试用例命令见tests/README.md；可用TEST_PLAYWRIGHT_MODULE指定本机模块，TEST_SCREENSHOT_DIR输出截图。

本轮恢复03窗口，不表示已完成09五页原型的全部界面还原；真实访谈、真实模型效果与08独立验收仍按原分工继续。
