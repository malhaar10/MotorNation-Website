# Quick PowerShell script to check deployment status
Write-Host "🔍 Checking Articles API Deployment Status..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if articles endpoints exist
Write-Host "📍 Test 1: Checking if Articles API is deployed..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://motornation-336079007565.us-central1.run.app/" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    
    if ($data.endpoints.articles_summary) {
        Write-Host "✅ Articles API is deployed and registered" -ForegroundColor Green
        Write-Host "   Articles Summary: $($data.endpoints.articles_summary)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Articles API NOT found in endpoints" -ForegroundColor Red
        Write-Host "⚠️  Solution: Push latest code to GitHub to deploy" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to connect to API: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Try to GET articles
Write-Host "📍 Test 2: Testing GET /api/articles..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://motornation-336079007565.us-central1.run.app/api/articles" -UseBasicParsing
    $articles = $response.Content | ConvertFrom-Json
    Write-Host "✅ GET /api/articles works! Found $($articles.Count) articles" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ GET /api/articles failed with status: $statusCode" -ForegroundColor Red
    if ($statusCode -eq 404) {
        Write-Host "⚠️  Solution: Articles API not deployed yet" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 LIKELY CAUSES OF YOUR 500 ERROR:" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Articles table doesn't exist in database" -ForegroundColor White
Write-Host "   → Go to Cloud SQL Query Editor and run CREATE TABLE SQL" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Missing environment variable: GOOGLE_CLOUD_BUCKET_NAME_ARTICLES" -ForegroundColor White
Write-Host "   → Go to Cloud Run → motornation-backend → Edit & Deploy → Variables" -ForegroundColor Gray
Write-Host ""
Write-Host "3. slug-generator.js file missing" -ForegroundColor White
Write-Host "   → Check if server/utils/slug-generator.js exists" -ForegroundColor Gray
Write-Host ""
Write-Host "To see the EXACT error, check Cloud Run logs at:" -ForegroundColor Yellow
Write-Host "https://console.cloud.google.com/run/detail/us-central1/motornation-backend/logs" -ForegroundColor Cyan
Write-Host ""
