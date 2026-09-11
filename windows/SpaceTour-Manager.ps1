param(
  [ValidateSet('', 'setup', 'publish', 'studio', 'import', 'status', 'backup')]
  [string]$Action = ''
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$ContentRoot = Join-Path $Root 'public\content'
$BackupRoot = Join-Path $Root 'backups'
$ConfigFile = Join-Path $Root '.spacetour.local.json'
$ManagerVersion = '2.2.0'

function Write-Title([string]$Text) {
  Clear-Host
  Write-Host '============================================================' -ForegroundColor DarkCyan
  Write-Host "  SpaceTour Windows Manager v$ManagerVersion" -ForegroundColor Cyan
  Write-Host "  $Text" -ForegroundColor White
  Write-Host '============================================================' -ForegroundColor DarkCyan
  Write-Host ''
}

function Write-Ok([string]$Text) { Write-Host "[OK] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "[!]  $Text" -ForegroundColor Yellow }
function Write-Step([string]$Text) { Write-Host "[>]  $Text" -ForegroundColor Cyan }
function Write-Fail([string]$Text) { Write-Host "[X]  $Text" -ForegroundColor Red }
function Wait-Key { Write-Host ''; Read-Host 'Press Enter to return to the menu' | Out-Null }

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $extra = @('C:\Program Files\Git\cmd', 'C:\Program Files\GitHub CLI', 'C:\Program Files\nodejs')
  $env:Path = (($machine, $user) + $extra | Where-Object { $_ } | Select-Object -Unique) -join ';'
}

function Has-Command([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Native {
  param(
    [Parameter(Mandatory)][string]$File,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$File failed (exit code $LASTEXITCODE)" }
}

function Install-WithWinget([string]$Id, [string]$Label) {
  if (-not (Has-Command 'winget')) {
    throw "$Label is required, but winget is unavailable. Install Microsoft App Installer or install $Label manually."
  }
  Write-Step "Installing $Label..."
  & winget install --id $Id -e --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "Automatic installation failed: $Label" }
  Refresh-Path
}

function Ensure-Tools {
  Write-Step 'Checking required tools'
  Refresh-Path
  if (-not (Has-Command 'git')) { Install-WithWinget 'Git.Git' 'Git' }
  if (-not (Has-Command 'gh')) { Install-WithWinget 'GitHub.cli' 'GitHub CLI' }
  if (-not (Has-Command 'node')) { Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS' }
  if (-not (Has-Command 'npm')) { Refresh-Path }
  if (-not (Has-Command 'npm')) { throw 'npm was not found. Check the Node.js installation.' }
  Write-Ok "Git: $((& git --version) -join '')"
  Write-Ok "GitHub CLI: $((& gh --version | Select-Object -First 1) -join '')"
  Write-Ok "Node: $((& node --version) -join '')"
}

function Ensure-GitHubLogin {
  & gh auth status *> $null
  if ($LASTEXITCODE -eq 0) {
    $login = (& gh api user --jq .login).Trim()
    Write-Ok "GitHub login: $login"
    return $login
  }

  Write-Step 'GitHub authentication is required. Browser login will open.'
  & gh auth login --web --git-protocol https
  if ($LASTEXITCODE -ne 0) { throw 'GitHub authentication failed.' }
  $login = (& gh api user --jq .login).Trim()
  if (-not $login) { throw 'Could not determine the GitHub username.' }
  Write-Ok "GitHub login complete: $login"
  return $login
}

function Get-OriginInfo {
  if (-not (Test-Path (Join-Path $Root '.git'))) { return $null }

  # Do not call `git remote get-url origin` until we know origin exists.
  # Windows PowerShell 5.1 can promote native stderr to a terminating error
  # when ErrorActionPreference is Stop, which broke first-time setup.
  $remotes = @(& git -C $Root remote)
  if ($LASTEXITCODE -ne 0) { return $null }
  if (-not ($remotes -contains 'origin')) { return $null }

  $remoteLines = @(& git -C $Root remote get-url origin)
  if ($LASTEXITCODE -ne 0 -or $remoteLines.Count -eq 0) { return $null }
  $remote = ([string]$remoteLines[0]).Trim()
  if (-not $remote) { return $null }

  $m = [regex]::Match($remote, 'github\.com[/:](?<owner>[^/]+)/(?<repo>[^/]+?)(?:\.git)?$')
  if (-not $m.Success) { return $null }
  return [pscustomobject]@{ Owner = $m.Groups['owner'].Value; Repo = $m.Groups['repo'].Value; Remote = $remote }
}

function Save-LocalConfig([string]$Owner, [string]$Repo) {
  $config = [ordered]@{
    owner = $Owner
    repository = $Repo
    siteUrl = (Get-SiteUrl $Owner $Repo)
    updatedAt = (Get-Date).ToString('o')
  }
  $json = $config | ConvertTo-Json
  [System.IO.File]::WriteAllText($ConfigFile, $json, [System.Text.UTF8Encoding]::new($false))
}

function Get-SiteUrl([string]$Owner, [string]$Repo) {
  if ($Repo -ieq "$Owner.github.io") { return "https://$Owner.github.io/" }
  return "https://$Owner.github.io/$Repo/"
}

function Ensure-LocalCommit([string]$Message = 'Update SpaceTour local files') {
  Invoke-Native git -C $Root add .
  & git -C $Root diff --cached --quiet --no-ext-diff
  $code = $LASTEXITCODE
  if ($code -eq 1) {
    Invoke-Native git -C $Root commit -m $Message
    return $true
  }
  if ($code -ne 0) { throw "Could not inspect staged Git changes (exit code $code)." }
  return $false
}

function Sync-OriginMain {
  Write-Step 'Synchronizing with the existing GitHub repository'
  Invoke-Native git -C $Root fetch origin main

  & git -C $Root show-ref --verify --quiet refs/remotes/origin/main
  if ($LASTEXITCODE -ne 0) {
    Write-Warn 'Remote main branch does not exist yet. Nothing to synchronize.'
    return
  }

  & git -C $Root show-ref --verify --quiet refs/heads/main
  if ($LASTEXITCODE -ne 0) {
    Invoke-Native git -C $Root checkout -B main origin/main
    return
  }

  & git -C $Root merge-base HEAD origin/main *> $null
  $hasCommonBase = ($LASTEXITCODE -eq 0)

  if ($hasCommonBase) {
    & git -C $Root merge-base --is-ancestor origin/main HEAD *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Ok 'Local branch already contains the remote history.'
      return
    }

    & git -C $Root merge-base --is-ancestor HEAD origin/main *> $null
    if ($LASTEXITCODE -eq 0) {
      Invoke-Native git -C $Root merge --ff-only origin/main
      Write-Ok 'Local branch fast-forwarded to the current GitHub version.'
      return
    }

    Write-Warn 'Local and GitHub histories both contain changes. Merging them and keeping local files on conflicts.'
    Invoke-Native git -C $Root merge origin/main --no-edit -X ours
    Write-Ok 'Local and GitHub histories merged.'
    return
  }

  Write-Warn 'Local Git history came from a fresh ZIP and is unrelated to the existing GitHub history.'
  Write-Step 'Connecting both histories without deleting local project files'
  Invoke-Native git -C $Root merge origin/main --allow-unrelated-histories --no-edit -X ours
  Write-Ok 'Fresh local ZIP is now connected to the existing GitHub repository history.'
}

function Ensure-GitRepository {
  param([string]$Owner)

  if (-not (Test-Path (Join-Path $Root '.git'))) {
    Write-Step 'Creating local Git repository'
    Invoke-Native git -C $Root init
    Invoke-Native git -C $Root checkout -B main
  } else {
    & git -C $Root checkout main *> $null
    if ($LASTEXITCODE -ne 0) {
      & git -C $Root checkout -B main *> $null
      if ($LASTEXITCODE -ne 0) { throw 'Could not switch to the main branch.' }
    }
  }

  $gitName = (& git -C $Root config user.name 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $gitName) {
    Invoke-Native git -C $Root config user.name $Owner
  }
  $gitEmail = (& git -C $Root config user.email 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $gitEmail) {
    Invoke-Native git -C $Root config user.email "$Owner@users.noreply.github.com"
  }

  # Save current project files before any remote-history reconciliation.
  [void](Ensure-LocalCommit 'Prepare SpaceTour local project')

  $origin = Get-OriginInfo
  if ($origin) {
    Write-Ok "Using existing origin: $($origin.Owner)/$($origin.Repo)"
    Sync-OriginMain
    return (Get-OriginInfo)
  }

  Write-Ok 'Local Git repository is ready; GitHub origin is not connected yet.'
  Write-Host ''
  $defaultRepo = 'spacetour'
  $repo = Read-Host "GitHub repository name [$defaultRepo]"
  if ([string]::IsNullOrWhiteSpace($repo)) { $repo = $defaultRepo }
  $repo = ($repo -replace '[^A-Za-z0-9._-]', '-').Trim('-')
  if (-not $repo) { throw 'A valid repository name is required.' }

  $visibility = Read-Host 'Create a PUBLIC repository? [Y/n]'
  $flag = if ($visibility -match '^[Nn]') { '--private' } else { '--public' }
  $remoteUrl = "https://github.com/$Owner/$repo.git"

  $existsCode = Invoke-GhQuiet repo view "$Owner/$repo"
  if ($existsCode -eq 0) {
    Write-Ok "Existing GitHub repository found: $Owner/$repo"
    Invoke-Native git -C $Root remote add origin $remoteUrl
    Sync-OriginMain
    return [pscustomobject]@{ Owner = $Owner; Repo = $repo; Remote = $remoteUrl }
  }

  Write-Step "Creating GitHub repository: $Owner/$repo"
  & gh repo create "$Owner/$repo" $flag --description 'SpaceTour interactive property viewer'
  if ($LASTEXITCODE -ne 0) {
    Write-Warn 'Repository creation returned an error. Re-checking whether the repository now exists.'
    $existsCode = Invoke-GhQuiet repo view "$Owner/$repo"
    if ($existsCode -ne 0) { throw 'Could not create or locate the GitHub repository.' }
  }

  Invoke-Native git -C $Root remote add origin $remoteUrl
  return [pscustomobject]@{ Owner = $Owner; Repo = $repo; Remote = $remoteUrl }
}

function Invoke-GhQuiet {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  # Windows PowerShell 5.1 may convert stderr from native commands into a
  # terminating NativeCommandError when ErrorActionPreference is Stop.
  # Pages probes are expected to return non-zero before Pages is enabled,
  # so temporarily prevent native stderr from aborting the setup script.
  $previous = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & gh @Arguments 1>$null 2>$null
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
}

function Test-GitHubPagesReady {
  param([string]$Owner, [string]$Repo)
  $headers = @('-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2026-03-10')
  $endpoint = "repos/$Owner/$Repo/pages"
  return ((Invoke-GhQuiet api @headers $endpoint) -eq 0)
}

function Enable-GitHubPages {
  param([string]$Owner, [string]$Repo)
  Write-Step 'Configuring GitHub Pages for GitHub Actions deployment'

  $headers = @('-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2026-03-10')
  $endpoint = "repos/$Owner/$Repo/pages"

  if (Test-GitHubPagesReady -Owner $Owner -Repo $Repo) {
    $updateCode = Invoke-GhQuiet api --method PUT @headers $endpoint -f build_type=workflow
    if ($updateCode -eq 0) {
      Write-Ok 'GitHub Pages is enabled and uses GitHub Actions.'
      return $true
    }
    Write-Warn 'Pages exists, but the build source could not be updated automatically.'
  } else {
    $createCode = Invoke-GhQuiet api --method POST @headers $endpoint -f build_type=workflow
    if ($createCode -eq 0) {
      Write-Ok 'GitHub Pages enabled for GitHub Actions.'
      return $true
    }
  }

  Write-Warn 'Automatic Pages activation was not accepted by the GitHub API.'
  Write-Warn 'This is a one-time repository setting, not a project upload failure.'
  $settingsUrl = "https://github.com/$Owner/$Repo/settings/pages"
  Write-Host ''
  Write-Host 'A browser will open now.' -ForegroundColor White
  Write-Host 'Set: Settings > Pages > Build and deployment > Source = GitHub Actions' -ForegroundColor White
  Write-Host "Pages settings: $settingsUrl" -ForegroundColor DarkGray
  try { Start-Process $settingsUrl } catch { }
  Write-Host ''
  $answer = Read-Host 'After selecting GitHub Actions in the browser, press Enter to verify (type Q to skip)'
  if ($answer -match '^[Qq]') {
    Write-Warn 'Pages verification skipped. No deployment workflow will be triggered by this setup run.'
    return $false
  }

  for ($attempt = 1; $attempt -le 6; $attempt++) {
    if (Test-GitHubPagesReady -Owner $Owner -Repo $Repo) {
      Write-Ok 'GitHub Pages setting verified.'
      return $true
    }
    if ($attempt -lt 6) { Start-Sleep -Seconds 2 }
  }

  Write-Warn 'Pages is still not visible through the GitHub API.'
  Write-Warn 'Confirm that Source is set to GitHub Actions, then run FIRST-SETUP.cmd again.'
  return $false
}

function Build-Site {
  Ensure-Tools
  Write-Step 'Building content index and validating deployment files'
  Push-Location $Root
  try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }
  } finally {
    Pop-Location
  }
  Write-Ok 'Build validation complete'
}

function Setup-Project {
  Write-Title 'FIRST SETUP / REPAIR'
  Ensure-Tools
  $owner = Ensure-GitHubLogin
  Build-Site
  $origin = Ensure-GitRepository -Owner $owner
  if (-not $origin) { throw 'Could not determine the connected GitHub repository.' }

  Save-LocalConfig -Owner $origin.Owner -Repo $origin.Repo
  $pagesReady = Enable-GitHubPages -Owner $origin.Owner -Repo $origin.Repo

  if (-not $pagesReady) {
    Write-Host ''
    Write-Warn 'Repository connection is repaired and local files are safe.'
    Write-Warn 'Setup stopped before pushing a new deployment workflow because Pages is not verified yet.'
    Write-Host "Repository: https://github.com/$($origin.Owner)/$($origin.Repo)" -ForegroundColor White
    Write-Host "Pages: https://github.com/$($origin.Owner)/$($origin.Repo)/settings/pages" -ForegroundColor White
    return
  }

  Write-Step 'Preparing final project changes'
  [void](Ensure-LocalCommit 'Configure SpaceTour GitHub Pages deployment')

  # Remote may have received a previous setup commit. Reconcile once more before push.
  Sync-OriginMain
  [void](Ensure-LocalCommit 'Finalize SpaceTour setup')

  Write-Step 'Uploading the repaired project to GitHub'
  Invoke-Native git -C $Root push -u origin main

  $siteUrl = Get-SiteUrl $origin.Owner $origin.Repo
  Write-Host ''
  Write-Ok 'Repository setup, synchronization, and upload completed.'
  Write-Ok 'GitHub Pages is enabled for GitHub Actions.'
  Write-Host "Expected site URL: $siteUrl" -ForegroundColor White
  $actionsUrl = "https://github.com/$($origin.Owner)/$($origin.Repo)/actions"
  Write-Host "Actions: $actionsUrl" -ForegroundColor DarkGray
  $open = Read-Host 'Open the GitHub Actions page? [Y/n]'
  if ($open -notmatch '^[Nn]') { Start-Process $actionsUrl }
}

function Publish-Changes {
  Write-Title 'BUILD + UPLOAD + DEPLOY'
  Ensure-Tools
  [void](Ensure-GitHubLogin)
  $origin = Get-OriginInfo
  if (-not $origin) {
    Write-Warn 'No GitHub repository is connected. Running first setup.'
    Setup-Project
    return
  }

  Build-Site
  Write-Step 'Checking changed files'
  & git -C $Root add .
  & git -C $Root diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Ok 'No changes to upload.'
  } else {
    $message = Read-Host 'Commit message [Update property content]'
    if ([string]::IsNullOrWhiteSpace($message)) { $message = 'Update property content' }
    Invoke-Native git -C $Root commit -m $message
    Invoke-Native git -C $Root push origin main
    Write-Ok 'Upload complete. GitHub Actions will deploy GitHub Pages.'
  }

  Save-LocalConfig -Owner $origin.Owner -Repo $origin.Repo
  $siteUrl = Get-SiteUrl $origin.Owner $origin.Repo
  Write-Host "Site: $siteUrl" -ForegroundColor White
  Write-Host "Deployment status: https://github.com/$($origin.Owner)/$($origin.Repo)/actions" -ForegroundColor DarkGray
}

