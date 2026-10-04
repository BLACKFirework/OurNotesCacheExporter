# OurNotes Cache Exporter

独立的静态缓存导出前端，供 GitHub Pages 托管。

## 当前能力

- 在电脑独立 Chrome / Edge 中通过 WebUSB 连接用户自己的安卓手机。
- 明确选择候选文件后，有界读取原始缓存，验证稳定性并下载到电脑。
- 浏览器内计算已选文件的字节数和 SHA-256。
- 不上传文件、不解密缓存、不绑定 QQ、不修改游戏。
- 已有一台 Android 16 实体手机的导出证据；此发布版的线上实机取包仍需另行验证。
- iOS / iPadOS 普通取包路径尚未验证；手选文件并不代表格式已确认。

## 本地开发与检查

Node.js 24+，pnpm 11.19.0：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm preview
```

仅维护者构建时需要 Node / pnpm；普通用户打开已发布网页不需要安装这些开发工具。手机需要 USB 调试授权，电脑驱动和 WebUSB 兼容性需实际核对。其他 ADB 程序可能占用 USB 接口，本页不会关闭它们。

## 发布

仓库建议：`BLACKFirework/OurNotesCacheExporter`（Public）。仅上传本项目内容，不能复制原 bot 仓库历史或运行时目录。

在 Settings → Pages → Build and deployment 中把 Source 设为 GitHub Actions。推送 main 或手动运行 Deploy GitHub Pages。workflow 只发布 dist，Vite 的相对 base 支持项目子路径。

维护者也可在 Windows 解压后的独立目录运行 `./scripts/publish.ps1`；脚本需要本机 GitHub CLI 已登录，且不会 force push。脚本准备完成，未在本环境执行。

已发布网址：[OurNotes Cache Exporter](https://blackfirework.github.io/OurNotesCacheExporter/)。2026-10-04 首次部署成功；本站线上实机 WebUSB 取包仍待验证。

公开资源中不得包含私有解码配置、真实缓存、账号库存、上传凭据或设备标识。所有第三方许可保留在 `public/THIRD_PARTY_NOTICES.txt`。原始导出逻辑沿用既有实现；此仓库不携带游戏解密实现。

## 后续接入

如果需要解码、卡库预览、QQ 绑定与数据库导入，需要另行部署明确授权的后端。当前内容安全策略禁止页面发起网络数据请求，不存在隐藏上传。接入时需一起配置 API 来源、权限和 UI，不要只修改接口地址。

网页取包不等于完整账号导入。账号归属、数据新鲜度、区段完整性需要独立证据。

## 一次性 QQ 绑定入口（2026-10-04）

首页现在是 OurNotesBot 工具入口。先在 QQ 发 `on绑定`，从私聊链接进入；本站把片段中的临时 key 交给固定后端链接，清除本站地址中的片段。敏感登录、文件上传、预览和明确确认均在独立 HTTPS 后端完成；本站没有密码表单，不存网站会话，不加载第三方统计。`#complete` 仅为返回说明，不证明绑定成功。

维护者在仓库 Actions variable `OURNOTES_BACKEND_ORIGIN` 设置已部署、可达的精确 HTTPS origin（无路径、query、fragment）；工作流将它传给 Vite `VITE_API_ORIGIN`。未配置时绑定链接明确显示不可用，桌面 USB 导出仍可用。不能填用户无法访问的 localhost/LAN 地址。后端保存目标 QQ、检查过期/撤销，只有确认才消费 key；未知游戏 UID 不阻止关联资源。

发布：`pnpm test`、`pnpm build` 后正常提交推送 main，观察现有 Pages Actions。回滚使用 git revert 创建新提交并重新部署，勿重写历史。公开部署不等于后端、真实 QQ 或手机链路验收。15 项离线测试含无后端/固定目标/非法链接/无密码表单，原 WebUSB 测试保留。实际 iOS Safari/Android 窄屏仍需实机检查。

## 共享临时后端联调

可信地址保存在 `backend-origin.json`，由本机 `OurNotesBot/tools/start-binding-tunnel.ps1` 从实际 cloudflared 输出更新，不含 key 或凭据。VITE_API_ORIGIN / Actions变量可显式覆盖，空变量使用文件值。地址改变后测试、构建、提交推送并核对部署再发新链接；每次用户绑定不建隧道、不重新部署。停止隧道不会删除已保存资料。Quick Tunnel无持续在线保证；旧页面需重新从QQ链接进入。

绑定链接先做不带Cookie/密钥的 `/healthz` 检查；离线隐藏进入按钮。敏感流程仍在后端同源页面，Pages不接收游戏密码或令牌。正式手机联调需QQ on绑定 → 手机打开链接 → 后端主动登录 → 预览并确认 → QQ完成回执 → onmyinfo。
