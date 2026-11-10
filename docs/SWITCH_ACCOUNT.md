# Audit and Diagnosis: Switching Accounts Across Host, Rider, and Admin Roles

**Document Version:** 1.0.0  
**Date:** November 7, 2026  
**Status:** Diagnostic Complete  

---

## 1. Summary of Issue

When a user is logged in as a **HOST** or **RIDER** (EV Owner), attempting to access `/admin/login` or any `/admin/*` route causes one of two failure modes:
1. **Accessing `/admin/*` routes (e.g. `/admin`, `/admin/audit`, `/admin/kyc`)**:
   `AdminLayout` detects that `user` exists with a non-admin role (`HOST` or `EV_OWNER`) and immediately renders the `Access Restricted (403)` screen. Crucially, the 403 screen:
   - Does not display who is currently signed in.
   - Does not provide an action to "Sign in as admin" or "Sign out".
   - Only provides a single button: "Return to ChargeShare Home" (`/explore`), which leaves the user trapped in their non-admin role.
2. **Accessing `/admin/login` while signed in as Host or Rider**:
   - The form renders, but does not display any account-switching notice informing the user that they are currently logged in as a Host or Rider, and that authenticating as Admin will transition the session.
   - When the user submits valid administrator credentials, `adminLogin` sets `cs_admin_token` and `adminUser`, but **fails to purge the existing rider/host session** (`cs_token`, `cs_user_hint`, `user` in state, and the `token` cookie).
   - Upon redirect to `/admin`, `AdminLayout` evaluates `user.role !== 'ADMIN'` (because the stale host/rider object is still in React state), causing the page to immediately re-render the **403 Forbidden** screen even though the administrator authentication succeeded!

---

## 2. Guard and Redirect Inventory

