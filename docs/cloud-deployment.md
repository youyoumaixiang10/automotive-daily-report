# 云端日报运行方式

日报由 GitHub Actions 每天北京时间 08:05 运行。它先启动项目自带的无头 Chromium，再执行采集、原文日期与正文核验、去重、日报生成和内容校验，最后把静态网站发布到 GitHub Pages。

日报统计周期固定为前一天 08:00 至当天 08:00。来源读取受限或原文无法核验时，本轮仍会发布已核验内容，并在网站中提示来源覆盖状态。

首次上线只需：

1. 将此目录推送到一个 GitHub 仓库。
2. 在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。
3. 在仓库 Settings → Secrets and variables → Actions 中新增 `OPENAI_API_KEY`。它只用于把已核验正文改写为日报标题，不参与采集或发布。
4. 在 Actions 页面手动运行一次“更新汽车日报”，确认 Pages 地址生成。

之后不需要打开电脑；GitHub 的定时任务会自行运行。需要补跑时，也可在 Actions 页面手动触发该工作流。
