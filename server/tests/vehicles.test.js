import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { User } from '../src/models/User.js';

let token;
let user;
let otherToken;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // Create primary user
  const reg1 = await request(app).post('/api/v1/auth/register').send({
    name: 'Driver One',
    email: 'driver1@example.com',
    password: 'Password123!',
    phone: '+919876543211',
    role: 'EV_OWNER',
  });
  token = reg1.body.token;
  user = reg1.body.user;

  // Create another user for isolation tests
  const reg2 = await request(app).post('/api/v1/auth/register').send({
    name: 'Driver Two',
    email: 'driver2@example.com',
    password: 'Password123!',
    phone: '+919876543212',
    role: 'EV_OWNER',
  });
  otherToken = reg2.body.token;
});

afterAll(async () => {
  await closeTestDB();
});

describe('Vehicle CRUD and Ownership Endpoints', () => {
  const sampleVehicle = {
    make: 'Tata',
    model: 'Nexon EV',
    year: 2023,
    registrationNumber: 'KA-01-EQ-1234',
    connectorType: 'CCS2',
    batteryCapacityKWh: 40.5,
  };

  test('POST /api/v1/vehicles - Should add a new EV vehicle', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleVehicle);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.vehicle.make).toBe('Tata');
    expect(res.body.vehicle.isDefault).toBe(true); // First vehicle becomes default
  });

  test('POST /api/v1/vehicles - Should reject invalid connector type', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...sampleVehicle, connectorType: 'UNSUPPORTED_TYPE' });

    expect(res.statusCode).toBe(400);
  });

  test('GET /api/v1/vehicles - Should list current user vehicles', async () => {
    await request(app).post('/api/v1/vehicles').set('Authorization', `Bearer ${token}`).send(sampleVehicle);
    await request(app).post('/api/v1/vehicles').set('Authorization', `Bearer ${token}`).send({
      ...sampleVehicle,
      registrationNumber: 'KA-01-EQ-5678',
      model: 'Tiago EV',
    });

    const res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(2);
  });

  test('GET /api/v1/vehicles/:id - Should get specific vehicle by ID', async () => {
    const createRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleVehicle);

    const vehicleId = createRes.body.vehicle._id;

    const res = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.vehicle._id).toBe(vehicleId);
  });

  test('PUT /api/v1/vehicles/:id - Should update vehicle details', async () => {
    const createRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleVehicle);

    const vehicleId = createRes.body.vehicle._id;

    const res = await request(app)
      .put(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ batteryCapacityKWh: 45 });

    expect(res.statusCode).toBe(200);
    expect(res.body.vehicle.batteryCapacityKWh).toBe(45);
  });

  test('DELETE /api/v1/vehicles/:id - Should delete vehicle', async () => {
    const createRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleVehicle);

    const vehicleId = createRes.body.vehicle._id;

    const delRes = await request(app)
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.statusCode).toBe(200);

    const checkRes = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(checkRes.statusCode).toBe(404);
  });

  test('Access Control: User cannot access or modify another user vehicle', async () => {
    const createRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send(sampleVehicle);

    const vehicleId = createRes.body.vehicle._id;

    // other user tries to access
    const res = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.statusCode).toBe(403);
  });
});
