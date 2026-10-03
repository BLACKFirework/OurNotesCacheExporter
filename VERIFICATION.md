# 发布验证

验证日期：2026-10-04（Asia/Shanghai）。

- 生产构建：TypeScript 与 Vite 构建通过。
- 自动测试：11 项通过，包括原有导出边界与二进制校验、文件信息检查的已知 hash 及尺寸限制。
- 子路径静态资源 HTTP 检查：HTML、JS、CSS、许可文件返回 200。
- 公开内容：仅独立前端及第三方许可；无真实缓存、私有解码配置、账号样本或上传凭据。
- 静态模式：已移除本地 /api/session 与 /api/preview 调用；页面不解密、不上传、不绑定 QQ。
- 第三方 GitHub Actions：workflow 固定的五个 commit 均通过官方仓库查询核对。
- 线上页面：云浏览器已打开真实 Pages 地址，确认导出控件、文件检查说明、使用指南及 iOS 待验证提示可见。后续交互和截图被当前浏览器环境阻止，文件选择 / hash 的浏览器交互、桌面视觉检查及手机渲染仍未完成。
- 真实手机：本次独立发布版尚未验证线上 WebUSB；不能将既有另一入口的取包成功代替本站实测。
- 网络部署：独立公开仓库 `BLACKFirework/OurNotesCacheExporter` 已创建，Pages Source 为 GitHub Actions。首次发布提交 `4844b0b81dfa6ea8c4838f5363f71fe5384b7bba` 的 [部署 run #1（attempt 2）](https://github.com/BLACKFirework/OurNotesCacheExporter/actions/runs/37142797076) 成功，GitHub 显示网站已上线；云浏览器实际打开 `https://blackfirework.github.io/OurNotesCacheExporter/`。原 `OurNotesBot` 保持私有，未修改原仓库。

## 发布验收

1. 创建独立公开仓库，仅推送当前目录。
2. Pages Source 为 GitHub Actions，对应部署 run 成功。
3. 在真实 Pages 子路径下确认 JS、CSS、许可文件均返回 200。
4. 在桌面 Chrome/Edge 验证页面及文件 hash，不触发上传或本地预检 API。
5. 使用用户已授权的安卓手机在新站点完成一次取包，对照同次文件 hash。
6. iOS 显示为待验证，不提示可自动读取游戏容器。
