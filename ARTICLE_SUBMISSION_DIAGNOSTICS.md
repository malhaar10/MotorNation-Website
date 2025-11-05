# Article Submission Diagnostics Guide

## Error: "Failed to submit article: Failed to add article"

This guide will help you pinpoint the exact issue with article submission.

---

## 🔍 Step 1: Check Browser Console for Details

### Open Browser DevTools:
1. **Right-click** on the article input page → **Inspect** (or press `F12`)
2. Go to the **Console** tab
3. Click the **Submit** button
4. Look for error messages in RED

### What to look for:
- Network errors (CORS, 404, 500, etc.)
- JavaScript errors
- Response body with specific error message

---

## 🔍 Step 2: Check Network Request Details

### In Browser DevTools:
1. Go to the **Network** tab
2. Click **Submit** button
3. Look for the request to `/api/articles`
4. Click on it to see details

### Check These Values:

#### Request URL:
```
Should be: https://motornation-336079007565.us-central1.run.app/api/articles
```

#### Request Method:
```
Should be: POST
```

#### Status Code:
- **200/201** = Success ✅
- **400** = Bad Request (missing required fields) ⚠️
- **404** = Endpoint not found ❌
- **500** = Server error ❌

#### Response (Preview Tab):
Look for the actual error message in the response body:
```json
{
  "error": "The actual error message will be here"
}
```

---

## 🔍 Step 3: Test if Articles API is Mounted

### Open this URL in your browser:
```
https://motornation-336079007565.us-central1.run.app/
```

**Expected Output:**
Should show JSON with all endpoints including `articles_summary` and `article_categories`.

**If you DON'T see articles endpoints**, the articles API is not properly deployed yet.

---

## 🔍 Step 4: Check Cloud Run Logs

### To see server-side errors:

1. Go to: https://console.cloud.google.com/run
2. Click on **motornation-backend** service
3. Go to **LOGS** tab
4. Submit the form again
5. Refresh logs

### Look for:
- `❌` or `Error` messages
- `Failed to add article` 
- Database connection errors
- Missing environment variables
- GCS upload errors

### Common Log Errors:

#### Error: "relation 'articles' does not exist"
**Cause:** Articles table not created in database  
**Fix:** Run the CREATE TABLE SQL (see Step 5)

#### Error: "Bucket not found" or "GOOGLE_CLOUD_BUCKET_NAME_ARTICLES"
**Cause:** Missing GCS bucket or environment variable  
**Fix:** Create bucket and set env var (see Step 6)

#### Error: "Missing required fields"
**Cause:** Form fields don't match API expectations  
**Fix:** Check field names in frontend vs backend

---

## 🔍 Step 5: Verify Database Table Exists

### Run this in Cloud SQL Query Editor:

```sql
-- Check if articles table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'articles'
ORDER BY ordinal_position;
```

**Expected Output:**
Should show 30+ columns including: `id`, `article_title`, `ptitle1`, `para1`, `slug`, `images`, etc.

**If empty/no results:**
```sql
-- Create the articles table
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY,
    article_title TEXT NOT NULL,
    ptitle1 TEXT,
    para1 TEXT,
    ptitle2 TEXT,
    para2 TEXT,
    ptitle3 TEXT,
    para3 TEXT,
    ptitle4 TEXT,
    para4 TEXT,
    ptitle5 TEXT,
    para5 TEXT,
    ptitle6 TEXT,
    para6 TEXT,
    ptitle7 TEXT,
    para7 TEXT,
    ptitle8 TEXT,
    para8 TEXT,
    ptitle9 TEXT,
    para9 TEXT,
    ptitle10 TEXT,
    para10 TEXT,
    author TEXT,
    tag TEXT,
    tag2 TEXT,
    tag3 TEXT,
    tag4 TEXT,
    tag5 TEXT,
    images TEXT[],
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
```

---

## 🔍 Step 6: Verify Environment Variables

### Check Cloud Run Environment:

1. Go to: https://console.cloud.google.com/run/detail/us-central1/motornation-backend/variables
2. Check if these exist:

