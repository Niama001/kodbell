import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// These tests need a real Postgres database, so they only run when RUN_DB_TESTS=true
// (CI sets it). Locally they are skipped, so they never touch your development database.
const runDbTests = process.env.RUN_DB_TESTS === 'true';

process.env.JWT_SECRET = 'test-secret';
const { default: app } = await import('../app.js');
const { pool } = await import('../db/pool.js');

describe('booking status rules (real database)', { skip: !runDbTests }, () => {
  let server;
  let baseUrl;
  let mentorToken;
  let studentToken;

  async function call(method, path, token, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  }

  // Creates an open slot for the mentor and books it as the student
  async function createBooking(day) {
    const slot = await call('POST', '/api/availability', mentorToken, {
      startTime: `2099-01-${day}T10:00`,
      endTime: `2099-01-${day}T11:00`,
    });
    const booking = await call('POST', '/api/bookings', studentToken, {
      slotId: slot.body.id,
      contactName: 'Test Student',
      contactEmail: 'student@example.com',
      problemDescription: 'Need help with recursion',
    });
    assert.equal(booking.status, 201);
    return booking.body;
  }

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Unique emails so the tests can run more than once against the same database
    const suffix = Date.now();
    const mentor = await call('POST', '/api/auth/signup', null, {
      name: 'Test Mentor',
      email: `mentor-${suffix}@example.com`,
      password: 'password123',
      role: 'mentor',
    });
    const student = await call('POST', '/api/auth/signup', null, {
      name: 'Test Student',
      email: `student-${suffix}@example.com`,
      password: 'password123',
      role: 'student',
    });
    mentorToken = mentor.body.token;
    studentToken = student.body.token;
  });

  after(async () => {
    server.close();
    await pool.end();
  });

  it('a cancelled booking cannot be marked complete or rated', async () => {
    const booking = await createBooking('10');

    const cancel = await call('PATCH', `/api/bookings/${booking.id}/cancel`, studentToken);
    assert.equal(cancel.status, 200);

    const complete = await call('PATCH', `/api/bookings/${booking.id}/complete`, mentorToken);
    assert.equal(complete.status, 404);

    const rating = await call('POST', '/api/ratings', studentToken, {
      bookingId: booking.id,
      score: 5,
    });
    assert.equal(rating.status, 404);

    const mine = await call('GET', '/api/bookings/mine', studentToken);
    const saved = mine.body.find((b) => b.id === booking.id);
    assert.equal(saved.status, 'cancelled');
  });

  it('a confirmed booking can still be marked complete and then rated', async () => {
    const booking = await createBooking('11');

    const complete = await call('PATCH', `/api/bookings/${booking.id}/complete`, mentorToken);
    assert.equal(complete.status, 200);
    assert.equal(complete.body.status, 'completed');

    const rating = await call('POST', '/api/ratings', studentToken, {
      bookingId: booking.id,
      score: 5,
    });
    assert.equal(rating.status, 201);
  });
});