$src  = 'E:\smart-venue-v2-no-cloud(1)\smart-venue-full-20260929-2003\smart-venue'
$dest = 'E:\smart-venue-v2-no-cloud(1)\smart-venue-v2-package-20261002.zip'

if (Test-Path $dest) { Remove-Item $dest -Force }

$files = Get-ChildItem -Path $src -Recurse -Force -File -ErrorAction SilentlyContinue | Where-Object {
  $_.FullName -notmatch 'node_modules' -and
  $_.FullName -notmatch '\\dist\\' -and
  $_.FullName -notmatch '\\output\\' -and
  $_.FullName -notmatch 'test-e2e\.db$' -and
  $_.FullName -notmatch '\.git\\'
}

Write-Host ('files: ' + $files.Count)

Compress-Archive -Path $files.FullName -DestinationPath $dest -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Host ('OK ' + $mb + ' MB')
