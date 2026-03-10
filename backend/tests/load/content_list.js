import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '2m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN = __ENV.AUTH_TOKEN || 'test-token';
const WORKSPACE_ID = __ENV.WORKSPACE_ID || 'test-workspace-id';

export default function () {
  const res = http.get(
    `${BASE_URL}/api/v1/workspaces/${WORKSPACE_ID}/contents`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  check(res, { 'status is 200': (r) => r.status === 200 });
}
