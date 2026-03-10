# Backend Sign-Off Checklist

Use this checklist before marking the backend as production-ready and unblocking frontend development.

## Quality Gates

### Testing
- [ ] All unit tests pass: `go test -race ./...`
- [ ] All integration tests pass: `go test -tags=integration -race ./tests/integration/`
- [ ] Load test: auth p99 < 200ms at 500 RPS
- [ ] Load test: content list p99 < 100ms at 1000 RPS
- [ ] Load test: AI chat p99 < 5s

### Security
- [ ] `govulncheck ./...` — 0 known vulnerabilities with available fix
- [ ] `gosec -quiet ./...` — 0 HIGH severity unacknowledged findings
- [ ] CORS: `CORS_ALLOWED_ORIGINS` locked to specific domains (no `*` in production)
- [ ] Security headers verified: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- [ ] AES-256-GCM encryption verified for platform credentials
- [ ] JWT RS256 keys rotatable without downtime (zero-downtime key rotation procedure documented)

### Functionality
- [ ] All 40+ API endpoints return correct status codes (smoke test against staging)
- [ ] Auth flow: register → login → refresh → logout cycle verified
- [ ] Workspace RBAC: all role-gated endpoints tested (403 for insufficient role)
- [ ] AI credit deduction atomic under concurrent load (race test passes)
- [ ] Rate limits enforced per tier (free/pro/enterprise verified)
- [ ] WebSocket broadcast workspace-scoped (cross-workspace isolation verified)
- [ ] Stripe webhook idempotency verified (duplicate event does not double-process)

### Operations
- [ ] Audit log recording verified for all mutating operations
- [ ] Prometheus metrics reachable on internal metrics port
- [ ] CloudWatch alarms configured for: error rate > 1%, p99 > 500ms, DB connections > 15
- [ ] Database migrations: all 30 migrations apply cleanly to fresh DB
- [ ] Rollback procedure tested in staging

### Documentation
- [ ] OpenAPI spec (`docs/swagger/swagger.json`) up to date
- [ ] Staging deployment runbook verified
- [ ] Production deployment runbook verified
- [ ] All secrets documented in runbook with rotation schedule

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Backend Lead | | | |
| Security Review | | | |
| QA Lead | | | |
