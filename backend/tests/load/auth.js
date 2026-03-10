import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: `user${Math.floor(Math.random() * 1000)}@test.com`,
    password: 'testpassword123',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status is 200 or 401': (r) => r.status === 200 || r.status === 401 });
  sleep(0.1);
}
