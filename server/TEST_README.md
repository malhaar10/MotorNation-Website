# Test Article Submission Scripts

These scripts test the articles API by submitting test data directly to the cloud database.

## 📋 Available Test Scripts

### 1. `test_article_submission.js`
**Purpose**: Quick test without images  
**Use Case**: Test database connection and article creation  
**Run Time**: ~5 seconds

```bash
node test_article_submission.js
```

**What it does**:
- Sends a complete article with all 10 paragraphs
- Tests all required and optional fields
- No image upload
- Fast execution

### 2. `test_article_with_images.js` ⭐ Recommended
**Purpose**: Full test with image upload  
**Use Case**: Test complete workflow including Google Cloud Storage  
**Run Time**: ~10-30 seconds (depending on images)

```bash
node test_article_with_images.js
```

**What it does**:
- Sends article data
- Automatically finds test images in:
  - `server/` directory (test-image-1.jpg, test-image-2.jpg, etc.)
  - `../assets/` directory (first 3 images)
- Uploads images to Google Cloud Storage
- Shows upload progress
- Tests complete end-to-end workflow

---

## 🚀 Quick Start

### Option A: Test Without Images (Fastest)

```bash
cd server
node test_article_submission.js
```

### Option B: Test With Images (Recommended)

1. **Add test images** (optional):
   ```bash
   # Place some test images in the server folder
   # Supported formats: .jpg, .png, .avif, .jpeg
   # Name them: test-image-1.jpg, test-image-2.jpg, etc.
   ```

2. **Run the test**:
   ```bash
   cd server
   node test_article_with_images.js
   ```

The script will automatically use images from the `assets/` folder if no test images are found.

---

## ✅ Expected Output

### Successful Submission:

```
═══════════════════════════════════════════════════════
✅ SUCCESS! Article created in the cloud database!
═══════════════════════════════════════════════════════

📊 Article Details:
─────────────────────────────────────
ID:          a1b2c3d4-e5f6-7890-abcd-ef1234567890
Title:       2025 Tesla Model Y Review - The Ultimate Electric SUV
Slug:        2025-tesla-model-y-review-the-ultimate-electric-suv
Author:      Test Author
Tags:        EV, Electric, SUV
Created:     2025-11-05T12:34:56.789Z
Duration:    12.45 seconds
─────────────────────────────────────

📷 Uploaded Images:
─────────────────────────────────────
1. https://storage.googleapis.com/article-images-mn/uuid-1.jpg
2. https://storage.googleapis.com/article-images-mn/uuid-2.jpg
─────────────────────────────────────

🔗 Access Your Article:
─────────────────────────────────────
By ID:
  https://motornation-336079007565.us-central1.run.app/api/articles/a1b2c3d4...

By Slug:
  https://motornation-336079007565.us-central1.run.app/api/articles/slug/2025-tesla-model-y-review...

All Articles:
  https://motornation-336079007565.us-central1.run.app/api/articles
─────────────────────────────────────

✅ Article is now live in the cloud database!
✨ Test completed successfully!
```

---

## 🔍 What Gets Tested

### Database Operations:
- ✅ INSERT query execution
- ✅ UUID generation
- ✅ Slug generation (URL-friendly)
- ✅ Slug uniqueness check
- ✅ Timestamp creation
- ✅ All field types (text, text[], uuid)

### Image Upload:
- ✅ File streaming from disk
- ✅ Upload to Google Cloud Storage
- ✅ Public URL generation
- ✅ Multiple image handling
- ✅ Image array storage in database

### API Functionality:
- ✅ POST endpoint
- ✅ FormData parsing
- ✅ Multipart form handling
- ✅ Error handling
- ✅ Response formatting

---

## 🐛 Troubleshooting

### Error: "Missing required fields"
**Cause**: Required fields not provided  
**Solution**: Check that article_title, ptitle1-3, para1-3, tag, tag2 are all filled

### Error: "Database connection failed"
**Cause**: Cannot connect to PostgreSQL  
**Solution**: 
- Check Cloud SQL instance is running
- Verify environment variables in Cloud Run
- Check network connectivity

### Error: "Failed to upload image"
**Cause**: Google Cloud Storage issue  
**Solution**:
- Verify bucket exists: `article-images-mn`
- Check service account permissions
- Verify GOOGLE_CLOUD_BUCKET_NAME_ARTICLES env var

