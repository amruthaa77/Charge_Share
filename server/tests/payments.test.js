import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { Charger } from '../src/models/Charger.js';
import { Booking } from '../src/models/Booking.js';

let token;
let user;
let charger;
let booking;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  const hostRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Host Vijay',
    email: 'vijay@example.com',
    password: 'Password123!',
    phone: '+919876543240',
    role: 'HOST',
  });

  const ownerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Driver Dev',
    email: 'dev@example.com',
    password: 'Password123!',
    phone: '+919876543241',
    role: 'EV_OWNER',
  });
  token = ownerRes.body.token;
  user = ownerRes.body.user;

  charger = await Charger.create({
    hostId: hostRes.body.user.id,
    title: 'HSR Layout 7.4kW Point',
    description: 'Safe home charger',
    address: 'Sector 2, HSR',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560102',
    location: { type: 'Point', coordinates: [77.65, 12.91] },
    connectorType: 'Type 2',
    powerKW: 7.4,
    pricingType: 'PER_HOUR',
    price: 100,
    status: 'VERIFIED',
  });

  const slot = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const hold = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ chargerId: charger._id.toString(), slotStart: slot.toISOString(), durationMinutes: 60 });

  booking = hold.body.booking;
});

afterAll(async () => {
  await closeTestDB();
});

describe('Payment Processing and Mock Simulator Endpoints', () => {
  test('POST /api/v1/payments/create-order - Should generate order for booking', async () => {
    const res = await request(app)
      .post('/api/v1/payments/create-order')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking._id });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.orderId).toBeDefined();
    expect(res.body.order.amount).toBe(booking.totalAmount * 100);
  });

  test('POST /api/v1/payments/verify - Should verify payment and confirm booking', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId: booking._id,
        razorpayOrderId: booking.razorpayOrderId,
        razorpayPaymentId: 'pay_test_123456',
        isMock: true,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.booking.status).toBe('CONFIRMED');
    expect(res.body.booking.paymentStatus).toBe('PAID');
  });

  test('POST /api/v1/payments/mock-pay - Should simulate instant 1-click test payment', async () => {
    const res = await request(app)
      .post('/api/v1/payments/mock-pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking._id });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.status).toBe('CONFIRMED');
    expect(res.body.booking.qrCodeDataUrl).toBeDefined();
  });
});
