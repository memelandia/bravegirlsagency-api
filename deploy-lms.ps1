$ftpServer = "ftp://ftp.bravegirlsagency.com"
$ftpUser = "u378791648.ftp-brave"
$ftpPass = "OurModels2024!"

$files = @("lms\module.html", "lms\campus.html", "lms\lms-styles.css")

Write-Host "Subiendo archivos a Hostinger..." -ForegroundColor Cyan

foreach ($file in $files) {
    $remotePath = $file -replace '\\', '/'
    $ftpUri = "$ftpServer/public_html/$remotePath"
    $localPath = Join-Path $PWD $file
    
    try {
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        $webclient.UploadFile($ftpUri, $localPath)
        Write-Host "OK: $file" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR en $file : $($_.Exception.Message)" -ForegroundColor Red
    }
}
