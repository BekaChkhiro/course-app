# Video Streaming System - Testing Guide

## ✅ Testing Checklist

### Test 1: Video Upload with Progress Bar
**მიზანი:** 100MB ვიდეო უნდა აიტვირთოს და დაპროცესდეს HLS ფორმატში

**ნაბიჯები:**
1. გახსენით ბრაუზერი და შედით როგორც admin
2. გადადით ნებისმიერ Chapter-ზე
3. გამოიყენეთ VideoUpload კომპონენტი:
   ```tsx
   // Add to your chapter edit page
   import VideoUpload from '@/components/admin/VideoUpload';

   <VideoUpload
     chapterId={chapterId}
     onUploadComplete={(videoId) => {
       console.log('Video ready:', videoId);
     }}
   />
   ```

4. ჩააგდეთ ან აირჩიეთ ვიდეო (100MB)
5. **დააკვირდით:**
   - ✅ Progress bar უნდა გამოჩნდეს
   - ✅ პროცენტი უნდა იზრდებოდეს (0% → 100%)
   - ✅ სტატუსი უნდა შეიცვალოს: "ატვირთვა..." → "დამუშავება..." → "დასრულდა"

**Debug Commands:**
```bash
# Check upload in progress
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/videos/VIDEO_ID/status

# Check Bull queue
curl http://localhost:4000/api/videos/queue-stats

# Check Redis
redis-cli -h localhost -p 6379
> KEYS *video*
> GET bull:video-processing:*
```

**Expected Output:**
- Status: PENDING → UPLOADING → PROCESSING → COMPLETED
- Progress: 0 → 100
- HLS files created in R2: master.m3u8, 480p/, 720p/, 1080p/

---

### Test 2: Automatic Quality Switching
**მიზანი:** Video player უნდა ავტომატურად გადართოს quality connection-ის მიხედვით

**ნაბიჯები:**
1. გახსენით ვიდეო პლეიერი:
   ```tsx
   import VideoPlayer from '@/components/VideoPlayer';

   <VideoPlayer
     videoId={videoId}
     chapterId={chapterId}
   />
   ```

2. გაუშვით ვიდეო
3. გახსენით Browser DevTools (F12) → Network tab
4. **დააკვირდით:**
   - ✅ თავიდან იწყებს 480p-ით
   - ✅ კარგი connection-ზე გადადის 720p ან 1080p-ზე
   - ✅ Network tab-ში ჩანს .ts segments-ები სხვადასხვა quality-ის

**Manual Quality Test:**
```bash
# Simulate slow connection in DevTools
1. F12 → Network tab
2. Throttling dropdown → Choose "Slow 3G"
3. Refresh video player
4. Should start with 480p and stay there

# Simulate fast connection
1. Throttling dropdown → "No throttling"
2. Refresh video player
3. Should upgrade to 1080p (if available)
```

**Expected Behavior:**
- Fast connection → 720p or 1080p
- Medium connection → 480p or 720p
- Slow connection → 480p
- No buffering/stuttering during quality changes

---

### Test 3: Resume Playback
**მიზანი:** დახურეთ tab 5:30-ზე → გახსენით → უნდა განაგრძოს 5:30-დან

**ნაბიჯები:**
1. გაუშვით ვიდეო და ნახეთ 5:30-მდე
2. დაელოდეთ 30 წამს (progress ავტომატურად შეინახება ყოველ 30 წამში)
3. დახურეთ tab ან browser
4. გახსენით თავიდან იგივე chapter
5. **დააკვირდით:**
   - ✅ ვიდეო უნდა იწყებოდეს 5:30-დან (არა 0:00-დან)
   - ✅ Console-ში უნდა ჩანდეს: "Resuming from 5:30"

**Debug Database:**
```bash
# Check saved progress in database
npm run db:studio
# Open http://localhost:5555
# Go to Progress table
# Find your user + chapter
# Check lastPosition field (should be ~330 seconds)
```

**SQL Query:**
```sql
SELECT
  u.email,
  c.title as chapter,
  p.lastPosition,
  p.watchPercentage,
  p.updatedAt
FROM progress p
JOIN users u ON p.userId = u.id
JOIN chapters c ON p.chapterId = c.id
WHERE u.id = 'YOUR_USER_ID'
ORDER BY p.updatedAt DESC;
```

