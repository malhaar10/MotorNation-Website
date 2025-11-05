-- MotorNation Articles Table Setup
-- Run this script in your PostgreSQL database before deploying

-- Create articles table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_tag ON articles(tag);
CREATE INDEX IF NOT EXISTS idx_articles_tag2 ON articles(tag2);

-- Full-text search index for tags
CREATE INDEX IF NOT EXISTS idx_articles_tags_search ON articles USING gin(
    to_tsvector('english', 
        COALESCE(tag, '') || ' ' || 
        COALESCE(tag2, '') || ' ' || 
        COALESCE(tag3, '') || ' ' || 
        COALESCE(tag4, '') || ' ' || 
        COALESCE(tag5, '')
    )
);

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'articles'
ORDER BY 
    ordinal_position;

-- Test insert (optional - for verification)
/*
INSERT INTO articles (
    id, 
    article_title, 
    ptitle1, 
    para1, 
    ptitle2, 
    para2, 
    ptitle3, 
    para3,
    tag, 
    tag2, 
    slug
) VALUES (
    gen_random_uuid(),
    'Test Article for MotorNation',
    'Introduction',
    'This is a test article to verify the articles table is working correctly.',
    'Main Content',
    'The articles feature allows editors to create comprehensive automotive content.',
    'Conclusion',
    'This test demonstrates that the database schema is properly configured.',
    'Test',
    'Database',
    'test-article-motornation'
);

-- Query the test article
SELECT * FROM articles WHERE slug = 'test-article-motornation';

-- Delete test article (if desired)
-- DELETE FROM articles WHERE slug = 'test-article-motornation';
*/

COMMENT ON TABLE articles IS 'Stores article content for MotorNation website';
COMMENT ON COLUMN articles.id IS 'Unique identifier (UUID v4)';
COMMENT ON COLUMN articles.slug IS 'URL-friendly identifier, auto-generated from title';
COMMENT ON COLUMN articles.images IS 'Array of Google Cloud Storage URLs for article images';
COMMENT ON COLUMN articles.created_at IS 'Timestamp when article was created';
