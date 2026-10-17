import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { requireAuth, requireRole } from '../middleware/auth.js';

process.env.JWT_SECRET = 'test-secret';

// A fake "response" that remembers the status code and body it was given
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

function makeToken(payload, secret = 'test-secret') {
  return jwt.sign(payload, secret);
}

test('requireAuth: rejects a request with no Authorization header (401)', () => {
  const req = { headers: {} };
  const res = fakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAuth: rejects a header that does not start with "Bearer " (401)', () => {
  const req = { headers: { authorization: 'Token abc123' } };
  const res = fakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAuth: rejects a garbage token (401)', () => {
  const req = { headers: { authorization: 'Bearer not-a-real-token' } };
  const res = fakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAuth: rejects a token signed with the wrong secret (401)', () => {
  const token = makeToken({ id: 1, role: 'student' }, 'some-other-secret');
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = fakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAuth: accepts a valid token and attaches the user to the request', () => {
  const token = makeToken({ id: 7, role: 'mentor', email: 'mentor@example.com' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = fakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 7);
  assert.equal(req.user.role, 'mentor');
});

test('requireRole: lets through a user with the matching role', () => {
  const req = { user: { id: 1, role: 'student' } };
  const res = fakeRes();
  let nextCalled = false;

  requireRole('student')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('requireRole: blocks a user with a different role (403)', () => {
  const req = { user: { id: 1, role: 'mentor' } };
  const res = fakeRes();
  let nextCalled = false;

  requireRole('student')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('requireRole: blocks a request with no user at all (403)', () => {
  const req = {};
  const res = fakeRes();
  let nextCalled = false;

  requireRole('mentor')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});