**Expected Result:**
- lastPosition: ~330 (seconds)
- watchPercentage: calculated based on duration
- Video resumes from saved position

---

### Test 4: Right-Click Disabled
**მიზანი:** Video-ზე right-click უნდა იყოს disabled

**ნაბიჯები:**
1. გაუშვით ვიდეო player
2. Right-click (მარჯვენა ღილაკი) ვიდეოზე
3. **დააკვირდით:**
   - ✅ Context menu არ უნდა გამოჩნდეს
   - ✅ "Save video as..." არ უნდა ჩანდეს
   - ✅ Player controls კი უნდა მუშაობდეს

**Additional Security Tests:**
```javascript
// Open DevTools Console and try:

// Test 1: Try to get video source
console.log(document.querySelector('video').src);
// Should show: blob:http://... or encrypted URL

// Test 2: Try to download
var video = document.querySelector('video');
var a = document.createElement('a');
a.href = video.src;
a.download = 'video.mp4';
a.click();
// Should fail or download useless blob

// Test 3: Check if selection is disabled
window.getSelection().toString();
// Should return empty string when selecting video area
```

**Expected Behavior:**
- Right-click: Disabled ✅
- Context menu: Hidden ✅
- Direct download: Blocked ✅
- Source URL: Encrypted/token-protected ✅

---

### Test 5: Quality Drop on Slow Connection
**მიზანი:** ნელ connection-ზე უნდა ჩამოვარდეს დაბალ quality-ზე

**ნაბიჯები:**
1. გაუშვით ვიდეო სწრაფ connection-ზე
2. დაელოდეთ რომ აიწიოს 720p ან 1080p-მდე
3. გახსენით DevTools (F12) → Network tab
4. Throttling → "Slow 3G"
5. **დააკვირდით:**
   - ✅ რამდენიმე წამში უნდა ჩამოვიდეს 480p-ზე
   - ✅ არ უნდა იყოს buffering
   - ✅ Console-ში ჩანს quality change

**Monitor Quality Changes:**
```javascript
// Open DevTools Console
// Run this to monitor quality changes:
setInterval(() => {
  const video = document.querySelector('video');
  if (video) {
    console.log('Current quality:', {
      width: video.videoWidth,
      height: video.videoHeight,
      buffered: video.buffered.length,
      currentTime: video.currentTime
    });
  }
}, 5000);
```

**Quality Levels:**
- Fast (>5 Mbps): 1080p (1920x1080)
- Medium (2-5 Mbps): 720p (1280x720)
- Slow (<2 Mbps): 480p (854x480)

**Expected Behavior:**
- Smooth quality transitions
- No buffering during downgrade
- Automatic upgrade when connection improves
- Playback never stops

---

### Test 6: Auto-Complete at 90%
**მიზანი:** როცა 90%-ს დაათვალიერებთ, უნდა mark as completed

**ნაბიჯები:**
1. გაუშვით ახალი ვიდეო (რომელიც არ გაქვთ ნანახი)
2. გადადით ბოლოსკენ (last 10% დატოვეთ)
3. ნახეთ ბოლომდე
4. როცა მიაღწევთ ~90%-ს:
   - **დააკვირდით:**
   - ✅ Console-ში: "Video completed!"
   - ✅ Database-ში isCompleted უნდა იყოს true
   - ✅ Course progress უნდა განახლდეს
   - ✅ შემდეგი chapter უნდა განიბლოკოს (თუ sequential)

**Check Completion:**
```javascript
// Console check
fetch(`${API_URL}/api/progress/chapters/${chapterId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('Progress:', data));

// Should show:
// {
//   isCompleted: true,
//   watchPercentage: >= 90,
//   canSkipAhead: true,
//   firstWatchCompleted: true
// }
```

**Database Verification:**
```sql
SELECT
  c.title,
  p.watchPercentage,
  p.isCompleted,
  p.canSkipAhead,
  p.firstWatchCompleted,
  p.totalWatchTime
FROM progress p
JOIN chapters c ON p.chapterId = c.id
WHERE p.userId = 'YOUR_USER_ID'
  AND c.id = 'CHAPTER_ID';
```

**Expected Results:**
- watchPercentage: >= 90
- isCompleted: true
- canSkipAhead: true
- firstWatchCompleted: true
- onComplete callback fired

---

## 🔧 Debugging Tools

### Check Video Processing Status
```bash
# Get video status
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4000/api/videos/VIDEO_ID/status

