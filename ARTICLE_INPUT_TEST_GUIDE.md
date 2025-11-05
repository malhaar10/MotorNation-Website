# Article Input Panel - Testing Guide

## 🚀 Current Status

✅ **Server Status**: Running on `http://localhost:3000`  
✅ **Articles API**: Mounted and configured  
✅ **Input Panel**: Accessible at `http://localhost:3000/content_input_panel/article_input.html`  
⚠️ **Database**: Not connected (expected for local testing)  

## 📋 Test Scenarios

### Test 1: Basic Form Functionality ✅

**Objective**: Verify all form fields are working

**Steps**:
1. Open the panel at `http://localhost:3000/content_input_panel/article_input.html`
2. Try typing in each field:
   - Article Title
   - Author
   - All 10 paragraph titles and paragraphs
   - All 5 tags
3. Verify text appears correctly in all fields

**Expected Result**: All fields accept input without errors

---

### Test 2: Required Field Validation ✅

**Objective**: Test that required fields are enforced

**Required Fields** (per `articles_api.js`):
- Article Title
- Paragraph Title 1, 2, 3
- Paragraph 1, 2, 3
- Tag 1, 2

**Steps**:
1. Leave required fields empty
2. Click "Enter" button
3. Note: Currently the HTML form doesn't have client-side validation

**Expected Result**: 
- Server will return 400 error with missing fields message
- In production, should add HTML5 `required` attributes

---

### Test 3: Image Upload Preview ✅

**Objective**: Test image preview functionality

**Steps**:
1. Click "Upload Images" file input
2. Select 1-5 image files (AVIF, JPG, PNG, etc.)
3. Observe the preview area below the file input

**Expected Result**: 
- Preview thumbnails appear (100x100px)
- Shows border around each image
- Maximum 10 images allowed

---

### Test 4: Image Upload Limits 🔍

**Objective**: Test upload constraints

**Steps**:
1. Try uploading more than 10 images
2. Try uploading a file larger than 10MB
3. Try uploading non-image files

**Expected Result**:
- Alert: "Please select a maximum of 10 images"
- Alert: File size warning for large files
- Server rejects non-image files (multer filter)

---

### Test 5: Full Form Submission 🔍

**Objective**: Submit a complete article (requires database)

**Sample Data**:
```
Article Title: "2025 Electric Vehicle Trends"
Author: "John Doe"

Paragraph Title 1: "Introduction to EV Market"
Paragraph 1: "The electric vehicle market has seen unprecedented growth in 2025..."

Paragraph Title 2: "Battery Technology Advances"
Paragraph 2: "Modern EV batteries now offer 500+ mile ranges..."

Paragraph Title 3: "Charging Infrastructure"
Paragraph 3: "Fast charging stations are now available every 50 miles..."

Tag 1: "EV"
Tag 2: "Electric"
Tag 3: "Technology"
```

**Steps**:
1. Fill in the form with sample data
2. Upload 2-3 test images
3. Click "Enter"
4. Check console for response

**Expected Result** (with database connected):
- Success message: "Article submitted successfully!"
- Console shows created article with ID and slug
- Form resets automatically
- Images uploaded to Google Cloud Storage

**Expected Result** (without database - current):
- Error message about database connection
- Can still verify form submission logic

---

### Test 6: Slug Generation 🔍

**Objective**: Verify URL-friendly slugs are created

**Test Cases**:
- Title: "Best SUVs of 2025" → Slug: `best-suvs-of-2025`
- Title: "Electric Cars: The Future!" → Slug: `electric-cars-the-future`
- Duplicate titles get numbered: `title`, `title-1`, `title-2`

**Steps**:
1. Submit an article
2. Check the response for `slug` field
3. Try submitting with the same title again

**Expected Result**: 
- Unique, URL-friendly slugs generated
- Duplicates automatically numbered

---

### Test 7: API Endpoint Verification ✅

**Objective**: Verify all article endpoints are working

**API Endpoints** (all mounted under `/api`):
```
POST   /api/articles              - Create new article
GET    /api/articles              - Get all articles
GET    /api/articles/summary      - Get latest 6 articles
GET    /api/articles/:id          - Get article by ID
GET    /api/articles/slug/:slug   - Get article by slug
GET    /api/articles/electric     - Get EV articles
GET    /api/articles/hatchback    - Get hatchback articles
GET    /api/articles/luxury       - Get luxury articles
GET    /api/articles/hybrids      - Get hybrid articles
GET    /api/articles/minivan      - Get minivan articles
GET    /api/articles/pickups      - Get pickup articles
GET    /api/articles/performance  - Get performance articles
GET    /api/articles/sedan        - Get sedan articles
GET    /api/articles/suv          - Get SUV articles
```

**Steps**:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Submit the form
4. Check the POST request to `/api/articles`

**Expected Result**: 
- Request shows correct endpoint
- FormData includes all fields and images
- Response status (503 for DB error, 201 for success)

---

## 🐛 Known Issues & Limitations

### Current Limitations:
1. **No Database Connection**: Local testing shows connection errors (expected)
2. **No Client-Side Validation**: Form doesn't enforce required fields before submission
3. **No Loading State**: Button doesn't show progress during image upload
4. **No Field Character Limits**: No max length on text fields

### Recommended Improvements:
1. Add HTML5 `required` attribute to mandatory fields
2. Add character counters for title/paragraph fields
3. Show upload progress bar for images
4. Add WYSIWYG editor for paragraph content
5. Add tag suggestions/autocomplete
6. Preview article before submission

---

## 🔧 Testing with Database

To test with full database functionality:

1. **Connect to PostgreSQL**:
   - Update `server/.env` with correct database credentials
   - Ensure PostgreSQL is running locally or remotely

2. **Verify Database Schema**:
   ```sql
   -- Articles table should have these columns:
   - id (uuid)
   - article_title (text)
   - ptitle1-10 (text)
   - para1-10 (text)
   - author (text)
   - tag, tag2, tag3, tag4, tag5 (text)
   - images (text array)
   - slug (text, unique)
   - created_at (timestamp)
   ```

3. **Test Full Flow**:
   - Submit article via form
   - Verify images upload to Google Cloud Storage
   - Check database for new record
   - Verify slug uniqueness
   - Test all GET endpoints

---

## 📝 Test Checklist

- [ ] All form fields accept input
- [ ] Image preview displays correctly
- [ ] Upload limits enforced (10 images max)
- [ ] File size validation works
- [ ] Submit button disables during upload
- [ ] Success/error messages display
- [ ] Form resets after successful submission
- [ ] API endpoint returns correct status codes
- [ ] Images upload to Google Cloud Storage (with DB)
- [ ] Slug generation works correctly (with DB)
- [ ] All category routes return correct data (with DB)

---

## 🎯 Next Steps

1. **Fix Database Connection**: For full testing
2. **Add Client-Side Validation**: Improve UX
3. **Create Test Database**: Populate with sample articles
4. **Build Article Display Pages**: Show the created articles
5. **Add Edit/Delete Functionality**: Manage existing articles

---

## 📞 Support

If you encounter issues:
1. Check browser console for JavaScript errors
2. Check server logs for API errors
3. Verify `.env` configuration
4. Ensure all dependencies installed (`npm install`)
5. Check Google Cloud Storage permissions

---

**Last Updated**: November 5, 2025  
**Server**: http://localhost:3000  
**Status**: Ready for testing (UI only without database)
