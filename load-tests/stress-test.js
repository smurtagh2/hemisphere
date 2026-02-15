import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 VUs over 2 minutes
    { duration: '5m', target: 500 },   // Ramp up to 500 VUs over 5 minutes
    { duration: '5m', target: 1000 },  // Ramp up to 1000 VUs over 5 minutes
    { duration: '2m', target: 0 },     // Ramp down to 0 VUs over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s at peak load
    http_req_failed: ['rate<0.05'],     // <5% error rate acceptable under stress
  },
};

// Mix of endpoints to simulate realistic traffic distribution
export default function () {
  const userId = Math.floor(Math.random() * 1000);

  // 60% of traffic: login attempts
  if (Math.random() < 0.6) {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: `user${userId}@test.com`,
        password: 'TestPassword123!',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(loginRes, {
      'login 200 or 401 or 429': (r) => r.status === 200 || r.status === 401 || r.status === 429,
    });

    // If login succeeded, do a follow-up authenticated request (20% of successful logins)
    if (loginRes.status === 200 && Math.random() < 0.2) {
      let accessToken;
      try {
        accessToken = JSON.parse(loginRes.body).accessToken;
      } catch {
        // ignore parse errors under stress
      }

      if (accessToken) {
        const meRes = http.get(`${BASE_URL}/api/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        check(meRes, {
          'profile fetch ok': (r) => r.status === 200,
        });
      }
    }

    sleep(1);
    return;
  }

  // 20% of traffic: health check endpoint
  if (Math.random() < 0.5) {
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
      'health check ok': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
    sleep(0.5);
    return;
  }

  // 20% of traffic: root endpoint
  const rootRes = http.get(`${BASE_URL}/`);
  check(rootRes, {
    'root ok': (r) => r.status === 200,
  });

  sleep(0.5);
}
