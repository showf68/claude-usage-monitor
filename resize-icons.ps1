Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\Yossef Haim\Pictures\gpt-image-1\gpt-images\image-2026-01-01T16-17-31-093Z.png'
$destFolder = 'c:\Users\Yossef Haim\Dropbox\dev\ICALL\.claude\chrome-extension'

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

# Create 128x128
$icon128 = New-Object System.Drawing.Bitmap 128, 128
$graphics128 = [System.Drawing.Graphics]::FromImage($icon128)
$graphics128.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics128.DrawImage($sourceImage, 0, 0, 128, 128)
$icon128.Save("$destFolder\icon128.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics128.Dispose()
$icon128.Dispose()

# Create 48x48
$icon48 = New-Object System.Drawing.Bitmap 48, 48
$graphics48 = [System.Drawing.Graphics]::FromImage($icon48)
$graphics48.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics48.DrawImage($sourceImage, 0, 0, 48, 48)
$icon48.Save("$destFolder\icon48.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics48.Dispose()
$icon48.Dispose()

# Create 16x16
$icon16 = New-Object System.Drawing.Bitmap 16, 16
$graphics16 = [System.Drawing.Graphics]::FromImage($icon16)
$graphics16.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics16.DrawImage($sourceImage, 0, 0, 16, 16)
$icon16.Save("$destFolder\icon16.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics16.Dispose()
$icon16.Dispose()

$sourceImage.Dispose()

Write-Host 'Icons created successfully!'
Get-ChildItem $destFolder -Filter '*.png' | Select-Object Name, Length
