# ChargeShare India: Admin Login Portal Audit & Architecture Specification
**Date:** 2026-11-03  
**Status:** Step 0 Complete — Audit & Plan

---

## 1. Current State Audit

### 1.1 Login Page, Components & Endpoints
* **Client Login Component:** [`client/src/pages/LoginPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/LoginPage.jsx).
  * Serves riders, hosts, and platform administrators indiscriminately.
  * Contains public registration links (`/register`), password reset links (`/forgot-password`), and 1-Click Demo Persona shortcuts (Rider, Host, Admin).
* **API Endpoint:** `POST /api/v1/auth/login` (and `/api/auth/login`).
  * Validates credentials against `User.findOne({ email })`.
  * Authenticates all roles (EV_OWNER, HOST, ADMIN) via the same endpoint.
  * Returns a 7-day JWT and sets a 7-day `token` cookie.
* **Client Service:** `authAPI.login` in [`client/src/services/api.js`](file:///c:/projects/ev_charger/client/src/services/api.js).

### 1.2 Role-Based Redirects
* **On Login Form Submit ([`LoginPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/LoginPage.jsx)):**
  * `ADMIN` navigates to `/admin`.
  * `HOST` navigates to `/host/dashboard`.
  * `EV_OWNER` navigates to `/explore` or the `from` query param.
* **On Visiting `/login` While Authenticated:**
  * If `user.role === 'ADMIN'`, redirects to `/admin`.
  * If `user.role === 'HOST'`, redirects to `/host/dashboard`.
  * Otherwise redirects to `/explore`.
