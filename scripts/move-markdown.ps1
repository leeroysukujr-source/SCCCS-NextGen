# Move top-level .md files into the project's docs/ folder
# Usage: run from the repository root or execute this script directly.

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path "$root\.." -ErrorAction SilentlyContinue
if ($repoRoot) { $root = $repoRoot.Path }

$target = Join-Path $root 'docs'
if (-not (Test-Path $target)) {
  New-Item -ItemType Directory -Path $target | Out-Null
  Write-Output "Created folder: $target"
}

# Move only markdown files that are directly in the repo root (not in subfolders)
Get-ChildItem -Path $root -Filter *.md -File | Where-Object { $_.DirectoryName -eq $root } | ForEach-Object {
  $src = $_.FullName
  $dest = Join-Path $target $_.Name
  if (Test-Path $dest) {
    # avoid clobbering existing files by adding a numeric suffix
    $base = [IO.Path]::GetFileNameWithoutExtension($_.Name)
    $ext = $_.Extension
    $i = 1
    do {
      $candidate = "${base}_$i$ext"
      $i++
    } while (Test-Path (Join-Path $target $candidate))
    $dest = Join-Path $target $candidate
  }
  try {
    Move-Item -LiteralPath $src -Destination $dest -Force
    Write-Output "Moved: $($_.Name) -> $dest"
  } catch {
    Write-Error "Failed to move $($_.Name): $_"
  }
}

Write-Output "Done moving top-level .md files into $target"
