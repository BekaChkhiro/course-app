/**
 * Video Processing Worker Entry Point
 *
 * This worker handles background video processing tasks:
 * - HLS conversion (multiple qualities: 480p, 720p, 1080p)
 * - Thumbnail generation
 * - Metadata extraction
 *
 * Run with: npm run worker:video (development)
 * Or: npm run start:worker (production)
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from api directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import './videoProcessor';

console.log('🎬 Video Processing Worker Started');
console.log(`📍 Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
console.log('⏳ Waiting for jobs...\n');

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Worker shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Worker received SIGTERM...');
  process.exit(0);
});
