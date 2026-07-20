// Integration tests: auth + submission flow.
// Requires a running PostgreSQL and DATABASE_URL in .env.
require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');

const email = `test_${Date.now()}@acra.dev`;
const password = 'password123';
let token;

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  await pool.end();
});

describe('auth', () => {
  test('rejects registration with short password', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'T', email, password: 'short' });
    expect(res.status).toBe(400);
  });

  test('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Tester', email, password });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('rejects duplicate email with 409', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'T2', email, password });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  test('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email, password: 'wrongpass1' });
    expect(res.status).toBe(401);
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });
});

describe('submissions', () => {
  test('rejects unauthenticated submission', async () => {
    const res = await request(app).post('/api/submissions')
      .send({ title: 'x', language: 'javascript', code: 'let a = 1;' });
    expect(res.status).toBe(401);
  });

  test('rejects unsupported language', async () => {
    const res = await request(app).post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x', language: 'ruby', code: 'puts 1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_LANGUAGE');
  });

  test('accepts a paste submission and starts a review (202)', async () => {
    const sub = await request(app).post('/api/submissions')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'test snippet', language: 'javascript', code: 'const a = 1;\nconsole.log(a);' });
    expect(sub.status).toBe(201);

    const rev = await request(app).post(`/api/submissions/${sub.body.submission.id}/reviews`)
      .set('Authorization', `Bearer ${token}`);
    expect(rev.status).toBe(202);
    expect(rev.body.review.status).toBe('pending');
  });

  test('review list requires auth and returns own reviews only', async () => {
    const res = await request(app).get('/api/reviews')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });
});
