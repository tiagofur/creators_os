import http from 'k6/http';
import { check, sleep } from 'k6';

// ---------------------------------------------------------------------------
// Creators OS — k6 frontend load test
// ---------------------------------------------------------------------------
// Usage:
//   k6 run frontend-load.js                          # uses default BASE_URL
//   k6 run -e BASE_URL=https://staging.example.com frontend-load.js
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // ramp up to 100 virtual users
    { duration: '3m', target: 100 },  // sustained load
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95th percentile response time < 2 s
    http_req_failed: ['rate<0.01'],    // error rate < 1 %
  },
};

export default function () {
  // 1. Dashboard page
  const dashboardRes = http.get(`${BASE_URL}/en/dashboard`);
  check(dashboardRes, {
    'dashboard status 200': (r) => r.status === 200,
  });
  sleep(1);

  // 2. Ideas page
  const ideasRes = http.get(`${BASE_URL}/en/ideas`);
  check(ideasRes, {
    'ideas status 200': (r) => r.status === 200,
  });
  sleep(1);

  // 3. Pipeline page
  const pipelineRes = http.get(`${BASE_URL}/en/pipeline`);
  check(pipelineRes, {
    'pipeline status 200': (r) => r.status === 200,
  });
  sleep(1);
}
