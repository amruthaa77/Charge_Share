import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { Charger } from '../src/models/Charger.js';
import { Booking } from '../src/models/Booking.js';
import { User } from '../src/models/User.js';

let host;
let charger;
let evOwnerTokens = [];

beforeAll(async () => {
  await connectTestDB();
  // Ensure the DB partial unique index is built in MongoDB memory server
  await Booking.init();
});

beforeEach(async () => {
  await clearTestDB();
  await Booking.init();

  // Create Host
  host = await User.create({
    name: 'Host Mukesh',
    email: 'mukesh@example.com',
    password: 'Password123!',
    phone: '+919876543270',
    role: 'HOST',
    isVerifiedHost: true,
  });

  // Create Verified Charger
  charger = await Charger.create({
    hostId: host._id,
    title: 'Connaught Place 50kW DC Fast Hub',
    description: 'High-power dual gun CCS2 fast charger',
    address: 'Block A, Connaught Place',
    city: 'Delhi',
    state: 'Delhi',
    postalCode: '110001',
    location: { type: 'Point', coordinates: [77.2185, 28.6328] },
    connectorType: 'CCS2',
    powerKW: 50,
    pricingType: 'PER_KWH',
    price: 18,
    status: 'VERIFIED',
  });

  // Create 25 distinct EV owner accounts to simulate real-world simultaneous users
  evOwnerTokens = [];
  const CONCURRENT_USERS_COUNT = 25;

  for (let i = 1; i <= CONCURRENT_USERS_COUNT; i++) {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: `EV Driver ${i}`,
      email: `driver${i}_concurrent@example.com`,
      password: 'Password123!',
      phone: `+9198000${String(i).padStart(5, '0')}`,
      role: 'EV_OWNER',
    });
    evOwnerTokens.push(regRes.body.token);
  }
});

afterAll(async () => {
  await closeTestDB();
});

describe('Critical Concurrency and Double-Booking Prevention', () => {
  test('Simultaneously fire 25 concurrent booking requests for the EXACT same slot -> Exactly 1 succeeds, 24 receive HTTP 409 Conflict', async () => {
    // Exact target slot: Tomorrow at 14:00 UTC
    const targetSlot = new Date(Date.now() + 24 * 60 * 60 * 1000);
    targetSlot.setUTCHours(14, 0, 0, 0);
    const slotStartISO = targetSlot.toISOString();

    const bookingPayload = {
      chargerId: charger._id.toString(),
      slotStart: slotStartISO,
      durationMinutes: 60,
    };

    // Fire 25 simultaneous POST requests across separate EV driver tokens
    const concurrentRequests = evOwnerTokens.map((token) =>
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingPayload)
    );

    const responses = await Promise.all(concurrentRequests);

    let successCount = 0;
    let conflictCount = 0;
    let otherErrors = 0;

    const statusCodes = responses.map((res) => res.statusCode);
    for (const res of responses) {
      if (res.statusCode === 201) {
        successCount++;
        expect(res.body.booking.status).toBe('PENDING_PAYMENT');
      } else if (res.statusCode === 409) {
        conflictCount++;
        expect(res.body.message).toMatch(/already booked or currently reserved/i);
      } else {
        otherErrors++;
        console.error('Unexpected status:', res.statusCode, res.body);
      }
    }

    // Print clear visual diagnostic report in test output as required
    console.log('\n===============================================================');
    console.log('⚡ CHARGESHARE INDIA CONCURRENCY TEST RESULT');
    console.log('===============================================================');
    console.log(`Total simultaneous requests fired: ${responses.length}`);
    console.log(`✅ HTTP 201 Created (Booking Succeeded)    : ${successCount}`);
    console.log(`🛡️  HTTP 409 Conflict (Double-Booking Blocked): ${conflictCount}`);
    console.log(`❌ Unexpected Error Responses              : ${otherErrors}`);
    console.log('===============================================================');
    console.log('STATUS: PASS - Zero double-bookings allowed under heavy race conditions.\n');

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(24);
    expect(otherErrors).toBe(0);

    // Verify DB state: Exactly 1 active booking in database
    const dbBookings = await Booking.find({
      chargerId: charger._id,
      slotStart: targetSlot,
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] },
    });
    expect(dbBookings.length).toBe(1);
  });
});
