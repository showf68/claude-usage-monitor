# Auto-update Chrome Extension Token
# Ce script lit automatiquement le token depuis .credentials.json
# et le met à jour dans l'extension Chrome

$credentialsPath = "$env:USERPROFILE\.claude\.credentials.json"
$extensionId = "EXTENSION_ID_HERE" # À remplacer par l'ID de l'extension

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AUTO-UPDATE TOKEN - Chrome Extension" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Lire le fichier credentials
if (-not (Test-Path $credentialsPath)) {
    Write-Host "❌ Fichier credentials introuvable: $credentialsPath" -ForegroundColor Red
    exit 1
}

try {
    $credentials = Get-Content $credentialsPath -Raw | ConvertFrom-Json
    $token = $credentials.claudeAiOauth.accessToken
    $expiresAt = $credentials.claudeAiOauth.expiresAt

    Write-Host "✅ Token trouvé:" -ForegroundColor Green
    Write-Host "   ${token.Substring(0, 30)}..." -ForegroundColor Gray

    $expiryDate = [DateTimeOffset]::FromUnixTimeMilliseconds($expiresAt).LocalDateTime
    Write-Host "   Expire le: $expiryDate" -ForegroundColor Gray
    Write-Host ""

    # Créer un fichier JSON temporaire avec le token
    $tempFile = "$env:TEMP\claude-token-update.json"
    @{
        token = $token
        lastUpdate = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    } | ConvertTo-Json | Set-Content $tempFile

    Write-Host "📝 Token sauvegardé dans: $tempFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pour mettre à jour l'extension:" -ForegroundColor Cyan
    Write-Host "1. Ouvre l'extension Chrome" -ForegroundColor White
    Write-Host "2. Clique sur 'Mettre à jour token depuis fichier'" -ForegroundColor White
    Write-Host "3. Sélectionne le fichier: $tempFile" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou copie ce token manuellement:" -ForegroundColor Cyan
    Write-Host $token -ForegroundColor Green

} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Terminé!" -ForegroundColor Green
