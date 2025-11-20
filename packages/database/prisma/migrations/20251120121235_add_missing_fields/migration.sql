-- AlterTable: Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "surname" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP(3);

-- AlterTable: Add missing column to device_sessions table
ALTER TABLE "device_sessions" ADD COLUMN IF NOT EXISTS "deviceFingerprint" TEXT NOT NULL DEFAULT '';

-- Create unique indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_key') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_verificationToken_key') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_verificationToken_key" UNIQUE ("verificationToken");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_resetPasswordToken_key') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_resetPasswordToken_key" UNIQUE ("resetPasswordToken");
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_phone_idx') THEN
        CREATE INDEX "users_phone_idx" ON "users"("phone");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_verificationToken_idx') THEN
        CREATE INDEX "users_verificationToken_idx" ON "users"("verificationToken");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_resetPasswordToken_idx') THEN
        CREATE INDEX "users_resetPasswordToken_idx" ON "users"("resetPasswordToken");
    END IF;
END $$;

-- Create unique constraint and index for device_sessions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_sessions_userId_deviceFingerprint_key') THEN
        ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_deviceFingerprint_key" UNIQUE ("userId", "deviceFingerprint");
    END IF;
END $$;
