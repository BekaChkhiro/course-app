# Production Deployment Checklist

This comprehensive checklist ensures a safe and successful production deployment of the E-Learning Platform.

## Pre-Deployment Checklist

### 1. Code & Build
- [ ] All tests pass (`npm run test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Build succeeds for both API and Web (`npm run build`)
- [ ] All console.logs removed from production code
- [ ] Debug code removed
- [ ] All TODO comments addressed or tracked

### 2. Environment Configuration
- [ ] `.env.production` created from template
- [ ] All environment variables set correctly
- [ ] JWT secrets are strong (min 64 characters, randomly generated)
- [ ] Database connection string is correct
- [ ] Redis connection string is correct
- [ ] Stripe keys are production keys (not test keys)
- [ ] R2/S3 credentials configured
- [ ] Email service (Resend) configured
- [ ] Sentry DSN configured

### 3. Database
- [ ] Database migrations are up to date
- [ ] Database indexes created (see prisma/schema.prisma)
- [ ] Database connection pooling configured
- [ ] Database user has minimum required permissions
- [ ] Database backup system tested
- [ ] Point-in-time recovery enabled

### 4. Security
- [ ] SSL/TLS certificates valid and installed
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS origins configured correctly
- [ ] Rate limiting configured
- [ ] Security headers enabled (CSP, HSTS, etc.)
- [ ] Admin panel access restricted
- [ ] API authentication middleware active
- [ ] Password requirements enforced
- [ ] Session timeouts configured
- [ ] Sensitive data encrypted at rest

### 5. Infrastructure
- [ ] Docker images built and tested
- [ ] Docker Compose production file configured
- [ ] Nginx reverse proxy configured
- [ ] Load balancer configured (if applicable)
- [ ] Auto-scaling configured (if applicable)
- [ ] Health check endpoints working
- [ ] Graceful shutdown implemented

## Deployment Day Checklist

### 1. Pre-Deployment (T-2 hours)
- [ ] Notify team of upcoming deployment
- [ ] Verify all staging tests pass
- [ ] Create database backup
- [ ] Document current state (commit hash, database version)
- [ ] Prepare rollback plan
- [ ] Verify monitoring dashboards accessible

### 2. Deployment (T-0)
- [ ] Enable maintenance mode (if needed)
- [ ] Run database migrations
- [ ] Deploy API service
- [ ] Verify API health check passes
- [ ] Deploy Web service
- [ ] Verify Web health check passes
- [ ] Disable maintenance mode

### 3. Post-Deployment (T+15 minutes)
- [ ] Verify all services running
- [ ] Test authentication flow
- [ ] Test critical user flows:
  - [ ] Login/Register
  - [ ] View courses
  - [ ] Play video content
  - [ ] Take quiz
  - [ ] Make purchase (if applicable)
- [ ] Check error monitoring (Sentry)
- [ ] Check performance metrics
- [ ] Verify logs are flowing

### 4. Post-Deployment (T+1 hour)
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Monitor resource usage (CPU, Memory, Disk)
- [ ] Verify all background jobs running
- [ ] Check email delivery working
- [ ] Notify team of successful deployment

## Rollback Procedure

If issues are detected after deployment:

1. **Assess Severity**
   - Critical: Immediate rollback
   - High: Rollback within 30 minutes if not fixed
   - Medium: Continue monitoring, fix forward if possible

2. **Execute Rollback**
   ```bash
   # Stop current deployment
   ./scripts/deploy.sh stop

   # Restore database backup (if needed)
   ./scripts/backup.sh restore /backup/daily/latest.sql.gz

   # Deploy previous version
   git checkout <previous-commit>
   ./scripts/deploy.sh quick
   ```

3. **Post-Rollback**
   - Verify services working
   - Notify team
   - Document issue
   - Schedule post-mortem

## Monitoring Checklist

### Daily Monitoring
- [ ] Check error rates in Sentry
- [ ] Review performance metrics
- [ ] Check database query performance
- [ ] Verify backup completed
- [ ] Check disk space usage
- [ ] Review security alerts

### Weekly Monitoring
- [ ] Review user growth metrics
- [ ] Check SSL certificate expiration
- [ ] Review application logs for patterns
- [ ] Check dependency vulnerabilities
- [ ] Review rate limiting effectiveness
- [ ] Verify backup restoration works

### Monthly Monitoring
- [ ] Full security audit
- [ ] Load testing review
- [ ] Cost optimization review
- [ ] Review and rotate secrets
- [ ] Update dependencies
- [ ] Review and update documentation

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | TBD | email@company.com |
| Backend Lead | TBD | email@company.com |
| Frontend Lead | TBD | email@company.com |
| DBA | TBD | email@company.com |
| Security | TBD | email@company.com |

## Service Dependencies

| Service | Provider | Status Page |
|---------|----------|-------------|
| Database | Railway/AWS | status.railway.app |
| Redis | Railway/Redis Cloud | status.redis.com |
| Storage | Cloudflare R2 | cloudflarestatus.com |
| Email | Resend | status.resend.com |
| Payments | Stripe | status.stripe.com |
| CDN | Cloudflare | cloudflarestatus.com |

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Page Load Time | < 2s | > 3s |
| API Response Time | < 200ms | > 500ms |
| Video Start Time | < 3s | > 5s |
| Error Rate | < 0.1% | > 1% |
| Uptime | 99.9% | < 99.5% |
| CPU Usage | < 70% | > 85% |
| Memory Usage | < 80% | > 90% |
| Disk Usage | < 70% | > 85% |

## Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P0 | Complete outage | Immediate | All hands |
| P1 | Major feature broken | 15 minutes | On-call team |
| P2 | Minor feature broken | 1 hour | Team lead |
| P3 | Low impact issue | 4 hours | Normal queue |
| P4 | Cosmetic/minor | Next sprint | Backlog |

### Incident Response Steps

1. **Identify**: Confirm the issue and assess impact
2. **Communicate**: Notify stakeholders via appropriate channels
3. **Mitigate**: Apply quick fix or rollback if needed
4. **Investigate**: Find root cause
5. **Resolve**: Implement permanent fix
6. **Document**: Write post-mortem and update runbooks

## Compliance & Legal

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] GDPR compliance (if applicable)
- [ ] Data retention policy documented
- [ ] User data export capability
- [ ] Account deletion capability

## Launch Day Communication

### Internal
- [ ] Engineering team briefed
- [ ] Support team trained
- [ ] Status page updated
- [ ] Monitoring dashboards shared

### External (if applicable)
- [ ] Announcement blog post ready
- [ ] Social media posts scheduled
- [ ] Email to existing users prepared
- [ ] Press release ready (if needed)

---

## Quick Commands Reference

```bash
# Full deployment
./scripts/deploy.sh deploy

# Quick deployment (skip backup)
./scripts/deploy.sh quick

# Check status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs api
./scripts/deploy.sh logs web

# Create backup
./scripts/backup.sh backup daily

# Restore backup
./scripts/backup.sh restore /backup/daily/backup.sql.gz

# Health check
curl https://api.yourdomain.com/health

# Database migrations
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

---

**Last Updated**: $(date)
**Document Owner**: Engineering Team
