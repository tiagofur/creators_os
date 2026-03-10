# Load Tests (k6)

## Prerequisites
- k6 installed: https://k6.io/docs/get-started/installation/
- Backend running locally or on staging

## Running

```bash
# Run all load tests
make load-test

# Run individual test
k6 run tests/load/auth.js -e BASE_URL=http://localhost:8080

# Run content list test with auth
k6 run tests/load/content_list.js \
  -e BASE_URL=http://localhost:8080 \
  -e AUTH_TOKEN=your_jwt_token \
  -e WORKSPACE_ID=your_workspace_id
```

## Thresholds
| Endpoint | p99 target | Error rate |
|----------|-----------|------------|
| Auth login | < 200ms | < 1% |
| Content list | < 100ms | < 1% |
| AI chat | < 5s | < 5% |

## Tuning Notes
- `pgxpool MaxConns=20` baseline; increase to 50 for high-traffic production
- Redis `PoolSize=10` baseline; increase to 25 for high concurrency
- Set `GOGC=100` (default) in production; increase to 200 to reduce GC pressure at high RPS
