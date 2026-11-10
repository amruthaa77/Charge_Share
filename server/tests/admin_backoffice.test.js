import request from 'supertest';
import app from '../src/app.js';
import { connectTestDB, clearTestDB, closeTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { Charger } from '../src/models/Charger.js';
import { Verification } from '../src/models/Verification.js';
import { AuditLog } from '../src/models/AuditLog.js';
import fs from 'fs';
import path from 'path';

let adminToken;
let secondAdminToken;
let hostToken;
let riderToken;
let adminUser;
let secondAdminUser;
let hostUser;
let riderUser;
let testCharger;
let testVerification;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();

  // Create Primary Admin
  adminUser = await User.create({
    name: 'Chief Admin',
    email: 'admin.chief@chargeshare.in',
    password: 'Password123!',
    phone: '+919876543201',
    role: 'ADMIN',
    trustStatus: 'VERIFIED',
  });
  const adminLogin = await request(app).post('/api/v1/admin/auth/login').send({
    email: 'admin.chief@chargeshare.in',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.token;

  // Create Second Admin (to test last active admin protection)
  secondAdminUser = await User.create({
    name: 'Backup Admin',
    email: 'admin.backup@chargeshare.in',
    password: 'Password123!',
    phone: '+919876543202',
    role: 'ADMIN',
    trustStatus: 'VERIFIED',
  });
  const secondAdminLogin = await request(app).post('/api/v1/admin/auth/login').send({
    email: 'admin.backup@chargeshare.in',
    password: 'Password123!',
  });
  secondAdminToken = secondAdminLogin.body.token;

  // Create Host
  const hostRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Host Vignesh',
    email: 'vignesh@example.com',
    password: 'Password123!',
    phone: '+919876543203',
    role: 'HOST',
  });
  hostToken = hostRes.body.token;
  hostUser = hostRes.body.user;

  // Create Rider
  const riderRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Rider Deepa',
    email: 'deepa@example.com',
    password: 'Password123!',
    phone: '+919876543204',
    role: 'EV_OWNER',
  });
  riderToken = riderRes.body.token;
  riderUser = riderRes.body.user;

  // Create Charger
  testCharger = await Charger.create({
    hostId: hostUser.id,
    title: 'Indiranagar 16A Bay',
    description: 'Fast 16A residential socket',
    address: '100ft Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    location: { type: 'Point', coordinates: [77.6408, 12.9784] },
    powerKW: 3.3,
    connectorType: '3-pin',
    price: 45,
    status: 'PENDING_VERIFICATION',
  });

  // Create dummy verification file
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, 'test-doc.pdf'), 'Dummy PDF verification proof');

  // Create Verification record
  testVerification = await Verification.create({
    chargerId: testCharger._id,
    hostId: hostUser.id,
    idProofUrl: '/uploads/test-doc.pdf',
    propertyProofUrl: '/uploads/test-doc.pdf',
    documentType: 'BESCOM_BILL',
    documentUrl: '/uploads/test-doc.pdf',
    ownershipDeclaration: true,
    status: 'PENDING',
    idNumberMasked: '••••••1234',
  });
});

