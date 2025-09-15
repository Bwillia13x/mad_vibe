# 🚀 Production Deployment Checklist

**Pre-Deployment Validation:** ✅ All items must be completed before going live

## Environment Setup
- [ ] Copy `.env.production.example` to `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure `SESSION_SECRET` with a secure random string
- [ ] Set `OPENAI_API_KEY` if AI features are required
- [ ] Configure `DATABASE_URL` if using external database
- [ ] Set `DEMO_MODE=false` for production

## Security Configuration
- [ ] Verify security headers are enabled
- [ ] Confirm HTTPS is configured at load balancer/proxy level
- [ ] Validate CSP (Content Security Policy) settings
- [ ] Test authentication and authorization flows
- [ ] Verify input validation is working

## Performance Optimization
- [ ] Run `npm run build` to create production assets
- [ ] Verify gzip compression is enabled at proxy level
- [ ] Configure CDN for static assets (optional)
- [ ] Set up monitoring and alerting
- [ ] Test under expected load

## Infrastructure
- [ ] Docker image built and tested
- [ ] Kubernetes manifests configured (if using K8s)
- [ ] Health check endpoints responding
- [ ] Auto-scaling policies configured
- [ ] Backup procedures in place

## Final Validation
- [ ] Run `npm run smoke` - all tests pass
- [ ] Verify all business modules are functional
- [ ] Test critical user workflows
- [ ] Confirm error handling and logging
- [ ] Validate performance metrics

## Post-Deployment
- [ ] Monitor application logs for errors
- [ ] Verify performance metrics are within targets
- [ ] Test all major features in production
- [ ] Confirm monitoring and alerting are working
- [ ] Document any production-specific configurations

## Rollback Plan
- [ ] Previous version image/deployment ready
- [ ] Database migration rollback scripts (if applicable)
- [ ] DNS/load balancer rollback procedure documented
- [ ] Monitoring for rollback triggers defined

---

**Deployment Command:**
```bash
# Build and start production server
npm run build
npm start

# Or using Docker
docker build -t andreas-vibe .
docker run -p 5000:5000 --env-file .env andreas-vibe
```

**Health Check:** `GET /api/health` should return `{"status":"ok"}`