function Pick-Folder([string]$Description) {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = $Description
  $dialog.ShowNewFolderButton = $false
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { return $dialog.SelectedPath }
  return $null
}

function Import-Property {
  Write-Title 'IMPORT PROPERTY FOLDER'
  if (-not (Test-Path $ContentRoot)) { New-Item -ItemType Directory -Path $ContentRoot -Force | Out-Null }
  $source = Pick-Folder 'Select a property folder to import into SpaceTour.'
  if (-not $source) { Write-Warn 'Folder selection canceled.'; return }

  $defaultSlug = Split-Path $source -Leaf
  $slug = Read-Host "Property folder / URL slug [$defaultSlug]"
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = $defaultSlug }
  $slug = ($slug -replace '[\/:*?"<>|]', '-').Trim()
  if (-not $slug) { throw 'A valid folder name is required.' }

  $destination = Join-Path $ContentRoot $slug
  if (Test-Path $destination) {
    $overwrite = Read-Host "Property '$slug' already exists. Replace it? [y/N]"
    if ($overwrite -notmatch '^[Yy]') { Write-Warn 'Import canceled.'; return }
    Remove-Item -LiteralPath $destination -Recurse -Force
  }

  Write-Step "Copying: $source -> $destination"
  Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
  Write-Ok "Property imported: $slug"

  if (Has-Command 'node') {
    Push-Location $Root
    try {
      & npm run content:index
      if ($LASTEXITCODE -eq 0) { Write-Ok 'Content index updated.' }
    } finally {
      Pop-Location
    }
  } else {
    Write-Warn 'Node.js is unavailable. The index will be generated during publish/build.'
  }

  $publish = Read-Host 'Upload to GitHub now? [Y/n]'
  if ($publish -notmatch '^[Nn]') { Publish-Changes }
}