describe('Admin Back-Office: Role-Based Access Control (RBAC)', () => {
  it('rejects unauthenticated requests to admin endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  it('rejects EV_OWNER (rider) from admin endpoints with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Forbidden|Not authorized/i);
  });

  it('rejects HOST from admin endpoints with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${hostToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Forbidden|Not authorized/i);
  });

  it('allows authorized ADMIN to access admin stats with 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(typeof res.body.stats.users.total).toBe('number');
  });

  it('rejects public registration with role ADMIN', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Sneaky Infiltrator',
      email: 'sneak@hacker.io',
      password: 'Password123!',
      phone: '+919876543999',
      role: 'ADMIN',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('allows a host user to call the host dashboard endpoint with 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/host-stats')
      .set('Authorization', `Bearer ${hostToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(typeof res.body.stats.totalChargers).toBe('number');
  });

  it('rejects a rider (EV_OWNER) from the host dashboard endpoint with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/host-stats')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('rejects unauthenticated requests to host dashboard endpoint with 401', async () => {
    const res = await request(app).get('/api/v1/admin/host-stats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });
});

describe('Admin Back-Office: KYC Verification State Machine', () => {
  it('requires complete 5-item review checklist for approval', async () => {
    const incompleteChecklist = {
      documentsLegible: true,
      nameMatches: true,
      addressMatchesBay: true,
      nocPresentForApartments: true,
      earthingDeclared: false, // Incomplete!
    };

    const res = await request(app)
      .patch(`/api/v1/verifications/${testVerification._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        feedback: 'Looks good but earthing not formally confirmed.',
        reviewChecklist: incompleteChecklist,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/checklist.*mandatory|validation failed/i);
  });

  it('approves verification with complete checklist, activates bay, and writes AuditLog', async () => {
    const completeChecklist = {
      documentsLegible: true,
      nameMatches: true,
      addressMatchesBay: true,
      nocPresentForApartments: true,
      earthingDeclared: true,
    };

    const res = await request(app)
      .patch(`/api/v1/verifications/${testVerification._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        feedback: 'Earthing verified (<3V neutral-earth) and society NOC sealed.',
        reviewChecklist: completeChecklist,
      });

    expect(res.status).toBe(200);
    expect(res.body.verification.status).toBe('APPROVED');

    // Confirm charger is now VERIFIED
    const updatedCharger = await Charger.findById(testCharger._id);
    expect(updatedCharger.status).toBe('VERIFIED');

    // Confirm AuditLog written
    const auditEntry = await AuditLog.findOne({
      action: 'KYC_APPROVE',
      targetId: testVerification._id,
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.actorEmail).toBe('admin.chief@chargeshare.in');
  });

  it('requires rejection reason >= 10 characters and writes AuditLog', async () => {
    // Attempt with short reason
    const shortRes = await request(app)
      .patch(`/api/v1/verifications/${testVerification._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'REJECTED',
        rejectionReason: 'Bad doc',
      });
    expect(shortRes.status).toBe(400);

    // Provide proper reason
    const validRes = await request(app)
      .patch(`/api/v1/verifications/${testVerification._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'REJECTED',
        rejectionReason: 'BESCOM meter photo is unreadable and name does not match host ID.',
        rejectionPreset: 'ILLEGIBLE_DOCUMENT',
      });
    expect(validRes.status).toBe(200);
    expect(validRes.body.verification.status).toBe('REJECTED');

    const auditEntry = await AuditLog.findOne({
      action: 'KYC_REJECT',
      targetId: testVerification._id,
    });
    expect(auditEntry).not.toBeNull();
  });

  it('handles RESUBMISSION_REQUESTED and notifies host', async () => {
    const res = await request(app)
      .patch(`/api/v1/verifications/${testVerification._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESUBMISSION_REQUESTED',
        resubmissionNotes: 'Please upload a clearer scan of the earthing resistance certificate.',
      });

    expect(res.status).toBe(200);
    expect(res.body.verification.status).toBe('RESUBMISSION_REQUESTED');

    const auditEntry = await AuditLog.findOne({
      action: 'KYC_REQUEST_INFO',
      targetId: testVerification._id,
    });
    expect(auditEntry).not.toBeNull();
  });
});

describe('Admin Back-Office: Document Security & Tamper Protection', () => {
  it('generates short-lived signed URLs for documents and rejects unauthenticated viewers', async () => {
    // Generate signed token
    const signRes = await request(app)
      .post('/api/v1/documents/sign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        documentUrl: '/uploads/test-doc.pdf',
        verificationId: testVerification._id,
      });

    expect(signRes.status).toBe(200);
    expect(signRes.body.signedUrl).toBeDefined();

    // Fetch file using signed URL
    const fetchRes = await request(app).get(signRes.body.signedUrl);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.headers['x-content-type-options']).toBe('nosniff');

    // Confirm AuditLog written for DOCUMENT_VIEW
    const auditView = await AuditLog.findOne({
      action: 'DOCUMENT_VIEW',
    });
    expect(auditView).not.toBeNull();
    expect(auditView.actorEmail).toBe('admin.chief@chargeshare.in');
  });

  it('rejects document access without valid token or signature', async () => {
    const res = await request(app).get('/api/v1/documents/test-doc.pdf');
    expect(res.status).toBe(401);
  });
});

