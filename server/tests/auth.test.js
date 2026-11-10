import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { User } from '../src/models/User.js';

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Authentication & User Management Endpoints', () => {
  const testUser = {
    name: 'Vikram Batra',
    email: 'vikram@example.com',
    password: 'Password123!',
    phone: '+919876543210',
    role: 'EV_OWNER',
    city: 'Bengaluru',
  };

  test('POST /api/v1/auth/register - Should register a new EV owner successfully', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.role).toBe('EV_OWNER');
    expect(res.body.user.password).toBeUndefined();
  });

  test('POST /api/v1/auth/register - Should register a Host successfully', async () => {
    const hostUser = {
      ...testUser,
      email: 'host.vikram@example.com',
      role: 'HOST',
    };
    const res = await request(app).post('/api/v1/auth/register').send(hostUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('HOST');
  });

  test('POST /api/v1/auth/register - Should fail if email is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/register - Should fail if Indian phone format is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, phone: '12345' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/register - Should reject duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const res = await request(app).post('/api/v1/auth/register').send(testUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('email');
  });

  test('POST /api/v1/auth/login - Should log in with valid credentials', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  test('POST /api/v1/auth/login - Should fail with incorrect password', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword123!',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/v1/auth/me - Should return profile when authenticated', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const token = regRes.body.token;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.name).toBe(testUser.name);
  });

  test('GET /api/v1/auth/me - Should return 401 when token is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('PUT /api/v1/auth/profile - Should update profile fields', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const token = regRes.body.token;

    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vikram Batra PVC', city: 'Mumbai' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.name).toBe('Vikram Batra PVC');
    expect(res.body.user.city).toBe('Mumbai');
  });

  test('POST /api/v1/auth/logout - Should clear session', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
