# Quick Deployment Checklist

## Before Pushing to GitHub

### 1. Database Setup (5 minutes)
```bash
# Connect to your PostgreSQL database
psql -h <your-cloud-sql-host> -U <your-user> -d motornation

# Run the SQL script
\i server/create_articles_table.sql

# Or paste the SQL directly
# (see create_articles_table.sql)

# Verify table exists
\dt articles
\d articles
```

### 2. Google Cloud Storage Bucket (2 minutes)
```bash
# Create bucket for article images
gcloud storage buckets create gs://article-images-mn \
  --project=motornation-466804 \
  --location=us-central1 \
  --uniform-bucket-level-access

# Make bucket publicly readable
gcloud storage buckets add-iam-policy-binding gs://article-images-mn \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

### 3. Environment Variables (3 minutes)

Go to: [Cloud Run Console](https://console.cloud.google.com/run)

1. Click on `motornation-backend`
2. Click "EDIT & DEPLOY NEW REVISION"
3. Go to "Variables & Secrets" tab
4. Add/Verify:

```
GOOGLE_CLOUD_BUCKET_NAME_ARTICLES = article-images-mn
```

**OR** update `cloudbuild.yaml` line 25:
```yaml
- '--set-env-vars=NODE_ENV=production,PORT=8080,GOOGLE_CLOUD_BUCKET_NAME_ARTICLES=article-images-mn'
```

---

## Push to GitHub

```bash
# Stage your changes
git add .

# Commit
git commit -m "Add articles API with image upload support

- Fixed articles_api.js routes for articles table
- Mounted articles API in main server
- Created article input panel
- Added database schema and deployment docs"

# Push to trigger deployment
git push origin main
```

---

## Monitor Deployment (5 minutes)

### Check Build Status
1. Go to: [Cloud Build Console](https://console.cloud.google.com/cloud-build/builds)
2. Watch the build progress
3. Should complete in ~3-5 minutes

### Check Deployment
```bash
# Watch service status
gcloud run services describe motornation-backend --region=us-central1

# Check logs
gcloud run logs read --service=motornation-backend --region=us-central1 --limit=20
```

Look for:
```
✅ DB connection successful
🚀 Server running on http://localhost:8080
```

---

## Test After Deployment (5 minutes)

### 1. Health Check
```bash
curl https://motornation-336079007565.us-central1.run.app/health
curl https://motornation-336079007565.us-central1.run.app/health/db
```

### 2. Test Articles API
```bash
# Get all articles (should return empty array initially)
curl https://motornation-336079007565.us-central1.run.app/api/articles

# Get articles summary
curl https://motornation-336079007565.us-central1.run.app/api/articles/summary
```

### 3. Test Input Panel
1. Open: https://motornation-336079007565.us-central1.run.app/content_input_panel/article_input.html
2. Fill in a test article
3. Upload 1-2 test images
4. Click "Enter"
5. Should see: "Article submitted successfully!"

### 4. Verify Data
```bash
# Check the article was created
curl https://motornation-336079007565.us-central1.run.app/api/articles

# Or query database directly
psql -h <host> -U <user> -d motornation -c "SELECT id, article_title, slug, created_at FROM articles;"
```

### 5. Verify Images
1. Check Cloud Storage bucket: https://console.cloud.google.com/storage/browser/article-images-mn
2. Should see uploaded images with UUID filenames
3. Image URLs should be accessible publicly

---

## Troubleshooting

### If Database Connection Fails
```bash
# Check Cloud SQL instance
gcloud sql instances describe <your-instance-name>

# Test connection
gcloud sql connect <your-instance-name> --user=postgres --database=motornation

# Verify env vars
gcloud run services describe motornation-backend --region=us-central1 --format="value(spec.template.spec.containers[0].env)"
```

### If Image Upload Fails
```bash
# Check bucket exists
gcloud storage buckets describe gs://article-images-mn

# Check permissions
gcloud storage buckets get-iam-policy gs://article-images-mn

# Check service account
gcloud run services describe motornation-backend --region=us-central1 --format="value(spec.template.spec.serviceAccountName)"
```

### If 404 Errors
```bash
# Check logs for route registration
gcloud run logs read --service=motornation-backend --region=us-central1 | grep -i "article"

# Verify articles_api.js is being loaded
gcloud run logs read --service=motornation-backend --region=us-central1 | grep -i "require"
```

---

## Success Criteria ✅

Your deployment is successful when:

- [ ] Health check returns status 200
- [ ] Database health check shows "connected"
- [ ] GET /api/articles returns 200 (empty or with data)
- [ ] Article input panel loads without errors
- [ ] Can submit article through form
- [ ] Images appear in GCS bucket
- [ ] Article appears in database
- [ ] Article accessible via slug URL
- [ ] No errors in Cloud Run logs

---

## Total Time Estimate

- Pre-deployment setup: **10 minutes**
- Git push & build: **5 minutes**
- Post-deployment testing: **5 minutes**
- **Total: ~20 minutes**

---

## Next Steps After Successful Deployment

1. **Create Article Display Pages**
   - Show individual articles
   - List all articles
   - Category pages (EV, luxury, etc.)

2. **Add Features**
   - Edit existing articles
   - Delete articles
   - Rich text editor
   - SEO metadata
   - Social sharing

3. **Optimize**
   - Image compression
   - CDN for images
   - Database query optimization
   - Caching strategy

4. **Security**
   - Add authentication
   - Input sanitization
   - Rate limiting
   - API keys

---

**Ready to deploy?** Follow the checklist above in order! 🚀
