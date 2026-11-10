import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { Charger } from '../src/models/Charger.js';

let hostToken;
let ownerToken;
let hostUser;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // Create Host
  const hostRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Host User',
    email: 'host@example.com',
    password: 'Password123!',
    phone: '+919876543220',
    role: 'HOST',
  });
  hostToken = hostRes.body.token;
  hostUser = hostRes.body.user;

  // Create EV Owner
  const ownerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'EV Owner',
    email: 'owner@example.com',
    password: 'Password123!',
    phone: '+919876543221',
    role: 'EV_OWNER',
  });
  ownerToken = ownerRes.body.token;
});

afterAll(async () => {
  await closeTestDB();
});

describe('Charger Listings and Search Endpoints', () => {
  const sampleCharger = {
    title: 'Koramangala 50kW Fast Bay',
    description: 'Fast charging bay with 24/7 security and clean customer lounge.',
    address: '100ft Road, 4th Block, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560034',
    latitude: 12.9352,
    longitude: 77.6245,
    connectorType: 'CCS2',
    powerKW: 50,
    pricingType: 'PER_KWH',
    price: 18,
  };

  test('POST /api/v1/chargers - Host should create charger listing (status: PENDING_VERIFICATION)', async () => {
    const res = await request(app)
      .post('/api/v1/chargers')
      .set('Authorization', `Bearer ${hostToken}`)
      .send(sampleCharger);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.charger.status).toBe('PENDING_VERIFICATION');
    expect(res.body.charger.location.coordinates).toEqual([77.6245, 12.9352]);
  });

  test('POST /api/v1/chargers - EV Owner should be rejected (RBAC 403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/chargers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(sampleCharger);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  test('GET /api/v1/chargers - Unverified chargers should NOT be visible in public search', async () => {
    // Create pending charger
    await request(app)
      .post('/api/v1/chargers')
      .set('Authorization', `Bearer ${hostToken}`)
      .send(sampleCharger);

    const res = await request(app).get('/api/v1/chargers');
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(0); // Excluded by default verifiedOnly: true
  });

  test('GET /api/v1/chargers - Verified chargers are searchable with filters', async () => {
    const created = await Charger.create({
      hostId: hostUser.id,
      ...sampleCharger,
      location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      status: 'VERIFIED',
    });

    const res = await request(app)
      .get('/api/v1/chargers')
      .query({ city: 'Bengaluru', connectorType: 'CCS2', minPower: 30 });

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.chargers[0]._id.toString()).toBe(created._id.toString());
  });

  test('GET /api/v1/chargers/:id/availability - Returns discrete 60-min slots for a given date', async () => {
    const created = await Charger.create({
      hostId: hostUser.id,
      ...sampleCharger,
      location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      status: 'VERIFIED',
      weeklySchedule: [
        { day: new Date('2025-06-15').getDay(), open: '08:00', close: '12:00', isActive: true },
      ],
    });

    const res = await request(app)
      .get(`/api/v1/chargers/${created._id}/availability`)
      .query({ date: '2025-06-15' });

    expect(res.statusCode).toBe(200);
    expect(res.body.slots.length).toBe(4); // 08:00-09:00, 09:00-10:00, 10:00-11:00, 11:00-12:00
    expect(res.body.slots[0].timeLabel).toBe('08:00 - 09:00');
  });

  test('PATCH /api/v1/chargers/:id/pause - Host can toggle pause/unpause status', async () => {
    const created = await Charger.create({
      hostId: hostUser.id,
      ...sampleCharger,
      location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      status: 'VERIFIED',
    });

    const pauseRes = await request(app)
      .patch(`/api/v1/chargers/${created._id}/pause`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(pauseRes.statusCode).toBe(200);
    expect(pauseRes.body.status).toBe('PAUSED');

    const resumeRes = await request(app)
      .patch(`/api/v1/chargers/${created._id}/pause`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(resumeRes.statusCode).toBe(200);
    expect(resumeRes.body.status).toBe('VERIFIED');
  });

  test('PUT /api/v1/chargers/:id - Host can update pricing and description', async () => {
    const created = await Charger.create({
      hostId: hostUser.id,
      ...sampleCharger,
      location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      status: 'VERIFIED',
    });

    const res = await request(app)
      .put(`/api/v1/chargers/${created._id}`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ price: 20 });

    expect(res.statusCode).toBe(200);
    expect(res.body.charger.price).toBe(20);
  });

  test('DELETE /api/v1/chargers/:id - Host can delete charger', async () => {
    const created = await Charger.create({
      hostId: hostUser.id,
      ...sampleCharger,
      location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      status: 'VERIFIED',
    });

    const res = await request(app)
      .delete(`/api/v1/chargers/${created._id}`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.statusCode).toBe(200);

    const check = await Charger.findById(created._id);
    expect(check).toBeNull();
  });
});
