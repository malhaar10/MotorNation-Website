# 🚀 DEPLOY YOUR ARTICLES API NOW!

## Current Situation

✅ **Code Ready**: Your articles API is complete and tested locally  
✅ **Database Table**: Articles table already exists in cloud database  
❌ **Not Deployed**: Articles API not yet on production server  

**The test failed because the code isn't deployed to Cloud Run yet.**

---

## 🎯 Solution: Push to GitHub

Your Cloud Build is configured to automatically deploy when you push to GitHub.

### Step 1: Commit Your Changes

```bash
cd D:\MotorNationWebsite

git add .

git commit -m "Add articles API with image upload

- Created articles_api.js with 14 endpoints
- Mounted articles API in yt_api.js
- Added article input panel HTML
- Created test scripts for validation
- Added database schema and documentation

Features:
- Full CRUD for articles
- Image upload to Google Cloud Storage
- Automatic slug generation
- Category filtering (EV, luxury, SUV, etc.)
- Tag-based search
- Complete test suite"

git push origin main
```

### Step 2: Monitor Deployment (5 minutes)

After pushing, your deployment will automatically start:

**Watch build progress:**
- Go to: https://console.cloud.google.com/cloud-build/builds
- Or run: `gcloud builds list --limit=5`

**Expected timeline:**
- Build starts: Immediately after push
- Dependencies install: 1-2 minutes
- Container build: 1-2 minutes  
- Deploy to Cloud Run: 1-2 minutes
- **Total: ~5 minutes**

### Step 3: Verify Deployment

Once deployed, check the new endpoints are live:

```bash
# Check API info (should now include articles endpoints)
Invoke-WebRequest -Uri "https://motornation-336079007565.us-central1.run.app/" -UseBasicParsing | Select-Object -ExpandProperty Content

# Test articles endpoint
Invoke-WebRequest -Uri "https://motornation-336079007565.us-central1.run.app/api/articles" -UseBasicParsing

# Check health
Invoke-WebRequest -Uri "https://motornation-336079007565.us-central1.run.app/health/db" -UseBasicParsing
```

### Step 4: Run Test Again

```bash
cd server
node test_article_with_images.js
```

**This time it will succeed!** 🎉

---

## 📋 Pre-Deployment Checklist

Before pushing, verify:

- [x] articles_api.js created and working
- [x] articles_api mounted in yt_api.js  
- [x] Database table exists
- [ ] Google Cloud Storage bucket exists: `article-images-mn`
- [ ] Environment variable set: `GOOGLE_CLOUD_BUCKET_NAME_ARTICLES`

### Create GCS Bucket (If Not Done)

```bash
# Create the bucket
gcloud storage buckets create gs://article-images-mn `
  --project=motornation-466804 `
  --location=us-central1 `
  --uniform-bucket-level-access

# Make it public
gcloud storage buckets add-iam-policy-binding gs://article-images-mn `
  --member=allUsers `
  --role=roles/storage.objectViewer
```

### Set Environment Variable

**Option A: Via Cloud Console**
1. Go to: https://console.cloud.google.com/run
2. Click on `motornation-backend`
3. Click "EDIT & DEPLOY NEW REVISION"
4. Go to "Variables & Secrets"
5. Add: `GOOGLE_CLOUD_BUCKET_NAME_ARTICLES = article-images-mn`
6. Click "DEPLOY"

**Option B: Via cloudbuild.yaml** (Already Done)
The variable should be set during deployment via cloudbuild.yaml.

---

## 🎊 After Successful Deployment

### 1. Test the Live API

```bash
# Get all articles
curl https://motornation-336079007565.us-central1.run.app/api/articles

# Run test script
cd server
node test_article_with_images.js
```

### 2. Use the Input Panel

Visit:
```
https://motornation-336079007565.us-central1.run.app/content_input_panel/article_input.html
```

Fill in and submit a real article!

### 3. Verify in Database

