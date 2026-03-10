# Production Deployment Runbook

## Differences from Staging
- `APP_ENV=production` — auto-migrate on boot is DISABLED; always run `make migrate-up` manually pre-deploy
- `DATABASE_URL` uses `sslmode=require`
- Metrics endpoint bound to internal port only (not exposed via ALB)
- CORS locked down: `CORS_ALLOWED_ORIGINS` must not contain `*`
- ECS service: min 2 tasks, max 10 tasks (auto-scaling)

## Pre-deploy Checklist
- [ ] All integration tests pass: `go test -tags=integration ./tests/integration/`
- [ ] Load tests pass at baseline thresholds
- [ ] `make security-scan` exits 0
- [ ] Migration reviewed by second engineer
- [ ] Rollback plan documented for this deploy

## Deploy Steps
Same as staging runbook but with `--cluster ordo-production --profile production`.

## Post-deploy Verification
```bash
curl https://api.ordo.app/health
# Check CloudWatch dashboard for error rate spike
# Verify Prometheus metrics: http_request_duration_seconds p99 < 100ms
```
