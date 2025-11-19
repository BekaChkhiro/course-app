-- Initialize database with any required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE course_platform'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'course_platform')\gexec
