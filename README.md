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
