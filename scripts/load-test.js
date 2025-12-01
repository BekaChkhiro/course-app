/**
 * Load Testing Script for E-Learning Platform
 * Uses k6 (https://k6.io/) for load testing
 *
 * Installation: brew install k6 (macOS) or download from k6.io
 * Usage: k6 run scripts/load-test.js
 *
 * With environment variables:
 * K6_BASE_URL=https://api.yourdomain.com k6 run scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_request_duration');
const successfulLogins = new Counter('successful_logins');
const courseViews = new Counter('course_views');

// Configuration
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:4000';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'password123';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - verify basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      env: { SCENARIO: 'smoke' },
    },
    // Load test - normal load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 50 },  // Stay at 50 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
      tags: { test_type: 'load' },
      startTime: '2m', // Start after smoke test
    },
    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      startTime: '12m', // Start after load test
    },
    // Spike test - sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Spike to 500 users
        { duration: '1m', target: 500 },   // Stay at 500
        { duration: '10s', target: 0 },    // Quick ramp down
      ],
      tags: { test_type: 'spike' },
      startTime: '30m', // Start after stress test
    },
  },
  thresholds: {
    // API response time thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Error rate threshold
    errors: ['rate<0.01'], // Less than 1% errors
    // Custom API duration threshold
    api_request_duration: ['p(95)<200'],
  },
};

// Utility functions
function getAuthToken() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    if (body.data && body.data.accessToken) {
      successfulLogins.add(1);
      return body.data.accessToken;
    }
  }
  return null;
}

function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

// Main test function
export default function () {
  const scenario = __ENV.SCENARIO || 'load';

  // Health check
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
    });
    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  // Public endpoints
  group('Public Endpoints', () => {
    // Get categories
    const categoriesRes = http.get(`${BASE_URL}/api/categories`);
    check(categoriesRes, {
      'categories status is 200': (r) => r.status === 200,
      'categories has data': (r) => {
        const body = JSON.parse(r.body);
        return body.success === true;
      },
    });
    apiDuration.add(categoriesRes.timings.duration);
    errorRate.add(categoriesRes.status !== 200);

    // Get published courses
    const coursesRes = http.get(`${BASE_URL}/api/courses?status=PUBLISHED&limit=10`);
    check(coursesRes, {
      'courses status is 200': (r) => r.status === 200,
      'courses response time < 500ms': (r) => r.timings.duration < 500,
    });
    apiDuration.add(coursesRes.timings.duration);
    errorRate.add(coursesRes.status !== 200);

    if (coursesRes.status === 200) {
      courseViews.add(1);
    }
  });

  sleep(1);

  // Authenticated endpoints
  group('Authenticated Endpoints', () => {
    const token = getAuthToken();

    if (token) {
      // Get user profile
      const profileRes = http.get(
        `${BASE_URL}/api/auth/me`,
        authHeaders(token)
      );
      check(profileRes, {
        'profile status is 200': (r) => r.status === 200,
      });
      apiDuration.add(profileRes.timings.duration);
      errorRate.add(profileRes.status !== 200);

      // Get student dashboard
      const dashboardRes = http.get(
        `${BASE_URL}/api/student/dashboard`,
        authHeaders(token)
      );
      check(dashboardRes, {
        'dashboard status is 200': (r) => r.status === 200,
        'dashboard response time < 300ms': (r) => r.timings.duration < 300,
      });
      apiDuration.add(dashboardRes.timings.duration);
      errorRate.add(dashboardRes.status !== 200);

      // Get enrolled courses
      const enrolledRes = http.get(
        `${BASE_URL}/api/student/courses`,
        authHeaders(token)
      );
      check(enrolledRes, {
        'enrolled courses status is 200': (r) => r.status === 200,
      });
      apiDuration.add(enrolledRes.timings.duration);
      errorRate.add(enrolledRes.status !== 200);
    }
  });

  sleep(1);

  // Simulate course browsing
  group('Course Browsing Simulation', () => {
    // Search courses
    const searchRes = http.get(`${BASE_URL}/api/courses?search=javascript`);
    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search response time < 500ms': (r) => r.timings.duration < 500,
    });
    apiDuration.add(searchRes.timings.duration);
    errorRate.add(searchRes.status !== 200);

    // Filter by category
    const filterRes = http.get(`${BASE_URL}/api/courses?category=programming`);
    check(filterRes, {
      'filter status is 200': (r) => r.status === 200,
    });
    apiDuration.add(filterRes.timings.duration);
    errorRate.add(filterRes.status !== 200);
  });

  // Random sleep to simulate real user behavior
  sleep(Math.random() * 3 + 1);
}

// Setup function - runs once before the test
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);

  // Verify API is reachable
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API is not reachable at ${BASE_URL}`);
  }

  return { startTime: new Date().toISOString() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/load-test-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const metrics = data.metrics;

  let summary = `
=======================================
  E-Learning Platform Load Test Summary
=======================================

Test Duration: ${data.state.testRunDurationMs}ms
Total Requests: ${metrics.http_reqs?.values?.count || 0}
Failed Requests: ${metrics.http_req_failed?.values?.passes || 0}

Response Times:
  - Median: ${metrics.http_req_duration?.values?.med?.toFixed(2) || 0}ms
  - 95th Percentile: ${metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms
  - 99th Percentile: ${metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0}ms

Error Rate: ${(metrics.errors?.values?.rate * 100 || 0).toFixed(2)}%
Successful Logins: ${metrics.successful_logins?.values?.count || 0}
Course Views: ${metrics.course_views?.values?.count || 0}

Thresholds:
${Object.entries(data.thresholds || {})
  .map(([key, value]) => `  - ${key}: ${value.ok ? 'PASSED' : 'FAILED'}`)
  .join('\n')}
=======================================
`;

  return summary;
}
