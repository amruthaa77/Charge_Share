import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { Charger } from '../src/models/Charger.js';
import { Booking } from '../src/models/Booking.js';

let hostToken;
let ownerToken;
let hostUser;
let ownerUser;
let charger;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  const hostRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Host Ram',
    email: 'ram@example.com',
    password: 'Password123!',
    phone: '+919876543230',
    role: 'HOST',
  });
  hostToken = hostRes.body.token;
  hostUser = hostRes.body.user;

  const ownerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Owner Shyam',
    email: 'shyam@example.com',
    password: 'Password123!',
    phone: '+919876543231',
    role: 'EV_OWNER',
  });
  ownerToken = ownerRes.body.token;
  ownerUser = ownerRes.body.user;

  charger = await Charger.create({
    hostId: hostUser.id,
    title: 'Indiranagar Type 2 Box',
    description: 'Safe parking space with 22kW charging.',
    address: '100ft Rd, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    location: { type: 'Point', coordinates: [77.6413, 12.9719] },
    connectorType: 'Type 2',
    powerKW: 22,
    pricingType: 'PER_HOUR',
    price: 150,
    status: 'VERIFIED',
  });
});

afterAll(async () => {
  await closeTestDB();
});

describe('Booking Lifecycle and Refund Rules Endpoints', () => {
  test('POST /api/v1/bookings - Should hold a slot for 10 minutes with 5% platform fee', async () => {
    const futureSlot = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    futureSlot.setMinutes(0, 0, 0);

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        chargerId: charger._id.toString(),
        slotStart: futureSlot.toISOString(),
        durationMinutes: 60,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.booking.status).toBe('PENDING_PAYMENT');
    expect(res.body.booking.baseAmount).toBe(150);
    expect(res.body.booking.platformFee).toBe(8); // 5% of 150 rounded = 8
    expect(res.body.booking.totalAmount).toBe(158);
    expect(res.body.payment.orderId).toBeDefined();
  });

  test('POST /api/v1/bookings - Host cannot book their own charger (400)', async () => {
    const futureSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
    futureSlot.setMinutes(0, 0, 0);

    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        chargerId: charger._id.toString(),
        slotStart: futureSlot.toISOString(),
        durationMinutes: 60,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cannot book your own charger/i);
  });

  test('POST /api/v1/bookings/confirm - Should confirm booking and generate QR code', async () => {
    const futureSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const holdRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        chargerId: charger._id.toString(),
        slotStart: futureSlot.toISOString(),
        durationMinutes: 60,
      });

    const bookingId = holdRes.body.booking._id;

    const confirmRes = await request(app)
      .post('/api/v1/bookings/confirm')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingId,
        isMock: true,
      });

    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.body.booking.status).toBe('CONFIRMED');
    expect(confirmRes.body.booking.paymentStatus).toBe('PAID');
    expect(confirmRes.body.booking.qrCodeDataUrl).toMatch(/^data:image\/png;base64/);
  });

  test('POST /api/v1/bookings/:id/cancel - Cancellation >2h before slot gives 100% full refund', async () => {
    const futureSlot = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours in future (> 2h)
    const hold = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ chargerId: charger._id.toString(), slotStart: futureSlot.toISOString(), durationMinutes: 60 });

    await request(app)
      .post('/api/v1/bookings/confirm')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingId: hold.body.booking._id, isMock: true });

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${hold.body.booking._id}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Trip rescheduled' });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.refund.refundPercentage).toBe(100);
    expect(cancelRes.body.refund.refundAmount).toBe(158);
  });

  test('POST /api/v1/bookings/:id/cancel - Cancellation <2h before slot gives 50% refund', async () => {
    const nearSlot = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour in future (< 2h)
    const hold = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ chargerId: charger._id.toString(), slotStart: nearSlot.toISOString(), durationMinutes: 60 });

    await request(app)
      .post('/api/v1/bookings/confirm')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ bookingId: hold.body.booking._id, isMock: true });

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${hold.body.booking._id}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Emergency change' });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.refund.refundPercentage).toBe(50);
    expect(cancelRes.body.refund.refundAmount).toBe(79); // 50% of 158
  });

  test('POST /api/v1/bookings/:id/action - Host can approve or reject booking', async () => {
    const futureSlot = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const hold = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ chargerId: charger._id.toString(), slotStart: futureSlot.toISOString(), durationMinutes: 60 });

    const actionRes = await request(app)
      .post(`/api/v1/bookings/${hold.body.booking._id}/action`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ action: 'REJECT', reason: 'Driveway maintenance' });

    expect(actionRes.statusCode).toBe(200);
    expect(actionRes.body.booking.status).toBe('REJECTED');
  });

  test('GET /api/v1/bookings - Lists user bookings', async () => {
    const futureSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ chargerId: charger._id.toString(), slotStart: futureSlot.toISOString(), durationMinutes: 60 });

    const res = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
  });
});