```bash
✅ DB_HOST
✅ DB_USER
✅ DB_PASSWORD
✅ DB_NAME
✅ DB_PORT
✅ GOOGLE_CLOUD_PROJECT_ID
✅ GOOGLE_CLOUD_BUCKET_NAME_ARTICLES  ← CRITICAL FOR ARTICLES!
✅ GOOGLE_CLOUD_KEY_FILE
```

**If `GOOGLE_CLOUD_BUCKET_NAME_ARTICLES` is missing:**

Add it with value:
```
articles-images-mn
```

---

## 🔍 Step 7: Test with Minimal Data

### Try submitting with ONLY required fields:

Fill in ONLY these fields:
- **Article Title:** Test Article
- **Paragraph Title 1:** Introduction
- **Paragraph 1:** This is a test paragraph.
- **Paragraph Title 2:** Body
- **Paragraph 2:** This is the body content.
- **Paragraph Title 3:** Conclusion
- **Paragraph 3:** This is the conclusion.
- **Tag 1:** test
- **Tag 2:** debug
- **NO IMAGES** (test without images first)

Click Submit. If this works, the issue is with image uploads.

---

## 🔍 Step 8: Test API Directly with cURL

### Run this command in PowerShell/Terminal:

```powershell
# Test if articles API endpoint exists
Invoke-WebRequest -Uri "https://motornation-336079007565.us-central1.run.app/api/articles" -Method GET | Select-Object StatusCode, Content
```

**Expected:**
- Status: 200
- Content: JSON array of articles (may be empty `[]`)

**If 404 Error:**
Articles API is not deployed/mounted properly.

### Test POST with minimal data:

```powershell
$body = @{
    article_title = "Test Article"
    ptitle1 = "Section 1"
    para1 = "Content 1"
    ptitle2 = "Section 2"
    para2 = "Content 2"
    ptitle3 = "Section 3"
    para3 = "Content 3"
    tag = "test"
    tag2 = "debug"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://motornation-336079007565.us-central1.run.app/api/articles" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" | Select-Object StatusCode, Content
```

---

## 🎯 Quick Checklist

Run through this checklist:

- [ ] Browser console shows the actual error message
- [ ] Network tab shows request to `/api/articles`
- [ ] Status code from network request is noted
- [ ] API root endpoint shows articles endpoints exist
- [ ] Cloud Run logs checked for server-side errors
- [ ] Articles table exists in database (ran SQL query)
- [ ] `GOOGLE_CLOUD_BUCKET_NAME_ARTICLES` env var is set
- [ ] Tested with minimal required fields only
- [ ] Tested GET /api/articles endpoint

---

## 📊 Report Back With:

To get the best help, provide:

1. **Browser console error message** (full text)
2. **Network response status code** (e.g., 400, 404, 500)
3. **Network response body** (from Preview or Response tab)
4. **Cloud Run logs** (screenshot or copy error lines)
5. **Result of:** `GET https://motornation-336079007565.us-central1.run.app/`
6. **Articles table exists?** (Yes/No from SQL query)

---

## 🔧 Most Likely Issues:

### Issue #1: Articles API Not Deployed Yet ⚠️
**Symptoms:** 404 error, endpoint not in root API response  
**Fix:** Push latest code to GitHub to trigger Cloud Build

### Issue #2: Database Table Missing ⚠️
**Symptoms:** "relation 'articles' does not exist" in logs  
**Fix:** Run CREATE TABLE SQL in Cloud SQL Query Editor

### Issue #3: Missing GCS Bucket Environment Variable ⚠️
**Symptoms:** "Cannot read property 'bucket'" or "undefined bucket"  
**Fix:** Add `GOOGLE_CLOUD_BUCKET_NAME_ARTICLES` to Cloud Run env vars

### Issue #4: Field Name Mismatch ⚠️
**Symptoms:** "Missing required fields" error  
**Fix:** Ensure frontend sends `article_title` not `title`

---

## 🚀 After Finding the Issue

Once you identify the specific error, I can provide the exact fix!
