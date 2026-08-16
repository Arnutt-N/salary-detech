[CmdletBinding()]
param(
    [switch]$Launch
)

$ErrorActionPreference = 'Stop'

$agyBin = Join-Path $env:LOCALAPPDATA 'agy\bin'
$agyExe = Join-Path $agyBin 'agy.exe'
$sourceSkills = Join-Path $env:USERPROFILE '.agents\skills'
$targetSkills = Join-Path $env:USERPROFILE '.gemini\config\skills'
$configRoot = Join-Path $env:USERPROFILE '.gemini\antigravity-cli'

if (-not (Test-Path -LiteralPath $agyExe -PathType Leaf)) {
    throw "ไม่พบ Antigravity CLI ที่ $agyExe"
}

if (-not (Test-Path -LiteralPath $sourceSkills -PathType Container)) {
    throw "ไม่พบโฟลเดอร์ skills ที่ $sourceSkills"
}

# The installer has already configured User PATH. Update this process immediately.
if (-not (($env:Path -split ';') -contains $agyBin)) {
    $env:Path = "$agyBin;$env:Path"
}

Write-Host 'Antigravity CLI version:'
& $agyExe --version

New-Item -ItemType Directory -Path (Split-Path $targetSkills) -Force | Out-Null

if (-not (Test-Path -LiteralPath $targetSkills)) {
    New-Item -ItemType Junction -Path $targetSkills -Target $sourceSkills | Out-Null
    Write-Host "เชื่อม global skills: $targetSkills -> $sourceSkills"
}
else {
    Get-ChildItem -LiteralPath $sourceSkills -Directory | ForEach-Object {
        $skillFile = Join-Path $_.FullName 'SKILL.md'
        $destination = Join-Path $targetSkills $_.Name
        if ((Test-Path -LiteralPath $skillFile -PathType Leaf) -and
            -not (Test-Path -LiteralPath $destination)) {
            Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse
        }
    }
    Write-Host "เพิ่ม skills ที่ยังไม่มีลงใน $targetSkills"
}

$skillCount = @(
    Get-ChildItem -LiteralPath $targetSkills -Directory |
        Where-Object {
            Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') -PathType Leaf
        }
).Count
Write-Host "พบ skills ที่ Antigravity สามารถสแกนได้ $skillCount โฟลเดอร์"

$running = @(Get-Process -Name agy, language_server -ErrorAction SilentlyContinue)
$updateLock = Join-Path $configRoot 'updater\update.lock'
if ($running.Count -eq 0 -and (Test-Path -LiteralPath $updateLock)) {
    $backupName = "update.lock.stale-$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
    Rename-Item -LiteralPath $updateLock -NewName $backupName
    Write-Host "สำรอง updater lock ที่ค้างเป็น $backupName"
}

Write-Host ''
Write-Host 'ซ่อม PATH และ skills เสร็จแล้ว'
Write-Host 'ปิดเทอร์มินอลเดิมทั้งหมด เปิด PowerShell ใหม่ แล้วรัน agy และ /skills'

if ($Launch) {
    $env:AGY_CLI_DISABLE_AUTO_UPDATE = 'true'
    & $agyExe
    Write-Host "agy exit code: $LASTEXITCODE"
    Read-Host 'กด Enter เพื่อปิดหน้าต่าง'
}
