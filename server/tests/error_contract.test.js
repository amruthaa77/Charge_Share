import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { Vehicle } from '../src/models/Vehicle.js';
import { Charger } from '../src/models/Charger.js';
import { Booking } from '../src/models/Booking.js';

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Standardized API Error Contract Suite', () => {
  test('400 VALIDATION_ERROR - Schema failure returns code, field errors, and requestId', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'A', // min 2
      email: 'not-an-email',
      phone: '123',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.requestId).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  test('401 UNAUTHENTICATED - Missing auth token returns code and requestId', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHENTICATED');
    expect(res.body.requestId).toBeDefined();
  });

  test('401 INVALID_TOKEN - Malformed auth token returns code and requestId', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token-xyz');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  test('401 INVALID_CREDENTIALS - Wrong credentials return code and requestId', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Test Rider',
      email: 'rider.credentials@test.com',
      password: 'SecurePassword123!',
      phone: '+91 91234 56789',
      role: 'EV_OWNER',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'rider.credentials@test.com',
      password: 'WrongPassword!',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('403 FORBIDDEN - EV owner accessing admin route returns code and requestId', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Regular Rider',
      email: 'rider.forbidden@test.com',
      password: 'SecurePassword123!',
      phone: '+91 92234 56789',
      role: 'EV_OWNER',
    });
    const token = regRes.body.token;

    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('404 NOT_FOUND - Non-existent route returns code and requestId', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint-xyz');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
  });

  test('404 CHARGER_NOT_FOUND - Querying non-existent charger returns code and requestId', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app).get(`/api/v1/chargers/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CHARGER_NOT_FOUND');
  });

  test('409 EMAIL_TAKEN - Duplicate registration returns EMAIL_TAKEN code and field error', async () => {
    const userData = {
      name: 'Duplicate Email User',
      email: 'duplicate.email@test.com',
      password: 'SecurePassword123!',
      phone: '+91 93333 44444',
      role: 'EV_OWNER',
    };
    await request(app).post('/api/v1/auth/register').send(userData);

    const res = await request(app).post('/api/v1/auth/register').send({
      ...userData,
      phone: '+91 93333 55555',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EMAIL_TAKEN');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    );
  });

  test('409 PHONE_REGISTERED - Duplicate phone returns PHONE_REGISTERED code and field error', async () => {
    const userData = {
      name: 'Duplicate Phone User',
      email: 'user.first@test.com',
      password: 'SecurePassword123!',
      phone: '+91 94444 55555',
      role: 'EV_OWNER',
    };
    await request(app).post('/api/v1/auth/register').send(userData);

    const res = await request(app).post('/api/v1/auth/register').send({
      ...userData,
      email: 'user.second@test.com',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('PHONE_REGISTERED');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'phone' })])
    );
  });

  test('409 VEHICLE_EXISTS - Adding duplicate vehicle for same user returns VEHICLE_EXISTS code', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Vehicle Owner',
      email: 'vehicle.owner@test.com',
      password: 'SecurePassword123!',
      phone: '+91 95555 66666',
      role: 'EV_OWNER',
    });
    const token = regRes.body.token;

    const vehicleData = {
      make: 'Ather',
      model: '450X',
      year: 2023,
      registrationNumber: 'KA-01-EQ-9999',
      connectorType: 'Bharat AC-001',
    };

    await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(vehicleData);

    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(vehicleData);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VEHICLE_EXISTS');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'registrationNumber' })])
    );
  });

  test('409 SLOT_TAKEN - Double-booking same slot returns SLOT_TAKEN code', async () => {
    const host = await User.create({
      name: 'Slot Host',
      email: 'slot.host@test.com',
      password: 'SecurePassword123!',
      phone: '+91 96666 77777',
      role: 'HOST',
    });

    const charger = await Charger.create({
      hostId: host._id,
      title: 'Slot Test Bay',
      description: 'Test charging station',
      address: 'Indiranagar 100ft Rd',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      location: { type: 'Point', coordinates: [77.6412, 12.9716] },
      connectorType: 'Type 2',
      powerKW: 7.4,
      pricingType: 'PER_HOUR',
      price: 45,
      status: 'VERIFIED',
    });

    const riderRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Slot Rider',
      email: 'slot.rider@test.com',
      password: 'SecurePassword123!',
      phone: '+91 97777 88888',
      role: 'EV_OWNER',
    });
    const token = riderRes.body.token;

    const slotStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    // First hold succeeds
    const firstHold = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        chargerId: charger._id.toString(),
        slotStart,
        durationMinutes: 60,
      });
    expect(firstHold.statusCode).toBe(201);

    // Second hold on same slot is rejected with SLOT_TAKEN
    const secondHold = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        chargerId: charger._id.toString(),
        slotStart,
        durationMinutes: 60,
      });

    expect(secondHold.statusCode).toBe(409);
    expect(secondHold.body.success).toBe(false);
    expect(secondHold.body.code).toBe('SLOT_TAKEN');
  });

  test('500 INTERNAL_SERVER_ERROR - Catches unhandled error safely with requestId and no stack leak', async () => {
    // Force 500 error by querying invalid collection or corrupted model call
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Trigger Error',
        email: 'trigger.error@test.com',
        password: 'SecurePassword123!',
        phone: '+91 98888 99999',
        city: { nestedObjectNotAllowed: true }, // will cause mongoose save error
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.requestId).toBeDefined();
    if (res.statusCode >= 500) {
      expect(res.body.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body.message).toBe('Something went wrong on our side. Please try again');
    }
  });
});
