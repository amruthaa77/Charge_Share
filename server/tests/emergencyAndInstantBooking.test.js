import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { Charger } from '../src/models/Charger.js';
import { Booking } from '../src/models/Booking.js';
import { Notification } from '../src/models/Notification.js';

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
    name: 'Host Vinay',
    email: 'vinay@example.com',
    password: 'Password123!',
    phone: '+919876543290',
    role: 'HOST',
  });
  hostToken = hostRes.body.token;
  hostUser = hostRes.body.user;

  const ownerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Owner Priya',
    email: 'priya@example.com',
    password: 'Password123!',
    phone: '+919876543291',
    role: 'EV_OWNER',
  });
  ownerToken = ownerRes.body.token;
  ownerUser = ownerRes.body.user;

  charger = await Charger.create({
    hostId: hostUser.id,
    title: 'HSR Sector 2 Fast Bay',
    description: 'Instant 22kW charging with emergency SOS support.',
    address: '14th Main, HSR Layout Sector 2',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560102',
    location: { type: 'Point', coordinates: [77.6512, 12.9121] },
    connectorType: 'CCS2',
    powerKW: 22,
    pricingType: 'PER_HOUR',
    price: 120,
    status: 'VERIFIED',
    instantBooking: true,
    emergencySupport: true,
    allowsReservations: true,
    weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      day,
      open: '00:00',
      close: '23:59',
      isActive: true,
    })),
  });
});

afterAll(async () => {
  await closeTestDB();
});

describe('Emergency Charging & Instant Booking Flow', () => {
  test('GET /api/v1/chargers/:id/live-status - Returns real-time charger status and host online info', async () => {
    const res = await request(app).get(`/api/v1/chargers/${charger._id}/live-status`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.liveStatus).toBe('AVAILABLE');
    expect(res.body.availableNow).toBe(true);
    expect(res.body.host).toBeDefined();
    expect(res.body.host.isOnline).toBe(true);
    expect(res.body.instantBooking).toBe(true);
    expect(res.body.emergencySupport).toBe(true);
  });

  test('POST /api/v1/bookings - Instant "Book Now" without prior slot selection (defaults to current time)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        chargerId: charger._id.toString(),
        durationMinutes: 45, // Flexible duration (not rigid 60 mins)
        bookingType: 'INSTANT',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.durationMinutes).toBe(45);
    expect(res.body.booking.status).toBe('PENDING_PAYMENT');
    expect(res.body.booking.auditLog.length).toBeGreaterThan(0);
    expect(res.body.booking.auditLog[0].action).toBe('CREATED');
  });

  test('POST /api/v1/bookings - Atomic overlap prevention blocks overlapping flexible booking', async () => {
    const now = new Date();
    const start1 = new Date(now.getTime() + 60 * 60 * 1000); // in 1 hour
    const start2 = new Date(start1.getTime() + 15 * 60 * 1000); // 15 mins later (inside 45-min duration)

    // First booking from start1 to start1 + 45 min
    const res1 = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        chargerId: charger._id.toString(),
        slotStart: start1.toISOString(),
        durationMinutes: 45,
      });
    expect(res1.statusCode).toBe(201);

    // Second booking overlapping the first window
    const res2 = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        chargerId: charger._id.toString(),
        slotStart: start2.toISOString(),
        durationMinutes: 30,
      });

    expect(res2.statusCode).toBe(409);
    expect(res2.body.message).toMatch(/already booked or currently reserved/i);
    expect(res2.body.nextAvailableAt).toBeDefined();
  });

  test('POST /api/v1/bookings - Emergency Charging SOS mode creates priority booking & notifies host', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        chargerId: charger._id.toString(),
        durationMinutes: 60,
        isEmergency: true,
        bookingType: 'EMERGENCY',
        emergencyDetails: {
          batteryPercent: 8,
          vehicleModel: 'Ather 450X',
          connectorType: '3-pin',
          emergencyNote: 'Low battery stranded near HSR BDA complex',
          userLocation: {
            coordinates: [77.651, 12.912],
            address: 'HSR Ring Road',
          },
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.isEmergency).toBe(true);
    expect(res.body.booking.emergencyDetails.batteryPercent).toBe(8);

    // Verify host received high-priority notification
    const hostNotifications = await Notification.find({ userId: hostUser.id });
    expect(hostNotifications.length).toBe(1);
    expect(hostNotifications[0].isEmergency).toBe(true);
    expect(hostNotifications[0].type).toBe('EMERGENCY_REQUEST');
  });

  test('GET /api/v1/chargers/emergency-alternatives - Returns nearest emergency-ready chargers', async () => {
    const res = await request(app)
      .get('/api/v1/chargers/emergency-alternatives')
      .query({
        lat: 12.9121,
        lng: 77.6512,
        connectorType: 'CCS2',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(res.body.stations[0].emergencySupport).toBe(true);
  });

  test('GET /api/v1/notifications & mark read - Verifies in-app notification management', async () => {
    await Notification.create({
      userId: ownerUser.id,
      title: 'Booking Confirmed',
      message: 'Your slot is confirmed',
      type: 'BOOKING_CONFIRMED',
    });

    const getRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.count).toBe(1);
    expect(getRes.body.unreadCount).toBe(1);

    const notifId = getRes.body.notifications[0]._id;
    const patchRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.notification.read).toBe(true);
  });
});
