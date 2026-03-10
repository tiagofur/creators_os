import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(99)<5000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN = __ENV.AUTH_TOKEN || 'test-token';
const WORKSPACE_ID = __ENV.WORKSPACE_ID || 'test-workspace-id';
const CONV_ID = __ENV.CONV_ID || 'test-conv-id';

export default function () {
  const res = http.post(
    `${BASE_URL}/api/v1/workspaces/${WORKSPACE_ID}/ai/conversations/${CONV_ID}/messages`,
    JSON.stringify({ content: 'Generate a content idea for a tech channel' }),
    { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
  );
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
