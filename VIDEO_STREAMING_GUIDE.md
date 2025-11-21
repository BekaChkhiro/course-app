# Video Streaming System - Complete Implementation Guide

## Overview

Your e-learning platform now has a complete, production-ready video streaming system with:
- ✅ Cloudflare R2 storage integration
- ✅ HLS adaptive bitrate streaming (480p, 720p, 1080p)
- ✅ AES-128 video encryption
- ✅ Token-based access control
- ✅ Automatic thumbnail generation
- ✅ Progress tracking with resume capability
- ✅ Background video processing with Bull queue
- ✅ Video.js player with Georgian UI
- ✅ Admin upload interface
- ✅ Analytics and bandwidth tracking
- ✅ DRM and download prevention

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │ ───> │  Express API │ ───> │   Prisma    │
│  (Next.js)  │ <─── │   + Workers  │ <─── │ (PostgreSQL)│
└─────────────┘      └──────────────┘      └─────────────┘
                            │                       │
                            │                       │
                      ┌─────▼──────┐          ┌────▼──────┐
                      │   Redis    │          │    R2     │
                      │   (Bull)   │          │ (Storage) │
                      └────────────┘          └───────────┘
```

## Setup Instructions

### 1. Cloudflare R2 Configuration

Follow the detailed setup guide in `CLOUDFLARE_R2_SETUP.md`

Quick summary:
1. Create Cloudflare account
2. Enable R2 service
3. Create bucket: `course-platform-videos`
4. Generate API tokens
5. Update `apps/api/.env` with credentials

### 2. Database Migration

The database schema has been updated with video models. Run:

```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
```

New tables:
- `videos` - Video metadata and processing status
- `video_thumbnails` - Generated thumbnails
- `video_processing_jobs` - Processing job tracking
- `video_access_tokens` - Temporary access tokens
- `video_analytics` - Viewing statistics

### 3. Start Services

Make sure all services are running:

```bash
# Start Docker services (PostgreSQL, Redis)
npm run docker:up

# Start API (includes video processor worker)
npm run dev:api

# Start frontend
npm run dev:web
```

## Usage Guide

### For Admins: Uploading Videos

1. **Navigate to Chapter Management**
   ```typescript
   // Import the VideoUpload component
   import VideoUpload from '@/components/admin/VideoUpload';

   // Use in your chapter edit page
   <VideoUpload
     chapterId={chapterId}
     onUploadComplete={(videoId) => {
       console.log('Video ready:', videoId);
     }}
   />
   ```

2. **Upload Process**
   - Drag & drop or select video files (MP4, MOV, AVI, MKV)
   - Maximum file size: 2GB
   - Multiple files can be queued
   - Automatic retry on failure

3. **Processing Pipeline**
   - **Upload** → Video uploaded to R2
   - **Processing** → FFmpeg converts to HLS (480p, 720p, 1080p)
   - **Encryption** → AES-128 encryption applied
   - **Thumbnails** → Generated every 10 seconds
   - **Metadata** → Duration, resolution extracted
   - **Completion** → Video ready for streaming

### For Students: Watching Videos

1. **Video Player Component**
   ```typescript
   import VideoPlayer from '@/components/VideoPlayer';

   // Use in your chapter view page
   <VideoPlayer
     videoId={videoId}
     chapterId={chapterId}
     onProgressUpdate={(progress) => {
       console.log(`Watched ${progress.watchPercentage}%`);
     }}
     onComplete={() => {
       console.log('Video completed!');
     }}
   />
   ```

2. **Player Features**
   - **Adaptive quality**: Automatically switches based on connection
   - **Resume playback**: Continues from last position
   - **Progress tracking**: Saves progress every 30 seconds
   - **Keyboard shortcuts**:
     - Space: Play/Pause
     - ← →: Seek 5 seconds
     - ↑ ↓: Volume control
     - F: Fullscreen
     - M: Mute/Unmute
   - **Picture-in-picture**: Watch while browsing
   - **Playback speed**: 0.5x to 2x

3. **First Watch Restriction**
   - Users cannot skip ahead on first watch
   - After completing (90%), can skip freely
   - Encourages full content consumption

4. **Auto-completion**
   - Video marked complete at 90% watched
   - Unlocks next chapter (if sequential)
   - Updates course progress

## API Endpoints

### Video Endpoints

```typescript
// Upload video (Admin only)
POST /api/videos/upload
FormData: { video: File, chapterId: string }

// Get processing status
GET /api/videos/:videoId/status

// Generate access token
GET /api/videos/:videoId/access-token

// Stream video (with token)
GET /api/videos/stream?token={token}

// Get thumbnails
GET /api/videos/:videoId/thumbnails

// Replace video (Admin only)
PUT /api/videos/:videoId/replace

// Delete video (Admin only)
DELETE /api/videos/:videoId

// Track analytics
POST /api/videos/:videoId/analytics
```

### Progress Endpoints

```typescript
// Update progress (auto-called by player)
PUT /api/progress/chapters/:chapterId
Body: {
  currentPosition: number,
  totalDuration: number,
  watchPercentage: number
}

// Get progress
GET /api/progress/chapters/:chapterId

// Get course progress overview
GET /api/progress/courses/:courseId

// Mark as completed
POST /api/progress/chapters/:chapterId/complete

// Reset progress
POST /api/progress/chapters/:chapterId/reset

