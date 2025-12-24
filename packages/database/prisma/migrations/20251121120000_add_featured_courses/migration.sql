-- Add featured-course controls
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "featuredAt" TIMESTAMP(3);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'courses_isFeatured_featuredAt_idx') THEN
        CREATE INDEX "courses_isFeatured_featuredAt_idx" ON "courses"("isFeatured", "featuredAt");
    END IF;
END $$;
