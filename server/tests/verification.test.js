import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { Charger } from '../src/models/Charger.js';
import { User } from '../src/models/User.js';

let hostToken;
let adminToken;
let ownerToken;
let charger;
let hostUser;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // Create Admin
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Password123!',
    phone: '+919876543260',
    role: 'ADMIN',
  });
  const adminLogin = await request(app).post('/api/v1/admin/auth/login').send({
    email: 'admin@example.com',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.token;

  // Create Host
  const hostRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Host Suresh',
    email: 'suresh@example.com',
    password: 'Password123!',
    phone: '+919876543261',
    role: 'HOST',
  });
  hostToken = hostRes.body.token;
  hostUser = hostRes.body.user;

  // Create EV Owner
  const ownerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Driver Nitin',
    email: 'nitin@example.com',
    password: 'Password123!',
    phone: '+919876543262',
    role: 'EV_OWNER',
  });
  ownerToken = ownerRes.body.token;

  charger = await Charger.create({
    hostId: hostUser.id,
    title: 'Bandra West 22kW Bay',
    description: 'Residential EV port',
    address: 'Pali Hill, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400050',
    location: { type: 'Point', coordinates: [72.8258, 19.0607] },
    connectorType: 'Type 2',
    powerKW: 22,
    price: 16,
    status: 'PENDING_VERIFICATION',
  });
});

afterAll(async () => {
  await closeTestDB();
});

describe('Host KYC & Safety Verification Flow and Admin Controls', () => {
  const verificationPayload = {
    idProofType: 'AADHAAR',
    idProofUrl: 'https://example.com/aadhaar.pdf',
    propertyProofType: 'ELECTRICITY_BILL',
    propertyProofUrl: 'https://example.com/bescom.pdf',
    nocDocumentUrl: 'https://example.com/society-noc.pdf',
    safetyChecklist: {
      earthingVerified: true,
      mcbRccbInstalled: true,
      weatherproofProtection: true,
      cctvSurveillance: true,
      fireExtinguisherNearby: true,
    },
    propertyConsentDeclared: true,
  };

  test('POST /api/v1/verifications - Host should submit documents and safety checklist', async () => {
    const res = await request(app)
      .post('/api/v1/verifications')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        chargerId: charger._id.toString(),
        ...verificationPayload,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.verification.status).toBe('PENDING');
  });

  test('GET /api/v1/verifications/pending - Regular user should be rejected (RBAC 403)', async () => {
    const res = await request(app)
      .get('/api/v1/verifications/pending')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('GET /api/v1/verifications/pending - Admin should see pending queue', async () => {
    await request(app)
      .post('/api/v1/verifications')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ chargerId: charger._id.toString(), ...verificationPayload });

    const res = await request(app)
      .get('/api/v1/verifications/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.verifications[0].chargerId._id.toString()).toBe(charger._id.toString());
  });

  test('POST /api/v1/verifications/:id/review - Admin approves verification and publishes charger', async () => {
    const submitRes = await request(app)
      .post('/api/v1/verifications')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ chargerId: charger._id.toString(), ...verificationPayload });

    const verId = submitRes.body.verification._id;

    const reviewRes = await request(app)
      .post(`/api/v1/verifications/${verId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        feedback: 'Electrical safety and society NOC verified.',
      });

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.verification.status).toBe('APPROVED');

    // Charger status should now be VERIFIED and searchable
    const updatedCharger = await Charger.findById(charger._id);
    expect(updatedCharger.status).toBe('VERIFIED');

    // Host should be marked verified
    const updatedHost = await User.findById(hostUser.id);
    expect(updatedHost.isVerifiedHost).toBe(true);
  });

  test('POST /api/v1/verifications/:id/review - Admin rejects verification with reason', async () => {
    const submitRes = await request(app)
      .post('/api/v1/verifications')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ chargerId: charger._id.toString(), ...verificationPayload });

    const verId = submitRes.body.verification._id;

    const reviewRes = await request(app)
      .post(`/api/v1/verifications/${verId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'REJECTED',
        feedback: 'MCB rating is below 32A standard. Please update hardware.',
      });

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.verification.status).toBe('REJECTED');

    const updatedCharger = await Charger.findById(charger._id);
    expect(updatedCharger.status).toBe('REJECTED');
  });

  test('GET /api/v1/admin/stats - Admin retrieves platform metrics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.stats.users).toBeDefined();
    expect(res.body.stats.chargers).toBeDefined();
    expect(res.body.stats.bookings).toBeDefined();
    expect(res.body.stats.financial).toBeDefined();
  });
});
