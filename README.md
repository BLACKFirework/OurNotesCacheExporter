# ShizukuBot

ShizukuBot 是面向 **BanG Dream! Our Notes** 台港澳玩家的非官方 QQ 工具。当前公开网页提供一次性绑定入口、数据来源说明、安卓缓存导出和本地文件检查；卡库预览与确认发生在独立 HTTPS 后端。

## 玩家快速开始

1. 在 QQ 私聊 ShizukuBot 发送 `on绑定`。
2. 打开机器人回复的十分钟一次性链接，不要转发。
3. 选择一种适用来源：BHK 邮箱账号、缓存/养成文件或已授权的 Moenotes 存档。
4. 核对昵称、UID（可能未知）、卡库数量、来源、取得时间和缺失字段。
5. 明确确认后回 QQ 发送 `onmyinfo`；更新卡库时重新导入，解除关联使用 `on解绑`。

## 当前能力边界

- **可用：**QQ 一次性绑定、预览后确认、onmyinfo、解绑、安卓 WebUSB 辅助导出。
- **测试中：**BHK 邮箱读取、缓存/养成文件、Moenotes 授权存档。
- **暂不支持：**Google/Apple 登录、iOS 日常自动同步、从游戏服务器实时同步。
- 服务依赖维护者电脑与临时 HTTPS 隧道在线。Pages 可访问不代表绑定后端在线。

### 凭据事实

公开 Pages 没有账号密码表单，也不会收到密码。BHK 登录密码在独立后端页面输入：浏览器会把密码发给我们的后端，后端收到后只用于本次 SDK 登录，不保存。Moenotes 是第三方开放平台，不是游戏官方 OAuth；授权存档不等于实时同步。

详细说明见网页中的 [隐私说明](public/PRIVACY.md)。

## 本地开发

需要 Node.js 24+ 与 pnpm 11.19.0：

```powershell
pnpm install --frozen-lockfile
pnpm test
$env:VITE_API_ORIGIN = 'https://binding-api.example.invalid'
pnpm build
pnpm check:public
pnpm preview
```

后端 origin 必须是精确 HTTPS origin，不得包含路径、query 或 fragment。真实地址只放在未跟踪的 `.env.local` 或 GitHub Actions variable `SHIZUKUBOT_BACKEND_ORIGIN`；仓库中的 `.env.example` 只有占位符。

## 发布

生产 Pages 仓库是 `BLACKFirework/OurNotesCacheExporter`，保留已有仓库名与 URL。普通 main 提交不会自动部署；仅 `shizukubot-v*` 标签或人工运行 `Release ShizukuBot Pages` workflow 会触发发布。

完整发布、回滚和环境隔离流程见 [维护者文档](docs/MAINTAINER_DEPLOYMENT.md)。`scripts/publish.ps1` 默认只运行门禁，显式 `-Publish` 才创建并推送标签；不会推送 main 或 force push。

公开仓库不得包含真实缓存、QQ 号、卡库、登录凭据、一次性 key、设备标识、数据库或运行日志。第三方许可位于 [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt)。