# Response should include:
{
  "success": true,
  "data": {
    "processingStatus": "COMPLETED",
    "processingProgress": 100,
    "hlsMasterUrl": "https://...",
    "duration": 600
  }
}
```

### Check Redis Queue
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Check active jobs
KEYS bull:video-processing:*
LRANGE bull:video-processing:active 0 -1

# Check completed jobs
LRANGE bull:video-processing:completed 0 -1

# Check failed jobs
LRANGE bull:video-processing:failed 0 -1
```

### Check API Logs
```bash
# If running with npm run dev:api
# Logs appear in terminal

# Look for:
# - "Starting video processing for video XXX"
# - "HLS generation completed for 480p"
# - "Video processing completed for XXX"
```

### Check Database
```bash
# Start Prisma Studio
npm run db:studio
# Open http://localhost:5555

# Or use SQL directly:
npm run db:push  # Ensure schema is up to date

# Check tables:
# - videos (processing status)
# - video_processing_jobs (job status)
# - progress (user progress)
# - video_analytics (viewing data)
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Video Upload Fails
**Symptoms:** Upload stops at 0% or errors immediately

**Solutions:**
```bash
# Check R2 credentials
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY
echo $R2_BUCKET_NAME

# Test R2 connection
node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: 'https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
client.send(new ListBucketsCommand({}))
  .then(d => console.log('Connected!', d))
  .catch(e => console.error('Failed:', e));
"
```

### Issue 2: Processing Stuck
**Symptoms:** Status stays at "PROCESSING" forever

**Solutions:**
```bash
# Check if worker is running
ps aux | grep node

# Check Redis is running
redis-cli ping
# Should return: PONG

# Check queue status
redis-cli LLEN bull:video-processing:active
redis-cli LLEN bull:video-processing:failed

# Restart API (includes worker)
# Ctrl+C in terminal running npm run dev:api
npm run dev:api
```

### Issue 3: Video Won't Play
**Symptoms:** Black screen, no error

**Solutions:**
```bash
# Check processing completed
curl http://localhost:4000/api/videos/VIDEO_ID/status

# Check access token generated
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:4000/api/videos/VIDEO_ID/access-token

# Check HLS files exist in R2
# Log into Cloudflare dashboard
# R2 → Your bucket → Browse files
# Look for: courses/COURSE_ID/chapters/CHAPTER_ID/hls/VIDEO_ID/
```

### Issue 4: Progress Not Saving
**Symptoms:** Always starts from 0:00

**Solutions:**
```javascript
// Check if progress API is being called
// Open DevTools → Network tab
// Filter: "progress"
// Should see PUT requests every 30 seconds

// Check response
// Should return 200 OK with:
{
  "success": true,
  "data": {
    "lastPosition": 330,
    "watchPercentage": 55,
    "isCompleted": false
  }
}
```

---

## ✅ Success Criteria

All tests should pass:
- [x] Upload shows progress 0-100%
- [x] Video converts to HLS with 3 qualities
- [x] Player switches quality automatically
- [x] Progress saves every 30 seconds
- [x] Playback resumes from saved position
- [x] Right-click is disabled
- [x] Quality drops on slow connection
- [x] Marks complete at 90%

---

## 📊 Performance Benchmarks

**Upload Speed:**
- 100MB video: ~30-60 seconds (depends on connection)

**Processing Time:**
- 100MB video (~10 minutes): ~5-10 minutes
- Includes: HLS conversion (3 qualities) + thumbnails + metadata

**Streaming Performance:**
- Initial load: <2 seconds
- Quality switch: <1 second
- Seek time: <0.5 seconds

**Storage:**
- Original 100MB MP4 → ~150MB total (with all HLS variants)
- R2 cost: $0.0023/month for 150MB

---

## 🎯 Ready for Production Checklist

Before going live:
- [ ] R2 credentials configured
- [ ] Custom domain set up (for CDN)
- [ ] Redis persistence enabled
- [ ] Database backups configured
- [ ] Error monitoring set up
- [ ] Rate limiting enabled
- [ ] SSL certificates valid
- [ ] Test with real users
- [ ] Load testing completed
- [ ] Documentation shared with team

**თუ ყველა ტესტი გავიდა - გილოცავთ! სისტემა მზადაა production-ისთვის! 🚀**
