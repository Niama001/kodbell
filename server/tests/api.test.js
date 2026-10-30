import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// Set the secret BEFORE loading the app
process.env.JWT_SECRET = 'test-secret';
const { default: app } = await import('../app.js');

let server;
let baseUrl;

before(async () => {
  // Port 0 means "pick any free port", so tests never clash with a running server
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

function tokenFor(role) {
  return jwt.sign({ id: 1, role, email: `${role}@example.com` }, 'test-secret');
}

async function post(path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });
}

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('POST /api/bookings without a token returns 401', async () => {
  const res = await post('/api/bookings', { body: { slotId: 1 } });
  assert.equal(res.status, 401);
});

test('POST /api/bookings as a mentor returns 403', async () => {
  const res = await post('/api/bookings', { token: tokenFor('mentor'), body: { slotId: 1 } });
  assert.equal(res.status, 403);
});

test('POST /api/bookings without a slotId returns 400', async () => {
  const res = await post('/api/bookings', { token: tokenFor('student'), body: {} });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'slotId is required');
});

test('POST /api/bookings without contact details returns 400', async () => {
  const res = await post('/api/bookings', { token: tokenFor('student'), body: { slotId: 1 } });
  assert.equal(res.status, 400);
});

test('POST /api/ratings without a token returns 401', async () => {
  const res = await post('/api/ratings', { body: { bookingId: 1, score: 5 } });
  assert.equal(res.status, 401);
});

test('POST /api/ratings as a mentor returns 403', async () => {
  const res = await post('/api/ratings', { token: tokenFor('mentor'), body: { bookingId: 1, score: 5 } });
  assert.equal(res.status, 403);
});

test('POST /api/ratings with a score above 5 returns 400', async () => {
  const res = await post('/api/ratings', { token: tokenFor('student'), body: { bookingId: 1, score: 6 } });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'score must be between 1 and 5');
});

test('POST /api/ratings with a score of 0 returns 400', async () => {
  const res = await post('/api/ratings', { token: tokenFor('student'), body: { bookingId: 1, score: 0 } });
  assert.equal(res.status, 400);
});

test('POST /api/ratings with a non-numeric score returns 400', async () => {
  const res = await post('/api/ratings', { token: tokenFor('student'), body: { bookingId: 1, score: 'abc' } });
  assert.equal(res.status, 400);
});

test('POST /api/ratings with a decimal score returns 400', async () => {
  const res = await post('/api/ratings', { token: tokenFor('student'), body: { bookingId: 1, score: 2.5 } });
  assert.equal(res.status, 400);
});