### Error: "Request timeout"
**Cause**: Large images or slow network  
**Solution**:
- Use smaller test images (< 5MB each)
- Check internet connection
- Images are automatically resized on client-side in production

### No images found
**Cause**: No test images in expected locations  
**Solution**: Script will use assets folder images automatically, or submit without images

---

## 📊 Verify Results

After running the test, verify the article was created:

### 1. Via API:
```bash
# Get all articles
curl https://motornation-336079007565.us-central1.run.app/api/articles

# Get specific article by slug
curl https://motornation-336079007565.us-central1.run.app/api/articles/slug/quick-test-article-ev-market-update
```

### 2. Via Database:
```sql
-- Connect to PostgreSQL
psql -h <host> -U <user> -d motornation

-- Check the article
SELECT id, article_title, slug, author, created_at, 
       array_length(images, 1) as image_count
FROM articles 
ORDER BY created_at DESC 
LIMIT 1;

-- View full article
SELECT * FROM articles WHERE slug LIKE '%test%';
```

### 3. Via Google Cloud Console:
1. Go to Cloud Storage → Buckets
2. Open `article-images-mn`
3. Verify images were uploaded (if images were included)

---

## 🧪 Test Scenarios

### Scenario 1: Minimal Article (No Images)
```bash
node test_article_submission.js
```
**Tests**: Basic database insertion, required fields only

### Scenario 2: Full Article with Images
```bash
node test_article_with_images.js
```
**Tests**: Complete workflow including GCS upload

### Scenario 3: Multiple Submissions
```bash
node test_article_with_images.js
node test_article_with_images.js
node test_article_with_images.js
```
**Tests**: Slug uniqueness (will create slug-1, slug-2, etc.)

### Scenario 4: Tag-Based Retrieval
```bash
# Submit article, then test category endpoints
curl https://motornation-336079007565.us-central1.run.app/api/articles/electric
```
**Tests**: Tag filtering works correctly

---

## 🔧 Customizing Test Data

### Edit Article Content:
Open the test file and modify the `articleData` object:

```javascript
const articleData = {
  article_title: 'Your Custom Title Here',
  author: 'Your Name',
  ptitle1: 'First Section',
  para1: 'Your content...',
  // ... etc
};
```

### Change API URL:
For local testing (if database connected):

```javascript
// Change this line:
const API_URL = 'https://motornation-336079007565.us-central1.run.app/api/articles';

// To:
const API_URL = 'http://localhost:3000/api/articles';
```

### Use Different Images:
Place your images in the server folder and name them:
- `test-image-1.jpg`
- `test-image-2.jpg`
- Or any of the names in the `testImages` array

---

## 📝 Clean Up Test Data

After testing, you may want to remove test articles:

```sql
-- Delete specific test article
DELETE FROM articles WHERE slug = 'quick-test-article-ev-market-update';

-- Delete all test articles
DELETE FROM articles WHERE author = 'Automated Test System';
DELETE FROM articles WHERE author = 'Test Author';

-- Or delete by date if testing today
DELETE FROM articles WHERE created_at::date = CURRENT_DATE;
```

**Note**: Deleting from database doesn't delete images from GCS. To clean up images:

```bash
# List images
gcloud storage ls gs://article-images-mn/

# Delete specific image
gcloud storage rm gs://article-images-mn/uuid-filename.jpg

# Or delete all (careful!)
# gcloud storage rm -r gs://article-images-mn/*
```

---

## 🎯 Success Criteria

Your test is successful when:

- ✅ Script completes without errors
- ✅ Returns article ID and slug
- ✅ Article appears in database
- ✅ Images uploaded to GCS (if images included)
- ✅ Article accessible via API endpoints
- ✅ Slug is URL-friendly
- ✅ Tags enable category filtering

---

## 📞 Need Help?

If tests fail:
1. Check the error message carefully
2. Verify database table exists (`create_articles_table.sql`)
3. Check Cloud Run logs: `gcloud run logs read --service=motornation-backend`
4. Verify environment variables are set
5. Test database connection: `curl https://motornation.../health/db`

---

**Last Updated**: November 5, 2025  
**Maintained By**: MotorNation Development Team
