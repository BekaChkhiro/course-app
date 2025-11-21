# Cloudflare R2 Setup Guide

This guide will help you set up Cloudflare R2 for video storage in your e-learning platform.

## What is Cloudflare R2?

Cloudflare R2 is an S3-compatible object storage service with zero egress fees, making it perfect for video streaming where bandwidth costs can be significant.

## Step 1: Create a Cloudflare Account

1. Go to https://cloudflare.com
2. Sign up for a free account or log in if you already have one
3. Navigate to the R2 section from the dashboard

## Step 2: Enable R2

1. Click on "R2" in the left sidebar
2. If you haven't used R2 before, click "Purchase R2" (it has a free tier)
3. Free tier includes:
   - 10 GB storage per month
   - 1 million Class A operations per month
   - 10 million Class B operations per month
   - No egress fees!

## Step 3: Create an R2 Bucket

1. Click "Create bucket"
2. Enter a bucket name (e.g., `course-platform-videos`)
   - Must be globally unique
   - Use lowercase letters, numbers, and hyphens only
3. Choose a location (for best performance, choose closest to your users)
4. Click "Create bucket"

## Step 4: Generate R2 API Tokens

1. Go to R2 → Overview
2. Click "Manage R2 API Tokens" on the right sidebar
3. Click "Create API Token"
4. Configure the token:
   - **Token name**: `course-platform-api`
   - **Permissions**: Select "Object Read & Write"
   - **Specify bucket**: Select your bucket (`course-platform-videos`)
   - **TTL**: Leave as default (no expiration) or set as needed
5. Click "Create API Token"
6. **IMPORTANT**: Copy and save these credentials immediately:
   - Access Key ID
   - Secret Access Key
   - You won't be able to see the secret again!

## Step 5: Configure Public Access (for CDN)

### Option A: Public Bucket with Custom Domain (Recommended)

1. In your bucket settings, go to "Settings" tab
2. Under "Public access", click "Allow Access"
3. Set up a custom domain:
   - Go to "R2" → Your bucket → "Settings"
   - Under "Custom domains", click "Connect Domain"
   - Enter your domain (e.g., `videos.yourdomain.com`)
   - Follow DNS setup instructions
   - This enables free CDN with caching!

### Option B: Use r2.dev Subdomain (Quick Setup)

1. In your bucket settings, enable "Public r2.dev subdomain"
2. You'll get a URL like: `https://pub-xxxxx.r2.dev`
3. This works but doesn't include CDN caching

## Step 6: Get Your Account ID

1. Go to R2 → Overview
2. Your Account ID is displayed on the right side
3. Copy this ID

## Step 7: Update Your .env File

Update `apps/api/.env` with your R2 credentials:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id-here
R2_ACCESS_KEY_ID=your-access-key-id-here
R2_SECRET_ACCESS_KEY=your-secret-access-key-here
R2_BUCKET_NAME=course-platform-videos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # or your custom domain
```

## Step 8: Test the Connection

You can test the R2 connection by running:

```bash
npm run dev:api
```

Then upload a test video through the admin panel.

## Pricing Information

### Free Tier (Per Month)
- 10 GB storage
- 1 million Class A operations (writes)
- 10 million Class B operations (reads)
- **Zero egress fees** (no bandwidth charges!)

### Paid Tier (if you exceed free tier)
- **Storage**: $0.015 per GB/month
- **Class A operations**: $4.50 per million requests
- **Class B operations**: $0.36 per million requests
- **Egress**: $0.00 (always free!)

### Cost Comparison Example

For 100 GB storage with 1 TB monthly bandwidth:

**Cloudflare R2:**
- Storage: 100 GB × $0.015 = $1.50
- Egress: 1 TB × $0 = $0
- **Total: $1.50/month**

**AWS S3:**
- Storage: 100 GB × $0.023 = $2.30
- Egress: 1 TB × $0.09 = $92.16
- **Total: $94.46/month**

**Savings: 98%!**

## CDN Setup for Optimal Performance

### Using Custom Domain with Cloudflare CDN (Recommended)

1. Add your domain to Cloudflare
2. Connect R2 bucket to custom domain as shown in Step 5
3. Benefits:
   - Automatic global CDN
   - Edge caching
   - DDoS protection
   - SSL/TLS included
   - Faster video delivery worldwide

### Cache Rules

Cloudflare automatically caches R2 content when using custom domains:
- Video segments (.ts files): Cached for 7 days
- Playlists (.m3u8): Cached for 1 hour
- Thumbnails (.jpg): Cached for 30 days

## Security Best Practices

1. **Never commit R2 credentials to git**
   - They're in `.env` files which are gitignored
   - Rotate keys if accidentally exposed

2. **Use signed URLs for private videos**
   - The platform automatically generates time-limited access tokens
   - URLs expire after 2 hours

3. **Enable versioning** (optional)
   - Go to bucket settings → Versioning
   - Helps recover from accidental deletions

4. **Set up lifecycle policies** (optional)
   - Automatically delete incomplete uploads after 7 days
   - Saves storage costs

## Monitoring Usage

1. Go to R2 → Overview
2. View metrics:
   - Storage used
   - Operations count
   - Current month costs

3. Set up email alerts:
   - Go to Notifications
   - Create alert for R2 usage
   - Get notified if approaching free tier limits

## Troubleshooting

### Error: "Access Denied"
- Check that your API token has correct permissions
- Verify bucket name is correct
- Ensure token is not expired

### Error: "Bucket not found"
- Verify bucket name in .env matches exactly
- Check account ID is correct

### Videos not loading
- Verify public access is enabled
- Check R2_PUBLIC_URL is correct
- Test URL directly in browser

### Slow video loading
- Set up custom domain for CDN
- Enable Cloudflare caching
- Consider using multiple regions

## Next Steps

1. ✅ Set up R2 bucket
2. ✅ Configure API tokens
3. ✅ Update .env file
4. 🎬 Start uploading videos!
5. 📊 Monitor usage and costs

## Support

- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- Cloudflare Discord: https://discord.gg/cloudflare
- Platform Issues: Check app logs in `apps/api`

---

**Ready to go?** Your video streaming platform is now configured with enterprise-grade storage at fraction of the cost!
