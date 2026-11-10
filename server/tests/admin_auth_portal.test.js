import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { resetAdminPassword } from '../src/scripts/reset-admin-password.js';
import { createAdmin } from '../src/scripts/create-admin.js';
import jwt from 'jsonwebtoken';

let adminUser;
let hostUser;
let riderUser;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // 1. Create Administrator
  adminUser = await User.create({
    name: 'Platform Administrator',
    email: 'admin.portal@chargeshare.in',
    password: 'AdminPassword123!',
    phone: '+919999900011',
    role: 'ADMIN',
    trustStatus: 'VERIFIED',
    mustChangePassword: false,
  });

  // 2. Create Host
  hostUser = await User.create({
    name: 'Host Rajesh',
    email: 'host.portal@chargeshare.in',
    password: 'HostPassword123!',
    phone: '+919999900022',
    role: 'HOST',
    trustStatus: 'VERIFIED',
  });

  // 3. Create Rider (EV_OWNER)
  riderUser = await User.create({
    name: 'Rider Ananya',
    email: 'rider.portal@chargeshare.in',
    password: 'RiderPassword123!',
    phone: '+919999900033',
    role: 'EV_OWNER',
    trustStatus: 'VERIFIED',
  });
});

describe('Separate Admin Authentication Portal (POST /api/v1/admin/auth/login)', () => {
  test('authenticates valid ADMIN credentials, returns scoped token, and sets httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'AdminPassword123!',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.user.email).toBe('admin.portal@chargeshare.in');

    // Decode token and verify administrative scope claim
    const decoded = jwt.decode(res.body.token);
    expect(decoded.role).toBe('ADMIN');
    expect(decoded.scope).toBe('admin');

    // Verify cookie set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('token='))).toBe(true);
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  test('rejects non-existent email with neutral 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'nonexistent.admin@chargeshare.in',
        password: 'AdminPassword123!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Invalid email or password.');
  });

  test('rejects incorrect password for admin with neutral 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'WrongPassword123!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Invalid email or password.');
  });

  test('rejects EV_OWNER (rider) credentials on admin endpoint with neutral 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'rider.portal@chargeshare.in',
        password: 'RiderPassword123!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Invalid email or password.');
  });

  test('rejects HOST credentials on admin endpoint with neutral 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'host.portal@chargeshare.in',
        password: 'HostPassword123!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Invalid email or password.');
  });

  test('returns identical response body shape across unknown email vs wrong password vs non-admin (no information leakage)', async () => {
    const unknownRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'ghost@chargeshare.in', password: 'AnyPassword123!' });

    const wrongPassRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin.portal@chargeshare.in', password: 'IncorrectPassword123!' });

    const nonAdminRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'rider.portal@chargeshare.in', password: 'RiderPassword123!' });

    expect(unknownRes.statusCode).toBe(401);
    expect(wrongPassRes.statusCode).toBe(401);
    expect(nonAdminRes.statusCode).toBe(401);

    expect(unknownRes.body.code).toBe(wrongPassRes.body.code);
    expect(unknownRes.body.code).toBe(nonAdminRes.body.code);

    expect(unknownRes.body.message).toBe(wrongPassRes.body.message);
    expect(unknownRes.body.message).toBe(nonAdminRes.body.message);
  });
});

describe('Public Authentication Isolation (POST /api/v1/auth/login)', () => {
  test('rejects ADMIN credentials on public login endpoint with neutral 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'AdminPassword123!',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.message).toBe('Invalid email or password.');
  });

  test('allows EV_OWNER and HOST to authenticate on public login', async () => {
    const riderRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'rider.portal@chargeshare.in',
        password: 'RiderPassword123!',
      });

    expect(riderRes.statusCode).toBe(200);
    expect(riderRes.body.success).toBe(true);
    expect(riderRes.body.user.role).toBe('EV_OWNER');

    const hostRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'host.portal@chargeshare.in',
        password: 'HostPassword123!',
      });

    expect(hostRes.statusCode).toBe(200);
    expect(hostRes.body.success).toBe(true);
    expect(hostRes.body.user.role).toBe('HOST');
  });

  test('public registration rejects role: ADMIN with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Hacker Admin',
        email: 'hacker@chargeshare.in',
        password: 'StrongPassword123!',
        phone: '+919999988877',
        role: 'ADMIN',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('Audit Logging for Admin Authentication', () => {
  test('creates ADMIN_LOGIN_SUCCESS audit entry on successful login', async () => {
    await request(app)
      .post('/api/v1/admin/auth/login')
      .set('User-Agent', 'SuperTest-Agent/1.0')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'AdminPassword123!',
      });

    const log = await AuditLog.findOne({
      action: 'ADMIN_LOGIN_SUCCESS',
      actorEmail: 'admin.portal@chargeshare.in',
    });

    expect(log).toBeDefined();
    expect(log.actorRole).toBe('ADMIN');
    expect(log.targetType).toBe('Auth');
    expect(log.userAgent).toBe('SuperTest-Agent/1.0');
  });

  test('creates ADMIN_LOGIN_FAILED audit entry on failed login attempt (never logs password)', async () => {
    await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'WrongPassword999!',
      });

    const log = await AuditLog.findOne({
      action: 'ADMIN_LOGIN_FAILED',
      actorEmail: 'admin.portal@chargeshare.in',
    });

    expect(log).toBeDefined();
    expect(log.reason).toBe('INVALID_PASSWORD');
    expect(JSON.stringify(log)).not.toContain('WrongPassword999!');
  });
});

