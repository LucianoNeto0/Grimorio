$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\public\icon-512.png"
$source = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
$resourceRoot = Join-Path $PSScriptRoot "..\android\app\src\main\res"
$legacySizes = @{
  "mipmap-mdpi"    = 48
  "mipmap-hdpi"    = 72
  "mipmap-xhdpi"   = 96
  "mipmap-xxhdpi"  = 144
  "mipmap-xxxhdpi" = 192
}
$adaptiveSizes = @{
  "mipmap-mdpi"    = 108
  "mipmap-hdpi"    = 162
  "mipmap-xhdpi"   = 216
  "mipmap-xxhdpi"  = 324
  "mipmap-xxxhdpi" = 432
}

function Save-ScaledPng([string]$path, [int]$canvasSize, [bool]$withSafeInset) {
  $bitmap = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $drawSize = if ($withSafeInset) { [int]($canvasSize * 0.68) } else { $canvasSize }
  $offset = [int](($canvasSize - $drawSize) / 2)
  $graphics.DrawImage($source, $offset, $offset, $drawSize, $drawSize)
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

try {
  foreach ($entry in $legacySizes.GetEnumerator()) {
    $directory = Join-Path $resourceRoot $entry.Key
    Save-ScaledPng (Join-Path $directory "ic_launcher.png") $entry.Value $false
    Save-ScaledPng (Join-Path $directory "ic_launcher_round.png") $entry.Value $false
  }

  foreach ($entry in $adaptiveSizes.GetEnumerator()) {
    $directory = Join-Path $resourceRoot $entry.Key
    Save-ScaledPng (Join-Path $directory "ic_launcher_foreground.png") $entry.Value $true
  }
} finally {
  $source.Dispose()
}
