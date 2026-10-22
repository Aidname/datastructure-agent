# PR #10历史审查输出

results.json原样迁自根目录pr10-full-results.json，reviewedHead为19a5576；它是历史快照，不代表当前main已通过这些检查，也不替代2026-10-19的重跑说明。

可复用脚本已整理为tests/backend-acceptance.mjs；运行npm run test:backend，按当前代码重新检查。默认只输出终端结果；如需保存，可把TEST_REPORT_PATH设为artifacts/local下的文件，避免覆盖历史证据。