describe('Account Lockout Enforcement', () => {
  test('temporarily locks account after 5 consecutive failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'admin.portal@chargeshare.in',
          password: 'BadPassword!',
        });
    }

    const lockedRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'BadPassword!',
      });

    expect(lockedRes.statusCode).toBe(403);
    expect(lockedRes.body.code).toBe('ACCOUNT_LOCKED');
    expect(lockedRes.body.waitMinutes).toBeGreaterThan(0);
  });
});

describe('Token Scope & Role Isolation', () => {
  test('enforces scope: admin on admin endpoints (rider token rejected with 403)', async () => {
    // 1. Get rider token via public login
    const riderLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'rider.portal@chargeshare.in',
        password: 'RiderPassword123!',
      });
    const riderToken = riderLogin.body.token;

    // 2. Attempt to access admin stats
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('rejects admin token on rider vehicle creation endpoint with 403', async () => {
    // 1. Get admin token
    const adminLogin = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'AdminPassword123!',
      });
    const adminToken = adminLogin.body.token;

    // 2. Attempt to create vehicle using admin token
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        make: 'Ather',
        model: '450X',
        registrationNumber: 'KA01EV9999',
        connectorType: '3-pin',
        batteryCapacity: 3.7,
      });

    // Admin token is rejected on marketplace rider routes
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('mustChangePassword Lifecycle & Session Revocation', () => {
  test('blocks back-office operations when mustChangePassword is true, until changed', async () => {
    // 1. Set mustChangePassword: true
    adminUser.mustChangePassword = true;
    await adminUser.save();

    // 2. Login to get token
    const loginRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'AdminPassword123!',
      });
    const token = loginRes.body.token;

    // 3. Normal admin route is blocked
    const blockedRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(blockedRes.statusCode).toBe(403);
    expect(blockedRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // 4. Change password via dedicated change-password endpoint
    const changeRes = await request(app)
      .post('/api/v1/admin/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        newPassword: 'BrandNewAdminPassword2026!',
      });

    expect(changeRes.statusCode).toBe(200);
    expect(changeRes.body.success).toBe(true);
    const newToken = changeRes.body.token;

    // 5. Subsequent access to stats succeeds with new token
    const statsRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${newToken}`);

    expect(statsRes.statusCode).toBe(200);
    expect(statsRes.body.stats).toBeDefined();

    // 6. Old token is rejected due to tokenVersion increment
    const oldTokenRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(oldTokenRes.statusCode).toBe(401);
    expect(oldTokenRes.body.code).toBe('SESSION_EXPIRED');
  });
});

describe('Admin CLI Utilities', () => {
  test('createAdmin script creates an admin with mustChangePassword flag', async () => {
    const newAdmin = await createAdmin({
      name: 'CLI Created Admin',
      email: 'cli.admin@chargeshare.in',
      password: 'StrongAdminPass123!',
    });

    expect(newAdmin).toBeDefined();
    expect(newAdmin.role).toBe('ADMIN');
    expect(newAdmin.mustChangePassword).toBe(true);

    const audit = await AuditLog.findOne({
      action: 'ADMIN_CREATE',
      targetIdentifier: 'cli.admin@chargeshare.in',
    });
    expect(audit).toBeDefined();
  });

  test('resetAdminPassword script resets password, invalidates sessions, and sets mustChangePassword', async () => {
    const updated = await resetAdminPassword({
      email: 'admin.portal@chargeshare.in',
      password: 'ResetTempPassword123!',
    });

    expect(updated).toBeDefined();
    expect(updated.mustChangePassword).toBe(true);
    expect(updated.tokenVersion).toBeGreaterThan(adminUser.tokenVersion);

    // Old password should fail
    const oldLogin = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'AdminPassword123!',
      });
    expect(oldLogin.statusCode).toBe(401);

    // New password should succeed
    const newLogin = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        email: 'admin.portal@chargeshare.in',
        password: 'ResetTempPassword123!',
      });
    expect(newLogin.statusCode).toBe(200);
  });
});
