import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { Charger } from '../src/models/Charger.js';
import { Booking } from '../src/models/Booking.js';

let ownerToken;
let otherToken;
let charger;
let completedBooking;
let activeBooking;

beforeAll(async () => {
  await connectTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  const hostRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Host Ganesh',
    email: 'ganesh@example.com',
    password: 'Password123!',
    phone: '+919876543250',
    role: 'HOST',
  });

  const ownerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Driver Maya',
    email: 'maya@example.com',
    password: 'Password123!',
    phone: '+919876543251',
    role: 'EV_OWNER',
  });
  ownerToken = ownerRes.body.token;

  const otherRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Driver Karan',
    email: 'karan@example.com',
    password: 'Password123!',
    phone: '+919876543252',
    role: 'EV_OWNER',
  });
  otherToken = otherRes.body.token;

  charger = await Charger.create({
    hostId: hostRes.body.user.id,
    title: 'Whitefield AC Point',
    description: 'Tech park charging',
    address: 'ITPL Main Rd',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560066',
    location: { type: 'Point', coordinates: [77.7499, 12.9698] },
    connectorType: 'Type 2',
    powerKW: 11,
    pricingType: 'PER_KWH',
    price: 15,
    status: 'VERIFIED',
    ratingAvg: 5.0,
    reviewCount: 0,
  });

  // Completed booking in past
  const pastSlot = new Date(Date.now() - 24 * 60 * 60 * 1000);
  completedBooking = await Booking.create({
    bookingCode: 'CS-TEST-001',
    userId: ownerRes.body.user.id,
    hostId: hostRes.body.user.id,
    chargerId: charger._id,
    slotStart: pastSlot,
    slotEnd: new Date(pastSlot.getTime() + 60 * 60 * 1000),
    durationMinutes: 60,
    baseAmount: 150,
    platformFee: 8,
    totalAmount: 158,
    hostEarnings: 150,
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    heldUntil: new Date(),
  });

  // Future uncompleted booking
  const futureSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
  activeBooking = await Booking.create({
    bookingCode: 'CS-TEST-002',
    userId: ownerRes.body.user.id,
    hostId: hostRes.body.user.id,
    chargerId: charger._id,
    slotStart: futureSlot,
    slotEnd: new Date(futureSlot.getTime() + 60 * 60 * 1000),
    durationMinutes: 60,
    baseAmount: 150,
    platformFee: 8,
    totalAmount: 158,
    hostEarnings: 150,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    heldUntil: new Date(),
  });
});

afterAll(async () => {
  await closeTestDB();
});

describe('Review Verification and Integrity Endpoints', () => {
  test('POST /api/v1/reviews - Should reject review if charging session has NOT completed', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingId: activeBooking._id.toString(),
        rating: 5,
        comment: 'Great charger!',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/after the charging session has completed/i);
  });

  test('POST /api/v1/reviews - Should reject review if submitted by a different user', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        bookingId: completedBooking._id.toString(),
        rating: 5,
        comment: 'Great charger!',
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/only review bookings made by your account/i);
  });

  test('POST /api/v1/reviews - Should successfully create review for completed booking', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingId: completedBooking._id.toString(),
        rating: 5,
        comment: 'Fantastic experience, seamless charging and helpful host!',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.rating).toBe(5);

    // Verify charger stats were updated
    const updatedCharger = await Charger.findById(charger._id);
    expect(updatedCharger.reviewCount).toBe(1);
    expect(updatedCharger.ratingAvg).toBe(5);
  });

  test('POST /api/v1/reviews - Should reject duplicate review for the same booking', async () => {
    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingId: completedBooking._id.toString(),
        rating: 5,
        comment: 'First review submitted.',
      });

    const dupRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingId: completedBooking._id.toString(),
        rating: 4,
        comment: 'Second review attempt.',
      });

    expect(dupRes.statusCode).toBe(400);
    expect(dupRes.body.message).toMatch(/already submitted a review/i);
  });

  test('GET /api/v1/reviews/charger/:chargerId - Publicly list reviews for charger', async () => {
    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bookingId: completedBooking._id.toString(),
        rating: 4,
        comment: 'Smooth and reliable charging experience.',
      });

    const res = await request(app).get(`/api/v1/reviews/charger/${charger._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.reviews[0].comment).toMatch(/Smooth and reliable/i);
  });
});
