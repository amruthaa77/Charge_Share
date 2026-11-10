import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { User } from '../src/models/User.js';

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

  adminUser = await User.create({
    name: 'Platform Administrator',
    email: 'admin.switch@chargeshare.in',
    password: 'AdminPassword123!',
    phone: '+919999900011',
    role: 'ADMIN',
    trustStatus: 'VERIFIED',
    mustChangePassword: false,
  });

  hostUser = await User.create({
    name: 'Host Rajesh',
    email: 'host.switch@chargeshare.in',
    password: 'HostPassword123!',
    phone: '+919999900022',
    role: 'HOST',
    trustStatus: 'VERIFIED',
  });

  riderUser = await User.create({
    name: 'Rider Ananya',
    email: 'rider.switch@chargeshare.in',
    password: 'RiderPassword123!',
    phone: '+919999900033',
    role: 'EV_OWNER',
    trustStatus: 'VERIFIED',
  });
});

describe('Account Switching & Session Boundary Security', () => {
  test('Admin login endpoint succeeds even when request carries existing host token and cookie', async () => {
    // 1. Host logs in
    const hostLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'host.switch@chargeshare.in', password: 'HostPassword123!' });

    expect(hostLoginRes.status).toBe(200);
    const hostToken = hostLoginRes.body.token;
    const hostCookies = hostLoginRes.headers['set-cookie'];

    // 2. Admin logs in with host token in Authorization header and host cookie
    const adminLoginRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Authorization', `Bearer ${hostToken}`)
      .set('Cookie', hostCookies)
      .send({ email: 'admin.switch@chargeshare.in', password: 'AdminPassword123!' });

    expect(adminLoginRes.status).toBe(200);
    expect(adminLoginRes.body.success).toBe(true);
    expect(adminLoginRes.body.user.role).toBe('ADMIN');
    expect(adminLoginRes.body.token).toBeDefined();

    // Verify admin_session cookie is set
    const adminCookies = adminLoginRes.headers['set-cookie'] || [];
    const hasAdminSessionCookie = adminCookies.some((c) => c.startsWith('admin_session='));
    expect(hasAdminSessionCookie).toBe(true);
  });

  test('Host or rider tokens are strictly rejected with 403 on protected /api/admin/* endpoints', async () => {
    // Host token
    const hostLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'host.switch@chargeshare.in', password: 'HostPassword123!' });
    const hostToken = hostLoginRes.body.token;

    const hostAdminReq = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${hostToken}`);

    expect(hostAdminReq.status).toBe(403);
    expect(hostAdminReq.body.error).toBe('FORBIDDEN');

    // Rider token
    const riderLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rider.switch@chargeshare.in', password: 'RiderPassword123!' });
    const riderToken = riderLoginRes.body.token;

    const riderAdminReq = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(riderAdminReq.status).toBe(403);
    expect(riderAdminReq.body.error).toBe('FORBIDDEN');
  });

  test('Failed admin login returns neutral 401 error and leaves host token valid', async () => {
    // Host login
    const hostLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'host.switch@chargeshare.in', password: 'HostPassword123!' });
    const hostToken = hostLoginRes.body.token;

    // Failed admin attempt with wrong password
    const failRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ email: 'admin.switch@chargeshare.in', password: 'WrongPassword123!' });

    expect(failRes.status).toBe(401);
    expect(failRes.body.message).toBe('Invalid email or password.');

    // Host session is completely unaffected and remains valid
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${hostToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('host.switch@chargeshare.in');
  });

  test('Public /auth/login rejects admin credentials with neutral 401 error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin.switch@chargeshare.in', password: 'AdminPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });
});
