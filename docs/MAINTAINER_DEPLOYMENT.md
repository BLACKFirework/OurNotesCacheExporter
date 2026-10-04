# ShizukuBot Pages 维护与发布

## 环境边界

| 环境 | 后端来源 | 用户数据 | 可发布 |
| --- | --- | --- | --- |
| dev | `.env.local` 中的本机或测试 HTTPS 地址 | 合成数据 | 否 |
| test | 测试构建参数 | 合成数据 | 否 |
| production | GitHub Actions 变量 `SHIZUKUBOT_BACKEND_ORIGIN` | 后端私有运行目录 | 是 |

公开仓库不保存活跃隧道地址。`.env.local` 被 Git 忽略；`.env.example` 只有占位符。

## 发布门禁

1. 后端生产进程以 production 环境和独立运行目录启动，`/healthz` 返回 `service=ournotes-binding` 与 `product=ShizukuBot`。
2. 在仓库 Actions variables 设置精确 HTTPS origin `SHIZUKUBOT_BACKEND_ORIGIN`，不得含路径、query 或 fragment。
3. 在本地运行 `pnpm test`、带同一 origin 的 `pnpm build`、`pnpm check:public`。
4. 合并经过审阅的改动。普通 main 提交不会部署。
5. 建立 `shizukubot-v*` 标签，或人工运行 `Release ShizukuBot Pages` workflow。
6. 核对 Actions 成功、移动端页面、QQ 新链接、预览、确认、onmyinfo 与通知待重试状态。

`scripts/publish.ps1` 默认只做本地门禁。只有显式增加 `-Publish` 才创建并推送版本标签；脚本不会推送 main、force push、创建仓库或改变可见性。

## 回滚

回滚使用新提交撤销问题改动，再建立更高版本标签。不要重写公开历史。临时后端故障时可先停止发放绑定链接；Pages 会保留说明和离线状态，不应把旧隧道写回仓库。

## 通知失败

绑定确认和 QQ 通知分开记录。确认成功但通知失败时，页面显示“绑定成功，通知待重试”；用户可以直接发送 `onmyinfo` 查询，避免重复覆盖快照。
