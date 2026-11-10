# ChargeShare India: Admin Role & Back-Office Audit

This document establishes the baseline audit of the existing administrative features, API endpoints, RBAC enforcement, data queries, document security, and persona handling across the ChargeShare India platform.

---

## 1. Current Admin Routes, Components & API Endpoints

### 1.1 Frontend Routes & Components
* **Existing Route:** `/admin` -> Rendered by [`AdminDashboardPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/AdminDashboardPage.jsx).
* **Current UI Paradigm:** A single monolithic page titled "Safety Verification Console".
* **Deficiencies in Current Admin UI:**
  - Standard user Navbar is rendered above the admin screen. It still contains rider and host tools ("Find Bays", "Host Dashboard", "My Passes", "My Garage", "Emergency SOS", "Demo Switcher").
  - Lacks dedicated back-office navigation (no sidebar or back-office sub-routes).
  - No dedicated screens for Users legitimacy review, Host listings management, Bookings inspection, Payments & Refunds monitoring, Reports & Disputes triage, Contact messages, or Audit Logs.
  - Lacks route-level protection against unauthorized access in client-side routing (only blocked when an API call returns 403).

### 1.2 Backend API Endpoints & RBAC Status
| Endpoint | Method | Middleware | Current Roles Allowed | RBAC Coverage |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/admin/stats` | `GET` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |
| `/api/v1/admin/chargers` | `GET` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |
| `/api/v1/admin/users` | `GET` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |
| `/api/v1/admin/host-stats` | `GET` | `protect`, `authorize('HOST', 'ADMIN')` | `HOST`, `ADMIN` | Shared endpoint for host dashboard metrics |
| `/api/v1/verifications/pending` | `GET` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |
| `/api/v1/verifications/:id/review` | `POST` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |
| `/api/v1/reports` | `GET` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |
| `/api/v1/reports/:id` | `PATCH` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |
| `/api/v1/contact` | `GET` | `protect`, `authorize('ADMIN')` | `ADMIN` | ✅ 401 if unauthenticated, 403 for `EV_OWNER` or `HOST` |

---

## 2. Document Storage, Review Process & Notification Gaps

1. **Document Storage & Serving:**
   - Uploads are currently saved to local `/uploads` directory via Multer ([`upload.routes.js`](file:///c:/projects/ev_charger/server/src/routes/upload.routes.js)).
   - **Severe Security Defect:** Files are served as public static assets via `app.use('/uploads', express.static(uploadDir))` in [`app.js`](file:///c:/projects/ev_charger/server/src/app.js#L174). Anyone with the URL can view sensitive Aadhaar/PAN cards, electricity bills, and society NOCs without authentication.
   - **Target Fix:** Serve documents exclusively through an authenticated, admin-only (or owning-host) endpoint with permission checks and short-lived signed URLs/tokens. Every document view/download by an admin must create an audit entry. Mask ID numbers in UI (show last 4 characters only).

2. **KYC Verification Review:**
   - **Rejection Reason:** Rejection did not strictly require free-text reasons of at least 10 characters or preset categorization.
   - **Host Notification:** Neither approval nor rejection triggers an email or in-app notification to the host. The host only discovers their status upon checking their dashboard.
   - **Statuses:** Currently limited to `PENDING`, `APPROVED`, `REJECTED`. Needs additive statuses `NOT_SUBMITTED` and `RESUBMISSION_REQUESTED`.
   - **Safety & Admin Checklists:** Reviewers could approve listings without explicitly confirming that documents are legible, address matches the bay, NOC is present for apartments, and earthing is declared.

3. **Database Seed & Persona Creation:**
   - In [`seed.js`](file:///c:/projects/ev_charger/server/src/scripts/seed.js), the admin account is seeded with a static password: `admin@chargeshare.in` / `<demo-password>`.
   - The UI contains 1-click demo persona buttons on `/login` and a Demo Switcher dropdown in [`Navbar.jsx`](file:///c:/projects/ev_charger/client/src/components/layout/Navbar.jsx) regardless of production mode.

---

## 3. Audit of KPI Cards & Hard-Coded Values

Inspection of [`AdminDashboardPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/AdminDashboardPage.jsx) revealed hardcoded numbers and area names:

| UI KPI Card | Current Rendering Code | Defect / Hard-Coded Finding | Target Dynamic Solution |
| :--- | :--- | :--- | :--- |
| **Registered Riders & Hosts** | `{stats?.totalUsers \|\| 248}` | Fallback number `248` is hard-coded. | Compute real counts from `User.countDocuments()` split by roles (`EV_OWNER`, `HOST`, `ADMIN`). |
| **Pending KYC Audits** | `{pendingVerifications.length}` | Only counts items loaded in first unpaginated array. | Query `Verification.countDocuments({ status: 'PENDING' })` with oldest waiting age. |
| **Verified 16A Bays** | `{stats?.activeChargers \|\| 42}` | Fallback `42` is hard-coded. Subtitle: `"Indiranagar, Koramangala & HSR"` is completely hard-coded. | Query `Charger.countDocuments({ status: 'VERIFIED' })`. Group top areas dynamically from charger addresses. |
| **Open Bay Defect Reports** | `{reports.filter((r) => r.status === 'PENDING').length}` | Filtered only on in-memory slice of 20 reports. | Query `Report.countDocuments({ status: { $in: ['PENDING', 'INVESTIGATING'] } })`. |

---

## 4. Existing Models Inventory (Reuse & Do Not Duplicate)

* **[`User.js`](file:///c:/projects/ev_charger/server/src/models/User.js):** Riders, Hosts, Admins. Fields include `emailVerified`, `failedLoginAttempts`, `lockUntil`, `tokenVersion`, `isDeleted`. Needs additive fields: `phoneVerified`, `trustStatus`, `trustReason`, `trustUpdatedAt`, `trustUpdatedBy`, `adminNotes`, `mustChangePassword`.
* **[`Charger.js`](file:///c:/projects/ev_charger/server/src/models/Charger.js):** Charging bays. Fields include `status: ['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED']`.
* **[`Verification.js`](file:///c:/projects/ev_charger/server/src/models/Verification.js):** KYC records. Add additive enum values (`NOT_SUBMITTED`, `RESUBMISSION_REQUESTED`) and `reviewChecklist`.
* **[`Booking.js`](file:///c:/projects/ev_charger/server/src/models/Booking.js):** Contains bookings, Razorpay payment and refund fields, and unique slot double-booking index. (Unchanged business logic).
* **[`Report.js`](file:///c:/projects/ev_charger/server/src/models/Report.js):** Charger reports and defect logs.
* **[`Contact.js`](file:///c:/projects/ev_charger/server/src/models/Contact.js):** Contact submissions and grievance handling.
* **[`Notification.js`](file:///c:/projects/ev_charger/server/src/models/Notification.js):** In-app notification delivery to users.
* **New Model to Create:** `AuditLog.js` (Additive only) for logging who, what, target, reason, timestamp, and IP address for all administrative actions.

---

## 5. Visual Proof: Pre-Transformation Admin Screenshots

Screenshots captured before any changes:
* Desktop (1280px, Light Theme): `docs/screenshots/admin-before/admin_before_1280_light.png`
* Desktop (1280px, Dark Theme): `docs/screenshots/admin-before/admin_before_1280_dark.png`
* Mobile (360px, Light Theme): `docs/screenshots/admin-before/admin_before_360_light.png`
* Mobile (360px, Dark Theme): `docs/screenshots/admin-before/admin_before_360_dark.png`
