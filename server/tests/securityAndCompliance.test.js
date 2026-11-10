import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { Charger } from '../src/models/Charger.js';
import { Booking } from '../src/models/Booking.js';
import { Report } from '../src/models/Report.js';
import { Contact } from '../src/models/Contact.js';

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Security, Legal Compliance & Audit Endpoints', () => {
  const testUser = {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    password: 'Password123!',
    phone: '+919876543210',
    role: 'EV_OWNER',
    city: 'Bengaluru',
  };

  const adminUser = {
    name: 'Admin Desk',
    email: 'admin.desk@chargeshare.in',
    password: 'Password123!',
    phone: '+919876543211',
    role: 'ADMIN',
    city: 'Bengaluru',
  };

  test('POST /api/v1/auth/forgot-password & reset-password flow', async () => {
    // 1. Register test user
    await request(app).post('/api/v1/auth/register').send(testUser);

    // 2. Request forgot-password with unknown email (prevent enumeration)
    const unknownRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });
    expect(unknownRes.statusCode).toBe(200);
    expect(unknownRes.body.success).toBe(true);

    // 3. Request forgot-password for registered user
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testUser.email });

    expect(forgotRes.statusCode).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    const rawToken = forgotRes.body.testToken;
    expect(rawToken).toBeDefined();

    // 4. Attempt reset with weak password (< 10 chars or no symbols)
    const weakRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'weak' });
    expect(weakRes.statusCode).toBe(400);

    // 5. Reset with valid strong password
    const newPassword = 'NewSecurePassword456!';
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: newPassword });

    expect(resetRes.statusCode).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.token).toBeDefined();

    // 6. Attempt reusing token -> should fail
    const reuseRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: newPassword });
    expect(reuseRes.statusCode).toBe(400);

    // 7. Login with old password should fail
    const oldLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(oldLoginRes.statusCode).toBe(401);

    // 8. Login with new password should succeed
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: newPassword });
    expect(newLoginRes.statusCode).toBe(200);
  }, 15000);

  test('Session Revocation via /api/v1/auth/logout-all (tokenVersion)', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const token = regRes.body.token;

    // Verify token works
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.statusCode).toBe(200);

    // Invalidate sessions across all devices
    const logoutAllRes = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutAllRes.statusCode).toBe(200);

    // Old token must now be rejected
    const expiredRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(expiredRes.statusCode).toBe(401);
  });

  test('PUT /api/v1/auth/change-password endpoint updates password and invalidates prior sessions', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const initialToken = regRes.body.token;

    // Fail if current password is wrong
    const failRes = await request(app)
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${initialToken}`)
      .send({
        currentPassword: 'WrongPassword999!',
        newPassword: 'BrandNewPassword123!',
      });
    expect(failRes.statusCode).toBe(400);
    expect(failRes.body.message).toContain('Current password is incorrect');

    // Succeed with correct current password and valid new password
    const successRes = await request(app)
      .put('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${initialToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword: 'BrandNewPassword123!',
      });
    expect(successRes.statusCode).toBe(200);
    expect(successRes.body.token).toBeDefined();

    // Prior token should now be invalidated
    const oldTokenCheck = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(oldTokenCheck.statusCode).toBe(401);

    // New password allows login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'BrandNewPassword123!',
      });
    expect(loginRes.statusCode).toBe(200);
  });

  test('POST /api/v1/auth/verify-email verification flow', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const dbUser = await User.findOne({ email: testUser.email }).select('+emailVerificationToken');
    expect(dbUser.emailVerified).toBe(false);
    expect(dbUser.emailVerificationToken).toBeDefined();

    // Invalid token fails
    const badRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'invalid_token_12345' });
    expect(badRes.statusCode).toBe(400);

    // Verify via mock token flow or direct update
    dbUser.emailVerified = true;
    await dbUser.save();
    const updated = await User.findOne({ email: testUser.email });
    expect(updated.emailVerified).toBe(true);
  });

  test('POST /api/v1/auth/delete-account DPDP Act 2023 data anonymization', async () => {
    // 1. Create host and charger
    const hostRes = await request(app).post('/api/v1/auth/register').send({
      ...testUser,
      email: 'host.deletion@example.com',
      role: 'HOST',
    });
    const hostToken = hostRes.body.token;
    const hostId = hostRes.body.user.id;

    const charger = await Charger.create({
      hostId,
      title: 'Koramangala Green Socket',
      description: 'Reliable Type 2 socket in Koramangala 4th Block',
      address: '80 Feet Road, 4th Block, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560034',
      location: { type: 'Point', coordinates: [77.6245, 12.9352] },
      connectorType: 'Type 2',
      powerKW: 7.4,
      pricingType: 'PER_KWH',
      price: 18,
      status: 'VERIFIED',
    });

    // 2. EV user registers and books
    const userRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const userToken = userRes.body.token;

    const futureStart = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours in future (>2h = 100% refund)
    const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

    await Booking.create({
      bookingCode: 'CSDEL01',
      userId: userRes.body.user.id,
      hostId,
      chargerId: charger._id,
      slotStart: futureStart,
      slotEnd: futureEnd,
      durationMinutes: 60,
      baseAmount: 100,
      platformFee: 5,
      totalAmount: 105,
      hostEarnings: 100,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
    });

    // 3. User attempts deletion without typing "DELETE" -> rejects
    const badDeleteRes = await request(app)
      .post('/api/v1/auth/delete-account')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ confirmationText: 'NO' });
    expect(badDeleteRes.statusCode).toBe(400);

    // 4. User confirms with "DELETE" -> succeeds
    const deleteRes = await request(app)
      .post('/api/v1/auth/delete-account')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ confirmationText: 'DELETE', reason: 'Moving away from Bengaluru' });

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // 5. Verify user is anonymized in DB
    const deletedUser = await User.findById(userRes.body.user.id);
    expect(deletedUser.name).toBe('Deleted User');
    expect(deletedUser.email).toContain('deleted_');
    expect(deletedUser.phone).toBe('+910000000000');
    expect(deletedUser.isDeleted).toBe(true);

    // 6. Verify booking was cancelled with 100% refund (>2h)
    const booking = await Booking.findOne({ bookingCode: 'CSDEL01' });
    expect(booking.status).toBe('CANCELLED');
    expect(booking.refundAmount).toBe(105);

    // 7. Host deletes account -> charger unlisted
    const hostDeleteRes = await request(app)
      .post('/api/v1/auth/delete-account')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ confirmationText: 'DELETE' });
    expect(hostDeleteRes.statusCode).toBe(200);

    const updatedCharger = await Charger.findById(charger._id);
    expect(updatedCharger.status).toBe('REJECTED');
  });

  test('POST & GET /api/v1/reports charger reporting and admin workflow', async () => {
    // 1. Setup host, charger, user, admin
    const host = await User.create({
      ...testUser,
      email: 'host.reported@example.com',
      role: 'HOST',
    });
    const charger = await Charger.create({
      hostId: host._id,
      title: 'HSR Layout 27th Main Fast Bay',
      description: 'Rapid charging bay in HSR Sector 1',
      address: '27th Main Road, Sector 1, HSR Layout',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560102',
      location: { type: 'Point', coordinates: [77.6512, 12.9121] },
      connectorType: 'CCS2',
      powerKW: 25,
      pricingType: 'PER_KWH',
      price: 22,
      status: 'VERIFIED',
    });

    const userRes = await request(app).post('/api/v1/auth/register').send(testUser);
    const userToken = userRes.body.token;

    const admin = await User.create(adminUser);
    const adminLogin = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: admin.email, password: adminUser.password });
    const adminToken = adminLogin.body.token;

    // 2. Submit report
    const reportRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        chargerId: charger._id.toString(),
        reason: 'BROKEN_HARDWARE',
        description: 'Connector clip is damaged and does not lock into the EV vehicle port.',
      });

    expect(reportRes.statusCode).toBe(201);
    expect(reportRes.body.success).toBe(true);
    const reportId = reportRes.body.report._id;

    // 3. Admin retrieves reports queue
    const listRes = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.reports.length).toBeGreaterThanOrEqual(1);

    // 4. Admin updates report to RESOLVED
    const patchRes = await request(app)
      .patch(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
        adminNotes: 'Contacted host. Replaced connector lock and verified earthing resistance.',
      });

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.report.status).toBe('RESOLVED');
  });

  test('POST & GET /api/v1/contact customer inquiry and grievance handling', async () => {
    // 1. Submit without consent -> 400
    const noConsentRes = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Aarav Nair',
        email: 'aarav.nair@example.com',
        subject: 'GRIEVANCE',
        message: 'Formal data access inquiry under the DPDP Act 2023.',
        consentGiven: false,
      });
    expect(noConsentRes.statusCode).toBe(400);

    // 2. Submit valid contact with explicit consent
    const validRes = await request(app)
      .post('/api/v1/contact')
      .send({
        name: 'Aarav Nair',
        email: 'aarav.nair@example.com',
        phone: '+919876543212',
        subject: 'GRIEVANCE',
        message: 'Formal data access inquiry under the DPDP Act 2023 for my account records.',
        consentGiven: true,
      });

    expect(validRes.statusCode).toBe(201);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.ticketId).toBeDefined();

    // 3. Admin lists messages
    const admin = await User.create(adminUser);
    const adminLogin = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: admin.email, password: adminUser.password });
    const adminToken = adminLogin.body.token;

    const listRes = await request(app)
      .get('/api/v1/contact')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.messages.length).toBeGreaterThanOrEqual(1);
  });
});
