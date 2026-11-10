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

describe('Registration Robustness & Hardening Test Suite', () => {
  const baseUserData = {
    name: 'Pooja Hegde',
    email: 'pooja.hegde@example.com',
    password: 'SecurePassword123!',
    phone: '+91 98765 43210',
    role: 'EV_OWNER',
    city: 'Bengaluru',
  };

  test('POST /api/v1/auth/register - Should register Rider with formatted Indian phone (+91 with spaces)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(baseUserData);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('pooja.hegde@example.com');
    expect(res.body.user.phone).toBe('+919876543210');
    expect(res.body.user.role).toBe('EV_OWNER');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('POST /api/v1/auth/register - Should register Host with formatted Indian phone', async () => {
    const hostData = {
      ...baseUserData,
      email: 'host.karthik@example.com',
      phone: '9876543211',
      role: 'HOST',
    };

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(hostData);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('HOST');
    expect(res.body.user.phone).toBe('+919876543211');
  });

  test('Duplicate email returns 409 Conflict with structured error & sign-in message', async () => {
    await request(app).post('/api/v1/auth/register').send(baseUserData);

    const dupRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...baseUserData,
        phone: '+91 91234 56789', // Different phone, duplicate email
      });

    expect(dupRes.statusCode).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toMatch(/already exists.*Sign in instead/i);
    expect(dupRes.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: expect.stringMatching(/already exists.*Sign in instead/i),
        }),
      ])
    );
  });

  test('Duplicate phone returns 409 Conflict with structured error', async () => {
    await request(app).post('/api/v1/auth/register').send(baseUserData);

    const dupRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...baseUserData,
        email: 'another.unique@example.com',
        phone: '9876543210', // Same phone number in 10-digit format
      });

    expect(dupRes.statusCode).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toMatch(/phone number is already registered/i);
    expect(dupRes.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'phone',
          message: expect.stringMatching(/phone number is already registered/i),
        }),
      ])
    );
  });

  test('Normalizes various Indian phone formats correctly', async () => {
    const formats = [
      { input: '+91 99887 76655', expected: '+919988776655', email: 'fmt1@example.com' },
      { input: '09988776654', expected: '+919988776654', email: 'fmt2@example.com' },
      { input: '919988776653', expected: '+919988776653', email: 'fmt3@example.com' },
      { input: '9988776652', expected: '+919988776652', email: 'fmt4@example.com' },
    ];

    for (const item of formats) {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...baseUserData,
          email: item.email,
          phone: item.input,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.phone).toBe(item.expected);
    }
  });

  test('Rejects invalid phone numbers (less than 10 digits or invalid starting digit)', async () => {
    const invalidPhones = ['12345', '5987654321', 'not-a-number', '+1 555-123-4567'];

    for (const phone of invalidPhones) {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...baseUserData,
          email: `invalid.${Date.now()}@example.com`,
          phone,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'phone',
          }),
        ])
      );
    }
  });

  test('Rejects weak password lacking complexity requirements', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...baseUserData,
        password: 'weakpassword',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
        }),
      ])
    );
  });
});