function Open-Studio {
  Write-Title 'OPEN LOCAL STUDIO'
  Ensure-Tools
  $url = 'http://localhost:5173/admin.html'
  $alive = $false
  try {
    Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 1 | Out-Null
    $alive = $true
  } catch {
    $alive = $false
  }

  if (-not $alive) {
    Write-Step 'Starting the local SpaceTour server'
    $escapedRoot = $Root.Replace("'", "''")
    $command = "Set-Location -LiteralPath '$escapedRoot'; npm run dev"
    Start-Process powershell.exe -ArgumentList @('-NoExit', '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) | Out-Null
    Start-Sleep -Seconds 2
  }

  Start-Process $url
  Write-Ok "Studio opened: $url"
  Write-Host 'Edit the property and use Publish now. No folder selection is required.' -ForegroundColor DarkGray
}

function Show-Status {
  Write-Title 'PROJECT STATUS'
  Write-Host "Project folder : $Root"
  Write-Host "Content folder : $ContentRoot"
  $folders = @()
  if (Test-Path $ContentRoot) {
    $folders = Get-ChildItem -LiteralPath $ContentRoot -Directory -ErrorAction SilentlyContinue
  }
  Write-Host "Properties     : $($folders.Count)"

  if (Has-Command 'git') {
    $origin = Get-OriginInfo
    if ($origin) {
      Write-Host "GitHub repo    : $($origin.Owner)/$($origin.Repo)"
      Write-Host "Pages URL      : $(Get-SiteUrl $origin.Owner $origin.Repo)"
    } else {
      Write-Warn 'No GitHub origin is connected.'
    }
    Write-Host ''
    $status = @(& git -C $Root status --short)
    if ($LASTEXITCODE -eq 0 -and $status.Count -eq 0) {
      Write-Ok 'No Git changes.'
    } else {
      $status | ForEach-Object { Write-Host $_ }
    }
  } else {
    Write-Warn 'Git is not installed.'
  }
}

function Backup-Content {
  Write-Title 'BACKUP CONTENT TO ZIP'
  if (-not (Test-Path $ContentRoot)) { throw 'The public\content folder does not exist.' }
  New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $zip = Join-Path $BackupRoot "spacetour-content-$stamp.zip"
  Compress-Archive -Path (Join-Path $ContentRoot '*') -DestinationPath $zip -CompressionLevel Optimal
  Write-Ok "Backup created: $zip"
  Start-Process explorer.exe -ArgumentList @('/select,', $zip)
}

function Open-Site {
  $origin = Get-OriginInfo
  if (-not $origin) { Write-Warn 'No GitHub repository is connected.'; return }
  Start-Process (Get-SiteUrl $origin.Owner $origin.Repo)
}

function Open-ContentFolder {
  if (-not (Test-Path $ContentRoot)) { New-Item -ItemType Directory -Path $ContentRoot -Force | Out-Null }
  Start-Process explorer.exe -ArgumentList $ContentRoot
}

function Run-RequestedAction {
  switch ($Action) {
    'setup'   { Setup-Project; return $true }
    'publish' { Publish-Changes; return $true }
    'studio'  { Open-Studio; return $true }
    'import'  { Import-Property; return $true }
    'status'  { Show-Status; return $true }
    'backup'  { Backup-Content; return $true }
    default   { return $false }
  }
}

try {
  if (Run-RequestedAction) { exit 0 }

  while ($true) {
    Write-Title 'MANAGE / UPLOAD / DEPLOY'
    Write-Host '  1. First setup / repair (GitHub repository + Pages)' -ForegroundColor White
    Write-Host '  2. Import a property folder' -ForegroundColor White
    Write-Host '  3. Open Studio admin page' -ForegroundColor White
    Write-Host '  4. Upload changes + deploy Pages' -ForegroundColor Green
    Write-Host '  5. Show project / Git status' -ForegroundColor White
    Write-Host '  6. Backup all content to ZIP' -ForegroundColor White
    Write-Host '  7. Open deployed website' -ForegroundColor White
    Write-Host '  8. Open public\content folder' -ForegroundColor White
    Write-Host '  0. Exit' -ForegroundColor DarkGray
    Write-Host ''
    $choice = Read-Host 'Select number'

    try {
      switch ($choice) {
        '1' { Setup-Project; Wait-Key }
        '2' { Import-Property; Wait-Key }
        '3' { Open-Studio; Wait-Key }
        '4' { Publish-Changes; Wait-Key }
        '5' { Show-Status; Wait-Key }
        '6' { Backup-Content; Wait-Key }
        '7' { Open-Site; Wait-Key }
        '8' { Open-ContentFolder; Wait-Key }
        '0' { break }
        default { Write-Warn 'Choose a number from 0 to 8.'; Start-Sleep -Seconds 1 }
      }
    } catch {
      Write-Fail $_.Exception.Message
      Wait-Key
    }
  }
} catch {
  Write-Fail $_.Exception.Message
  exit 1
}