describe('Admin Back-Office: User Legitimacy, Trust Status & Moderation', () => {
  it('returns paginated users list with masked PII and computed risk signals', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toBeInstanceOf(Array);
    expect(res.body.users.length).toBeGreaterThan(0);

    const hostEntry = res.body.users.find((u) => u._id === hostUser.id);
    expect(hostEntry).toBeDefined();
    expect(hostEntry.maskedPhone).toBeDefined();
    expect(hostEntry.signals).toBeInstanceOf(Array);
  });

  it('updates trustStatus with mandatory reason and creates audit entry', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${riderUser.id}/trust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        trustStatus: 'FLAGGED',
        reason: 'Multiple rapid dispute reports submitted without clear evidence.',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.trustStatus).toBe('FLAGGED');

    const auditEntry = await AuditLog.findOne({
      action: 'USER_TRUST_CHANGE',
      targetId: riderUser.id,
    });
    expect(auditEntry).not.toBeNull();
  });

  it('prevents administrator self-suspension', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${adminUser._id}/trust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        trustStatus: 'SUSPENDED',
        reason: 'Accidental self lock',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot.*suspend/i);
  });

  it('suspends an abusive user and enforces immediate session revocation', async () => {
    // Suspend rider
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${riderUser.id}/trust`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        trustStatus: 'SUSPENDED',
        reason: 'Violated terms of service by repeatedly defaulting on payments.',
      });
    expect(suspendRes.status).toBe(200);

    // Existing token should now be rejected by protect middleware with 403 ACCOUNT_SUSPENDED
    const protectedReq = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(protectedReq.status).toBe(403);
    expect(protectedReq.body.code).toBe('ACCOUNT_SUSPENDED');

    // Suspended user cannot log in
    const loginAttempt = await request(app).post('/api/v1/auth/login').send({
      email: 'deepa@example.com',
      password: 'Password123!',
    });
    expect(loginAttempt.status).toBe(403);
    expect(loginAttempt.body.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('Admin Back-Office: Charger Suspension & Relisting', () => {
  it('suspends and relists a charging bay with audit logging', async () => {
    // Suspend
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/chargers/${testCharger._id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'suspend',
        reason: 'Host reported broken MCB trip breaker awaiting electrician.',
      });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.charger.status).toBe('SUSPENDED');

    const suspendAudit = await AuditLog.findOne({
      action: 'LISTING_SUSPEND',
      targetId: testCharger._id,
    });
    expect(suspendAudit).not.toBeNull();

    // Relist
    const relistRes = await request(app)
      .patch(`/api/v1/admin/chargers/${testCharger._id}/relist`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Electrician completed repairs and verified 16A grounding.',
      });
    expect(relistRes.status).toBe(200);
    expect(relistRes.body.charger.status).toBe('VERIFIED');

    const relistAudit = await AuditLog.findOne({
      action: 'LISTING_RELIST',
      targetId: testCharger._id,
    });
    expect(relistAudit).not.toBeNull();
  });
});

describe('Admin Back-Office: CSV Export & Forced Password Rotation', () => {
  it('exports user directory to CSV and creates audit log', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users/export.csv')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Name,Email,Phone,Role,Trust Status');

    const auditExport = await AuditLog.findOne({
      action: 'DATA_EXPORT',
    });
    expect(auditExport).not.toBeNull();
  });

  it('updates forced admin password and clears mustChangePassword flag', async () => {
    // Set admin to mustChangePassword
    await User.findByIdAndUpdate(secondAdminUser._id, { mustChangePassword: true });

    const changeRes = await request(app)
      .post('/api/v1/admin/change-forced-password')
      .set('Authorization', `Bearer ${secondAdminToken}`)
      .send({
        newPassword: 'BrandNewStrongPassword123!',
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.token).toBeDefined();

    const updatedUser = await User.findById(secondAdminUser._id);
    expect(updatedUser.mustChangePassword).toBe(false);

    const auditChange = await AuditLog.findOne({
      action: 'ADMIN_PASSWORD_RESET',
      actorId: secondAdminUser._id,
    });
    expect(auditChange).not.toBeNull();
  });
});