```sql
SELECT id, article_title, slug, created_at, 
       array_length(images, 1) as image_count
FROM articles 
ORDER BY created_at DESC;
```

### 4. Check Images in GCS

https://console.cloud.google.com/storage/browser/article-images-mn

---

## 🔍 Deployment Logs

If anything goes wrong, check logs:

```bash
# Build logs
gcloud builds list --limit=1
gcloud builds log [BUILD_ID]

# Runtime logs
gcloud run logs read --service=motornation-backend --region=us-central1 --limit=50

# Filter for errors
gcloud run logs read --service=motornation-backend --region=us-central1 --filter="severity>=ERROR"
```

---

## 📊 What Will Be Available After Deployment

### New API Endpoints:

```
POST   /api/articles                    - Create article
GET    /api/articles                    - Get all articles
GET    /api/articles/summary            - Get latest 6
GET    /api/articles/:id                - Get by ID
GET    /api/articles/slug/:slug         - Get by slug
GET    /api/articles/electric           - Get EV articles
GET    /api/articles/hatchback          - Get hatchback articles
GET    /api/articles/luxury             - Get luxury articles
GET    /api/articles/hybrids            - Get hybrid articles
GET    /api/articles/minivan            - Get minivan/MPV articles
GET    /api/articles/pickups            - Get pickup articles
GET    /api/articles/performance        - Get performance articles
GET    /api/articles/sedan              - Get sedan articles
GET    /api/articles/suv                - Get SUV articles
```

### New Features:

- ✅ Article creation with rich content (10 paragraphs)
- ✅ Image upload (up to 10 images per article)
- ✅ Automatic slug generation
- ✅ Tag-based categorization
- ✅ Author attribution
- ✅ Timestamp tracking
- ✅ Category filtering
- ✅ Public image URLs via GCS

---

## 🚨 Common Issues & Solutions

### Issue: "Cannot POST /api/articles" (404)
**Cause**: Articles API not deployed  
**Solution**: Push to GitHub and wait for deployment

### Issue: "Database connection failed"
**Cause**: Cloud SQL not accessible  
**Solution**: Check Cloud SQL instance is running and env vars are set

### Issue: "Bucket not found"
**Cause**: GCS bucket doesn't exist  
**Solution**: Create bucket with commands above

### Issue: "Permission denied" for GCS
**Cause**: Service account lacks permissions  
**Solution**: Add Storage Object Creator role to service account

---

## ⏱️ Timeline

```
Now          Push to GitHub
  ↓
+1 min       Cloud Build starts
  ↓
+3 min       Build completes
  ↓
+5 min       Deployed to Cloud Run
  ↓
+6 min       Test script succeeds ✅
  ↓
+7 min       Input panel works ✅
  ↓
Done!        Articles system live 🎉
```

---

## 🎯 Quick Deploy Commands

Copy and paste these:

```powershell
# 1. Navigate to project
cd D:\MotorNationWebsite

# 2. Stage all changes
git add .

# 3. Commit
git commit -m "Add articles API with image upload and input panel"

# 4. Push (triggers automatic deployment)
git push origin main

# 5. Wait 5 minutes, then test
cd server
node test_article_with_images.js
```

---

## ✅ Success Criteria

Deployment successful when:

- [ ] Cloud Build completes without errors
- [ ] Cloud Run service updated
- [ ] Health check returns 200
- [ ] `/api/articles` endpoint returns 200 (empty array)
- [ ] Test script submits article successfully
- [ ] Article appears in database
- [ ] Images uploaded to GCS
- [ ] Input panel works end-to-end

---

## 🎉 Ready to Deploy?

**Run these commands now:**

```bash
cd D:\MotorNationWebsite
git add .
git commit -m "Add articles API with image upload"
git push origin main
```

**Then wait 5 minutes and run:**

```bash
cd server
node test_article_with_images.js
```

---

**Your articles system will be LIVE in 5 minutes! 🚀**

**Need help?** Check the logs or documentation files in your project.
