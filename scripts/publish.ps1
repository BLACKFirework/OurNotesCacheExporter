param(
    [Parameter(Mandatory = $true)][string]$ApiOrigin,
    [Parameter(Mandatory = $true)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version,
    [switch]$Publish,
    [string]$Repository = 'BLACKFirework/OurNotesCacheExporter'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Require-Success([string]$Message) {
    if ($LASTEXITCODE -ne 0) { throw $Message }
}

$ParsedOrigin = [Uri]$ApiOrigin
if ($ParsedOrigin.Scheme -ne 'https' -or $ParsedOrigin.AbsoluteUri.TrimEnd('/') -ne $ApiOrigin) {
    throw 'ApiOrigin 必须是无末尾斜杠、路径、query 或 fragment 的精确 HTTPS origin。'
}

if ((& git status --porcelain).Count -ne 0) { throw '工作树不干净。请先审阅并提交改动。' }
$Branch = (& git branch --show-current).Trim()
if ($Branch -ne 'main') { throw '发布标签只能从已经审阅并合并的 main 创建。' }
$Origin = (& git remote get-url origin).Trim()
Require-Success '无法读取 origin。'
if ($Origin -notmatch ('github\.com[:/]' + [regex]::Escape($Repository) + '(\.git)?$')) { throw 'origin 与目标公开前端仓库不一致。' }

$env:VITE_API_ORIGIN = $ApiOrigin
& pnpm install --frozen-lockfile
Require-Success '依赖安装失败。'
& pnpm test
Require-Success '测试失败。'
& pnpm build
Require-Success '生产构建失败。'
& pnpm check:public
Require-Success '公开发布门禁失败。'

$Tag = "shizukubot-v$Version"
if (-not $Publish) {
    Write-Host "本地门禁通过。未发布；确认审阅后使用同一命令增加 -Publish 创建 $Tag。"
    exit 0
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw '发布需要已登录的 GitHub CLI。' }
& gh auth status
Require-Success 'GitHub CLI 尚未登录。'
$Visibility = (& gh repo view $Repository --json visibility --jq .visibility).Trim()
Require-Success '无法核对目标仓库。'
if ($Visibility -ne 'PUBLIC') { throw '目标前端仓库不是 PUBLIC，脚本不会改变可见性。' }
& git show-ref --verify --quiet "refs/tags/$Tag"
if ($LASTEXITCODE -eq 0) { throw "标签 $Tag 已存在。" }
& git tag -a $Tag -m "Release ShizukuBot $Version"
Require-Success '创建发布标签失败。'
& git push origin $Tag
Require-Success '推送标签失败。标签已保留在本地，未推送 main。'
Write-Host "已推送 $Tag；请核对 Release ShizukuBot Pages 工作流和线上页面。"
