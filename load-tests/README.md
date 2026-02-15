# Load Tests

Uses [k6](https://k6.io). Install: `brew install k6`

## Running

```bash
# Smoke test (5 VUs, 1 minute)
k6 run --vus 5 --duration 1m load-tests/auth-flow.js

# Load test (100 VUs, 5 minutes)
k6 run --vus 100 --duration 5m load-tests/session-flow.js

# Stress test (1000 VUs peak)
k6 run load-tests/stress-test.js
```

## Environment Variables

Set `BASE_URL` to target a specific environment:

```bash
BASE_URL=https://api.hemisphere.app k6 run load-tests/stress-test.js
```

Default is `http://localhost:3001`.

## Test Files

| File | Purpose | VUs | Duration |
|------|---------|-----|----------|
| `auth-flow.js` | Login/signup endpoints | 50 | 2 minutes |
| `session-flow.js` | Full authenticated session: login → review → complete | 100 | 5 minutes |
| `stress-test.js` | Ramp to 1,000 concurrent VUs | 0–1000 | ~14 minutes |

## Thresholds

All scripts enforce thresholds that match production SLOs:

- `auth-flow.js` and `session-flow.js`: p95 latency < 500ms, error rate < 1%
- `stress-test.js`: p95 latency < 2000ms, error rate < 5%

## Setup: Test Users

The session-flow test requires pre-seeded test accounts. Run the seed script before load testing:

```bash
pnpm --filter @hemisphere/db seed:test-users
```

This creates 1,000 users with emails `user0@test.com` through `user999@test.com` and password `TestPassword123!`.
