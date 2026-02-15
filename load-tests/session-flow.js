import http from 'k6/http';
import { check, sleep, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // <1% errors
  },
};

// Simulate a full authenticated session: login -> get session -> submit reviews -> complete
export default function () {
  const userId = Math.floor(Math.random() * 1000);
  const email = `user${userId}@test.com`;
  const password = 'TestPassword123!';

  // Step 1: Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginOk = check(loginRes, {
    'login succeeded': (r) => r.status === 200,
    'login has access token': (r) => {
      try {
        return JSON.parse(r.body).accessToken !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!loginOk) {
    sleep(1);
    return;
  }

  let accessToken;
  try {
    accessToken = JSON.parse(loginRes.body).accessToken;
  } catch {
    sleep(1);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  sleep(0.5);

  // Step 2: Get the current user profile
  const meRes = http.get(`${BASE_URL}/api/me`, { headers: authHeaders });
  check(meRes, {
    'profile fetch succeeded': (r) => r.status === 200,
    'profile response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(0.5);

  // Step 3: Start a review session
  const sessionRes = http.post(
    `${BASE_URL}/api/session/start`,
    JSON.stringify({ type: 'quick' }),
    { headers: authHeaders }
  );

  const sessionOk = check(sessionRes, {
    'session start 200 or 404': (r) => r.status === 200 || r.status === 404,
    'session response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!sessionOk || sessionRes.status !== 200) {
    sleep(1);
    return;
  }

  let sessionId;
  try {
    sessionId = JSON.parse(sessionRes.body).session?.id;
  } catch {
    sleep(1);
    return;
  }

  if (!sessionId) {
    sleep(1);
    return;
  }

  sleep(1);

  // Step 4: Submit a batch of reviews (simulate 5–10 card reviews)
  const reviewCount = Math.floor(Math.random() * 6) + 5;
  for (let i = 0; i < reviewCount; i++) {
    const reviewRes = http.post(
      `${BASE_URL}/api/review`,
      JSON.stringify({
        sessionId,
        cardId: `card-${Math.floor(Math.random() * 500)}`,
        rating: Math.floor(Math.random() * 4) + 1, // 1–4 (Again, Hard, Good, Easy)
        responseTimeMs: Math.floor(Math.random() * 5000) + 500,
      }),
      { headers: authHeaders }
    );

    check(reviewRes, {
      'review submission accepted': (r) => r.status === 200 || r.status === 201 || r.status === 404,
      'review response time < 300ms': (r) => r.timings.duration < 300,
    });

    sleep(Math.random() * 2 + 1); // 1–3 seconds between reviews
  }

  // Step 5: Complete the session
  const completeRes = http.post(
    `${BASE_URL}/api/session/${sessionId}/complete`,
    JSON.stringify({}),
    { headers: authHeaders }
  );

  check(completeRes, {
    'session complete 200 or 404': (r) => r.status === 200 || r.status === 404,
    'complete response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
