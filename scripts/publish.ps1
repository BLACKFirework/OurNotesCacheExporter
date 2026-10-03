param([string]$Repository = 'BLACKFirework/OurNotesCacheExporter')
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
function Require-Success([string]$Message) {
    if ($LASTEXITCODE -ne 0) { throw $Message }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw '请先安装 Git。' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw '请先安装 GitHub CLI，并在本机运行 gh auth login。不要在聊天里发送访问令牌。' }
& gh auth status
Require-Success 'GitHub CLI 尚未登录。'
$Login = (& gh api user --jq .login).Trim()
Require-Success '无法核对 GitHub 账号。'
$Owner = $Repository.Split('/')[0]
if ($Login -ine $Owner) { throw "当前账号 $Login 与目标所有者 $Owner 不同，请在本地选择正确账号。" }
if (-not (Test-Path .git)) {
    & git init --initial-branch=main
    Require-Success '无法建立独立 Git 仓库。'
}
$Top = (& git rev-parse --show-toplevel).Trim()
Require-Success '无法核对 Git 工作目录。'
if ((Resolve-Path $Top).Path -ne (Resolve-Path $ProjectRoot).Path) { throw '请在独立前端项目运行，不能使用父目录的 bot 仓库。' }
$Branch = (& git branch --show-current).Trim()
if ($Branch -ne 'main') { throw '当前分支不是 main；脚本不会自动切换或覆盖分支。' }
$ExistingOrigin = & git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $ExistingOrigin -notmatch ('github\.com[:/]' + [regex]::Escape($Repository) + '(\.git)?$')) { throw '现有 origin 指向其他仓库，停止，不暂存或提交。' }
$Allowed = '^(\.github/|src/|public/|scripts/|\.gitignore$|README\.md$|VERIFICATION\.md$|index\.html$|package\.json$|pnpm-lock\.yaml$|pnpm-workspace\.yaml$|tsconfig\.json$|vite\.config\.ts$)'
$HistoricalPaths = & git log --all --format= --name-only 2>$null
if ($LASTEXITCODE -eq 0 -and ($HistoricalPaths | Where-Object { $_ -and $_ -notmatch $Allowed })) { throw '已有历史包含前端白名单以外的文件，请使用全新独立目录。' }
& git add -- .github .gitignore README.md VERIFICATION.md index.html package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vite.config.ts src public scripts
Require-Success '暂存公开前端文件失败。'
$StagedPaths = & git diff --cached --name-only
if ($StagedPaths | Where-Object { $_ -and $_ -notmatch $Allowed }) { throw '暂存区包含前端白名单以外的文件，停止提交。' }
& git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    & git commit -m 'Publish standalone static OurNotes cache exporter'
    Require-Success '提交失败，请核对本机 Git 身份设置；脚本不会替你修改身份。'
} elseif ($LASTEXITCODE -ne 0) { throw '无法核对待提交内容。' }
$Origin = & git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    & gh repo create $Repository --public --source $ProjectRoot --remote origin --description 'Static browser exporter for OurNotes player cache'
    Require-Success '创建独立公开仓库失败；如同名仓库已存在，请先人工核对，脚本不会覆盖它。'
} elseif ($Origin -notmatch ('github\.com[:/]' + [regex]::Escape($Repository) + '(\.git)?$')) {
    throw 'origin 指向其他仓库，停止发布。'
}
$RepoVisibility = (& gh api "repos/$Repository" --jq .private).Trim()
Require-Success '无法检查目标仓库。'
if ($RepoVisibility -ne 'false') { throw '目标不是公开仓库；脚本不会改变已有仓库的可见性。' }
$PageInfo = & gh api "repos/$Repository/pages" 2>$null
if ($LASTEXITCODE -ne 0) {
    & gh api --method POST "repos/$Repository/pages" -f build_type=workflow
    Require-Success '启用 GitHub Pages 失败，请核对账号的 Pages 管理权限。'
} else {
    $Page = $PageInfo | ConvertFrom-Json
    if ($Page.build_type -ne 'workflow') {
        & gh api --method PUT "repos/$Repository/pages" -f build_type=workflow
        Require-Success '设置 Pages 为 GitHub Actions 失败。'
    }
}
& git push --set-upstream origin main
Require-Success '推送失败；脚本不进行 force push。'
Write-Host '已推送并配置 GitHub Pages。'
Write-Host "请运行：gh run list --repo $Repository --workflow pages.yml"
Write-Host '等待对应提交的部署工作流成功，再检查网站；推送完成不等于已上线。'
& gh api "repos/$Repository/pages" --jq .html_url
Require-Success '无法取得 Pages 地址。'