| Component / File | Lines | Type | Exact Rule & Behavior |
| :--- | :--- | :--- | :--- |
| **`AdminLayout`**<br>[`client/src/components/admin/AdminLayout.jsx`](file:///c:/projects/ev_charger/client/src/components/admin/AdminLayout.jsx) | `227–252` | Route Guard | `if ((user && user.role !== 'ADMIN') \|\| (currentAdmin && currentAdmin.role !== 'ADMIN'))` -> renders static 403 screen with only `<Link to="/explore">Return to ChargeShare Home</Link>`. No account indicator, no "Sign in as admin", no "Sign out". |
| **`AdminLayout`**<br>[`client/src/components/admin/AdminLayout.jsx`](file:///c:/projects/ev_charger/client/src/components/admin/AdminLayout.jsx) | `254–257` | Route Redirect | `if (!isAuthed \|\| !currentAdmin \|\| currentAdmin.role !== 'ADMIN')` -> `<Navigate to={'/admin/login?redirect=' + pathname} replace />`. |
| **`AdminLoginPage`**<br>[`client/src/pages/admin/AdminLoginPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/admin/AdminLoginPage.jsx) | `45–49` | Page Redirect | `if (adminAuthReady && isAdminAuthenticated && adminUser?.role === 'ADMIN') navigate(redirectUrl)`. If already authenticated as ADMIN, redirects to `/admin` or return path. Does not bounce host/rider. |
| **`LoginPage`**<br>[`client/src/pages/LoginPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/LoginPage.jsx) | `31–39` | Page Redirect | `if (authReady && isAuthenticated) { if (user?.role === 'ADMIN' \|\| searchParams.get('switch') === 'true') return; if (user?.role === 'HOST') navigate('/host/dashboard'); else navigate(from); }`. Does not detect active `adminUser` or display switch warning. |
| **`RegisterPage`**<br>[`client/src/pages/RegisterPage.jsx`](file:///c:/projects/ev_charger/client/src/pages/RegisterPage.jsx) | `33–39` | Page Redirect | `if (authReady && isAuthenticated) { if (user?.role === 'ADMIN') navigate('/admin'); else if (user?.role === 'HOST') navigate('/host/dashboard'); else navigate('/explore'); }`. |
| **`RiderHostGuard`**<br>[`client/src/components/common/RiderHostGuard.jsx`](file:///c:/projects/ev_charger/client/src/components/common/RiderHostGuard.jsx) | `9–39` | Action Guard | Prevents users with `role === 'ADMIN'` from accessing `/my-bookings`, `/vehicles`, `/become-a-host`, and `/host/dashboard`. |

---

## 3. Auth Storage, Token Isolation, and Interceptor Analysis

### Client-Side Storage
* **Rider/Host Session**:
  - Token Key: `localStorage.getItem('cs_token')`
  - Hint Key: `localStorage.getItem('cs_user_hint')` -> `{ name, role, email }`
* **Admin Session**:
  - Token Key: `localStorage.getItem('cs_admin_token')`
  - Hint Key: `localStorage.getItem('cs_admin_hint')` -> `{ id, name, email, role, mustChangePassword }`
* **HttpOnly Cookies**:
  - Rider/Host: `token` (issued by `sendTokenResponse` in [`server/src/controllers/auth.controller.js`](file:///c:/projects/ev_charger/server/src/controllers/auth.controller.js))
  - Admin: `admin_session` (issued by `sendAdminTokenResponse` in [`server/src/controllers/admin.auth.controller.js`](file:///c:/projects/ev_charger/server/src/controllers/admin.auth.controller.js))

### Axios Interceptors
* **Standard Instance (`api`)** in [`client/src/services/api.js`](file:///c:/projects/ev_charger/client/src/services/api.js):
  - Injects `Authorization: Bearer ${localStorage.getItem('cs_token')}`.
* **Dedicated Admin Instance (`adminApi`)** in [`client/src/services/api.js`](file:///c:/projects/ev_charger/client/src/services/api.js):
  - Injects `Authorization: Bearer ${localStorage.getItem('cs_admin_token')}` and `X-Admin-Token: ${localStorage.getItem('cs_admin_token')}`.
  - Does NOT attach `cs_token`.
* **Server Admin Login Endpoint (`POST /api/v1/admin/auth/login`)**:
  - Mounted unauthenticated in [`server/src/routes/admin.routes.js`](file:///c:/projects/ev_charger/server/src/routes/admin.routes.js) before `router.use(protect)`.
  - Safely ignores incoming `Authorization: Bearer <rider/host_token>` and `Cookie: token=<rider/host_cookie>`.

### The Core Flaw in Session Transition
When switching from Host/Rider to Admin in `adminLogin`:
1. `adminLogin()` previously only called `setAdminToken(newToken)` and `setAdminUser(newUser)`.
2. It **left `token` and `user` intact** in `AuthContext` state, and did not remove `cs_token` or `cs_user_hint` from `localStorage`.
3. Consequently, both sessions co-existed in client memory, causing `AdminLayout` to see `user.role === 'HOST'` and trigger 403 Forbidden.
4. Likewise, when logging into a rider or host account from an admin session, `login()` left `cs_admin_token` and `adminUser` active.

---

## 4. Live Reproduction Results

### Test Case 1: Host Session Attempting Admin Login
```http
POST /api/v1/admin/auth/login HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Authorization: Bearer [REDACTED_ACCESS_TOKEN]
Cookie: token=[REDACTED_COOKIE]

{
  "email": "admin@chargeshare.in",
  "password": "<demo-password>"
}
```
**Response:**
```http
HTTP/1.1 200 OK
Set-Cookie: admin_session=[REDACTED_ADMIN_SESSION]; Path=/; HttpOnly; SameSite=Lax

{
  "success": true,
  "token": "[REDACTED_TOKEN]",
  "admin_session": "[REDACTED_TOKEN]",
  "user": {
    "id": "6aee35a4d96c6b3f8344876b",
    "name": "Aditya Sen (Admin)",
    "email": "admin@chargeshare.in",
    "role": "ADMIN",
    "mustChangePassword": true
  }
}
```
* **Client Behavior Next**:
  - Client received 200 OK with admin token.
  - Client navigated to `/admin`.
  - In `AdminLayout.jsx`, line 228 evaluated: `user` (Host `Rajesh Kumar`) exists, so `user.role !== 'ADMIN'` is true.
  - `AdminLayout` rendered the 403 Access Restricted screen instead of the back-office overview.
  - Stale host token and cookie remained in browser storage.

### Test Case 2: Rider Session Attempting Admin Login
* Identical behavior: `POST /api/v1/admin/auth/login` returned 200 OK, but client state retained `EV_OWNER` rider user, causing immediate 403 collision on `/admin`.

---

## 5. Architectural Remediation Plan

1. **Atomic Session Replacement (`AuthContext.jsx`)**:
   - `adminLogin(email, password)`: On HTTP 200, atomically clear all rider/host state (`cs_token`, `cs_user_hint`, `token`, `user`) and dispatch server logout call for previous session (best effort, non-blocking).
   - `login(email, password)` and `register(data)`: On HTTP 200, atomically clear all admin state (`cs_admin_token`, `cs_admin_hint`, `adminToken`, `adminUser`, `admin_session` cookie).
   - Add dedicated `switchAccount(target)` method for user menus.
2. **Always Reachable `/admin/login` with Switch Warning**:
   - When a host or rider is logged in (`isAuthenticated && user?.role !== 'ADMIN'`), `/admin/login` renders with an informative banner:
     *"You are signed in as [Name] ([Role]). Signing in as admin will sign you out of this account."*
   - Logged-in admins visiting `/admin/login` redirect to `/admin`.
3. **Enhanced 403 Access Restricted Screen (`AdminLayout.jsx`)**:
   - Display signed-in identity: *"Signed in as [Name], [Role]"*.
   - Provide 3 distinct actions:
     1. **"Sign in as admin"** -> navigates to `/admin/login?redirect=[currentPath]`
     2. **"Sign out"** -> executes `logout()` and refreshes
     3. **"Return to ChargeShare Home"** -> navigates to `/explore`
4. **Public `/login` Admin Switch Warning (`LoginPage.jsx`)**:
   - If an admin session is active (`isAdminAuthenticated`), `/login` renders with:
     *"You are signed in as Admin. Signing in as another user will sign you out of the admin session."*
5. **Navbar User Menu Account Switching (`Navbar.jsx`)**:
   - Add **"Sign in as a different account"** to rider & host dropdown menus (navigates to `/login?switch=true`).
6. **Cross-Tab Synchronization (`BroadcastChannel`)**:
   - Instantiate `charges_share_auth_channel` BroadcastChannel (with `storage` event fallback) so session changes in one tab immediately synchronize other tabs.