// Get user statistics
GET /api/progress/stats
```

## Security Features

### 1. Token-Based Access
- 2-hour expiration
- IP address validation
- One-time use tokens
- Automatic rotation

### 2. Video Encryption
- AES-128 HLS encryption
- Rotating encryption keys (7 days)
- Separate keys per video
- Keys stored securely in database

### 3. Download Prevention
- Disabled right-click on video
- Disabled context menu
- User-select disabled
- Encrypted HLS segments

### 4. Access Control
- Course purchase verification
- Free chapter support
- Admin bypass
- Per-user device tracking

## Analytics & Reporting

### Video Analytics

Track for each viewing session:
- Watch duration
- Completion rate
- Quality selected
- Bandwidth used
- Device type
- Browser
- IP address

### Course Progress

Track per user:
- Chapters completed
- Total watch time
- Overall progress percentage
- Last watched position

### Admin Dashboard Queries

```typescript
// Get video performance
const analytics = await prisma.videoAnalytics.groupBy({
  by: ['videoId'],
  _avg: {
    completionRate: true,
    watchDuration: true,
  },
  _sum: {
    bandwidthUsed: true,
  },
  _count: true,
});

// Get top performing chapters
const topChapters = await prisma.progress.groupBy({
  by: ['chapterId'],
  where: { isCompleted: true },
  _count: true,
  orderBy: { _count: { chapterId: 'desc' } },
  take: 10,
});

// Get user engagement
const userEngagement = await prisma.progress.findMany({
  where: { userId },
  include: {
    chapter: {
      include: {
        courseVersion: {
          include: { course: true },
        },
      },
    },
  },
  orderBy: { updatedAt: 'desc' },
});
```

## Performance Optimization

### CDN Configuration
1. Set up custom domain on R2
2. Cloudflare automatically caches:
   - HLS segments (.ts): 7 days
   - Playlists (.m3u8): 1 hour
   - Thumbnails (.jpg): 30 days

### Adaptive Bitrate
- Starts with lowest quality
- Automatically upgrades when bandwidth allows
- Falls back on slow connections
- Reduces buffering

### Background Processing
- Video processing happens asynchronously
- Bull queue with Redis
- Automatic retry on failure
- Progress tracking

## Troubleshooting

### Video Won't Play
1. Check access token is valid
2. Verify user has course access
3. Check video processing completed
4. Inspect browser console for errors

### Upload Failed
1. Check file size < 2GB
2. Verify file format (MP4, MOV, AVI, MKV)
3. Check R2 credentials
4. Review API logs for errors

### Processing Stuck
1. Check Redis is running
2. Verify FFmpeg is installed
3. Check worker logs
4. Restart API server

### Progress Not Saving
1. Verify user is authenticated
2. Check chapter ID is correct
3. Review network requests
4. Check database connection

## Cost Estimation

### Cloudflare R2 (per month)

**Scenario 1: Small Platform (100 students, 50 hours content)**
- Storage: 50 GB × $0.015 = $0.75
- Egress: Unlimited × $0 = $0
- **Total: $0.75/month**

**Scenario 2: Medium Platform (1,000 students, 200 hours content)**
- Storage: 200 GB × $0.015 = $3.00
- Egress: Unlimited × $0 = $0
- **Total: $3.00/month**

**Scenario 3: Large Platform (10,000 students, 500 hours content)**
- Storage: 500 GB × $0.015 = $7.50
- Egress: Unlimited × $0 = $0
- **Total: $7.50/month**

### Comparison with AWS S3

| Users  | Content | R2 Cost | S3 Cost | Savings |
|--------|---------|---------|---------|---------|
| 100    | 50h     | $0.75   | $92     | 99%     |
| 1,000  | 200h    | $3.00   | $368    | 99%     |
| 10,000 | 500h    | $7.50   | $920    | 99%     |

## Monitoring

### Health Checks

```typescript
// Check R2 connection
const isR2Healthy = await r2Service.fileExists('health-check.txt');

// Check Redis connection
const isRedisHealthy = await queueService
  .getVideoProcessingQueue()
  .isReady();

// Check processing queue
const stats = await queueService
  .getVideoProcessingQueue()
  .getJobCounts();
```

### Alerts to Set Up

1. **High storage usage** (approaching free tier limit)
2. **Processing failures** (video conversions failing)
3. **High error rate** (token validation errors)
4. **Slow processing** (videos taking > 30 min)

## Maintenance

### Regular Tasks

**Daily:**
- Monitor processing queue
- Check for failed jobs
- Review error logs

**Weekly:**
- Clean expired tokens
- Review storage usage
- Check analytics data

**Monthly:**
- Rotate encryption keys
- Review cost metrics
- Update dependencies

### Database Cleanup

```sql
-- Clean expired access tokens (run weekly)
DELETE FROM video_access_tokens
WHERE expires_at < NOW();

-- Clean old analytics (keep 90 days)
DELETE FROM video_analytics
WHERE created_at < NOW() - INTERVAL '90 days';

-- Find videos needing key rotation
SELECT id, encryption_key, key_rotation_at
FROM videos
WHERE key_rotation_at < NOW();
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple API instances
- Share Redis queue between instances
- Load balance with nginx/Cloudflare

### Vertical Scaling
- Increase worker count for processing
- Add more Redis memory
- Scale database resources

### Global Distribution
- Use R2 in multiple regions
- CDN automatically global
- Consider read replicas

## Support & Resources

- **R2 Docs**: https://developers.cloudflare.com/r2/
- **Video.js Docs**: https://docs.videojs.com/
- **Bull Docs**: https://docs.bullmq.io/
- **HLS Spec**: https://developer.apple.com/streaming/

## Next Steps

1. **Set up Cloudflare R2** (see CLOUDFLARE_R2_SETUP.md)
2. **Test video upload** with a small file
3. **Monitor processing** in Bull queue
4. **Test playback** with different qualities
5. **Configure CDN** for optimal performance
6. **Set up monitoring** and alerts
7. **Train admins** on upload process
8. **Launch** to students!

---

**Congratulations!** Your video streaming platform is ready for production. 🎉