* **On Accessing `/admin/*` ([`AdminLayout.jsx`](file:///c:/projects/ev_charger/client/src/components/admin/AdminLayout.jsx)):**
  * If `!isAuthenticated`, currently redirects to `/login?redirect=...` (public login).
  * If `isAuthenticated` but `user.role !== 'ADMIN'`, displays an inline 403 Forbidden screen.

### 1.3 Demo Personas & Demo Switcher Locations
* **Login Page Strip ([`LoginPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/LoginPage.jsx)):**
  * Lines 109–138 render 3 buttons: Rider, Host, and Admin (`handleDemo('ADMIN')`).
* **Navbar Demo Switcher ([`Navbar.jsx`](file:///c:/projects/ev_charger/client/src/components/layout/Navbar.jsx)):**
  * Rendered at desktop top right (line 365), inside user avatar dropdown (line 588), and inside mobile drawer (line 820).
  * All 3 dropdowns include an "Admin" persona button.
* **Auth Context Helper ([`AuthContext.jsx`](file:///c:/projects/ev_charger/client/src/context/AuthContext.jsx)):**
  * `quickDemoLogin(role)` holds static mock credentials for `ADMIN` (`admin@chargeshare.in` / `<demo-password>`).

### 1.4 Admin Provisioning & Lifecycle
* **Database Seeding ([`server/src/scripts/seed.js`](file:///c:/projects/ev_charger/server/src/scripts/seed.js)):**
  * In development, creates `admin@chargeshare.in` with `<demo-password>`.
* **CLI Provisioning ([`server/src/scripts/create-admin.js`](file:///c:/projects/ev_charger/server/src/scripts/create-admin.js)):**
  * `npm run create-admin` CLI script prompts for name, email, and 12+ char password; flags `mustChangePassword: true`; writes `ADMIN_CREATE` audit entry.
* **Startup Bootstrap ([`server/src/server.js`](file:///c:/projects/ev_charger/server/src/server.js)):**
  * Checks `ADMIN_BOOTSTRAP_EMAIL` & `ADMIN_BOOTSTRAP_PASSWORD` env vars on startup if no admin exists.
* **Public Registration Guard ([`server/src/controllers/auth.controller.js`](file:///c:/projects/ev_charger/server/src/controllers/auth.controller.js)):**
  * Rejects `role: 'ADMIN'` with HTTP 400 `VALIDATION_ERROR`.

### 1.5 Rate Limiting & Account Lockout
* **Global Auth Limiter ([`server/src/app.js`](file:///c:/projects/ev_charger/server/src/app.js)):**
  * Express rate-limit on `/api/v1/auth`: 10 requests per 15 minutes per IP (`isTesting ? 1000 : 10`).
* **Progressive Lockout ([`server/src/controllers/auth.controller.js`](file:///c:/projects/ev_charger/server/src/controllers/auth.controller.js)):**
  * `User` schema tracks `failedLoginAttempts` and `lockUntil`. Locks for 15 minutes after 5 consecutive failures.
  * No dedicated audit log entries were previously generated on failed public logins.

### 1.6 Token & Cookie Settings
* **Access Token:**
  * Signed via `jwt.sign({ id, tokenVersion }, ADMIN_JWT_SECRET, { expiresIn: '30m' })` for admin and `JWT_SECRET` for user.
  * No `scope` claim; ordinary tokens can theoretically pass basic signature checks on admin routes if role is tampered or improperly validated.
* **Cookie:**
  * `expires: 7 days`, `httpOnly: true`, `secure: isProd`, `sameSite: isProd ? 'none' : 'lax'`.

### 1.7 Existing Admin Login Route
* **Client:** No `/admin/login` page or route exists.
* **Server:** No dedicated `POST /api/v1/admin/auth/login` endpoint exists.

---

## 2. Target Architecture & Implementation Plan

### 2.1 Server: Dedicated Admin Auth (`/api/v1/admin/auth/*`)
1. **Endpoint `POST /api/v1/admin/auth/login`:**
   * Accepts `{ email, password }`.
   * Queries `User` where `role: 'ADMIN'`.
   * **Timing-Safe Constant-Time Verification:** If user does not exist or has a non-admin role, executes a dummy bcrypt comparison against a pre-computed hash to prevent timing attacks.
   * Returns uniform neutral HTTP 401 (`"Invalid email or password"`) for:
     * Non-existent email
     * Incorrect password
     * Existent email with role `EV_OWNER` or `HOST`
   * Writes `AuditLog` entry (`ADMIN_LOGIN_SUCCESS` or `ADMIN_LOGIN_FAILED`) with client IP, user-agent, reason code, and timestamp. Never logs passwords.
2. **Hardened Public Login `POST /api/v1/auth/login`:**
   * If a user with role `ADMIN` attempts to log in via public `/login`, reject with the same neutral HTTP 401 (`"Invalid email or password"`).
3. **Dedicated Admin Rate Limiting & Lockout:**
   * Stricter rate limit: 5 requests per 15 minutes per IP.
   * Lockout: 15-minute freeze on 5 consecutive failed attempts on the admin account.
4. **Scoped JWT & Strict Cookies:**
   * Admin token signed with: `{ id, role: 'ADMIN', scope: 'admin', tokenVersion }`.
   * Short expiration: 30 minutes (`process.env.ADMIN_JWT_EXPIRES_IN || '30m'`).
   * Cookie: `httpOnly: true`, `secure: true` (in prod), `sameSite: 'strict'`.
   * **Middleware Enforcement:**
     * Admin routes require `req.user.role === 'ADMIN'` AND `decoded.scope === 'admin'`.
     * Non-admin/rider endpoints reject tokens bearing `scope === 'admin'`.
5. **Forced Password Rotation (`mustChangePassword`):**
   * While `mustChangePassword: true`, all admin operations return HTTP 403 `PASSWORD_CHANGE_REQUIRED`, except `POST /api/v1/admin/auth/change-password`.
   * Password update increments `tokenVersion`, invalidating all other active sessions.
6. **CLI Admin Password Reset:**
   * Add `server/src/scripts/reset-admin-password.js` (`npm run reset-admin-password -- --email <email>`).
   * Generates or prompts for a new 12+ char password, sets `mustChangePassword: true`, increments `tokenVersion`, and logs `ADMIN_PASSWORD_RESET` to `AuditLog`.

### 2.2 Client: Isolated Admin Login Portal (`/admin/login`)
1. **New Route `/admin/login`:**
   * Standalone unauthenticated route inside `/admin`.
   * Minimal header: Brand logo, "ChargeShare Back-Office", and theme toggle.
   * No public navbar, no footer, no mobile bottom nav, no register link, no forgot-password link.
   * Note: "Authorized personnel only. Contact your platform owner for account assistance."
   * Clean dark/light theme support, accessible aria-live error messages, 16px minimum inputs, responsive down to 360px.
2. **Route Guards & Redirections:**
   * Logged-out visitor to `/admin/*` redirects to `/admin/login`.
   * Logged-in non-admin visiting `/admin/login` redirects to `/explore`.
   * Logged-in non-admin visiting `/admin/*` renders the 403 Forbidden screen.
   * Logged-in admin visiting `/admin/login` redirects to `/admin`.
   * Admin logout clears tokens and redirects to `/admin/login`.
3. **Search Engine & Crawling Protection:**
   * `<meta name="robots" content="noindex,nofollow" />` on `/admin/login` and admin layouts.
   * `Disallow: /admin` in `robots.txt`.

### 2.3 Demo Mode Isolation
1. **Client Isolation:**
   * Remove `ADMIN` persona option from `LoginPage.jsx` and `Navbar.jsx` Demo Switcher.
   * Demo controls completely unmounted when `VITE_DEMO_MODE=false`.
2. **Server Isolation:**
   * In production (`NODE_ENV=production` or `DEMO_MODE=false`), demo admin login shortcuts return 404.
   * No hardcoded admin credentials in seed data or UI text when in production.

---
