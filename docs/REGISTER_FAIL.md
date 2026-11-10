# Registration Failure Diagnosis Report

## 1. Reproduction Attempts (Payloads & Responses)

### Attempt 1: Fresh Rider Registration
- **URL**: `POST /api/v1/auth/register`
- **Request Payload**:
  ```json
  {
    "name": "Rider Test",
    "email": "test_rider_1793603181881@example.com",
    "password": "Password123!",
    "phone": "+919876543210",
    "role": "EV_OWNER",
    "city": "Bengaluru"
  }
  ```
- **Response**: HTTP 201 Created
- **Response Body**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "user": {
      "id": "6ae8366d2f98faa37b7fedfc",
      "name": "Rider Test",
      "email": "test_rider_1793603181881@example.com",
      "phone": "+919876543210",
      "role": "EV_OWNER",
      "isVerifiedHost": false,
      "city": "Bengaluru",
      "emailVerified": false
    }
  }
  ```

### Attempt 2: Fresh Host Registration with Valid-Looking Formatted Phone (`+91 98765 43210`)
- **Context**: The placeholder on `/register` is `placeholder="+91 98765 43210"`. A host user following the exact placeholder formatting enters `+91 98765 43210`.
- **Request Payload**:
  ```json
  {
    "name": "Rajesh Host",
    "email": "host_fresh_101@example.com",
    "password": "HostPassword123!",
    "phone": "+91 98765 43210",
    "role": "HOST",
    "city": "Bengaluru"
  }
  ```
- **Response**: HTTP 400 Bad Request
- **Response Body**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      {
        "field": "phone",
        "message": "Please enter a valid Indian mobile number (e.g. +91 9876543210)"
      }
    ]
  }
  ```
- **UI Error Shown**: `"Validation failed"` or generic fallback `"Registration failed"` because:
  1. The client form only reads `err.response?.data?.message`, completely discarding `err.response.data.errors`.
  2. The input fields have no field-level error rendering on `/register`.
  3. The regex in `auth.validator.js` (`/^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/`) fails when spaces or dashes appear between subscriber digits (e.g. `98765 43210`), despite the UI placeholder encouraging that exact pattern.

### Attempt 3: Host Registration with Existing / Duplicate Email
- **Request Payload**:
  ```json
  {
    "name": "Duplicate Host",
    "email": "host1@chargeshare.in",
    "password": "HostPassword123!",
    "phone": "+919876543219",
    "role": "HOST",
    "city": "Bengaluru"
  }
  ```
- **Response**: HTTP 400 Bad Request (Should be HTTP 409 Conflict per REST standards and prompt requirements)
- **Response Body**:
  ```json
  {
    "success": false,
    "message": "An account with this email address already exists."
  }
  ```
- **UI Error Shown**: The banner displays the message, but does not provide a direct "Sign in" shortcut link, does not highlight the email field, and does not return structured field errors `{ field: "email", message }`.

---

## 2. Suspect Investigation & Evidence

### (a) Email Verification / Welcome Email Send
- **Location**: `server/src/controllers/auth.controller.js` line 78; `server/src/services/email.service.js`.
- **Code**:
  ```javascript
  sendWelcomeAndVerificationEmail(user, verificationToken).catch((err) =>
    console.error('Welcome email error:', err.message)
  );
  ```
- **Findings**:
  - The welcome email is called with `.catch(...)`, which prevents an unhandled rejection, but `nodemailer.createTestAccount()` runs synchronously during the first email transmission. In environments with slow DNS or restricted outbound SMTP, this can hang or fail without clear dev feedback.
  - Furthermore, if any intermediate step fails after `User.create(...)`, the user document remains committed in MongoDB without rollback. Any subsequent retry with the same email immediately collides with the orphaned record.

### (b) Duplicate Email & Phone (409 / Mongo E11000)
- **Location**: `auth.controller.js` lines 55-61; `errorHandler.js` lines 6-14; `models/User.js`.
- **Findings**:
  - Duplicate email is currently checked via `User.findOne({ email })`, but returns HTTP 400 instead of HTTP 409.
  - Phone duplicates are NOT checked prior to user creation. Moreover, phones are not normalized (e.g. `9876543210` vs `+919876543210` vs `09876543210` are treated as distinct strings).
  - MongoDB unique index collisions (E11000) in `errorHandler.js` return generic string messages rather than structured field error arrays (`errors: [{ field, message }]`).

### (c) Host-Specific Payload or Validation
- **Location**: `auth.validator.js` line 16; `RegisterPage.jsx` line 55-62.
- **Findings**:
  - `role` accepts `z.enum(['EV_OWNER', 'HOST'])`.
  - There are no extra required fields in the registration schema for hosts (onboarding occurs later at `/become-a-host`).
  - However, after host registration succeeds, `RegisterPage.jsx` attempts to navigate to `/become-a-host`, but the `useEffect` listening to `isAuthenticated` simultaneously redirects to `/host/dashboard`, causing a race condition in route navigation.

### (d) Rate Limiting (429) on `/auth/register`
- **Location**: `server/src/app.js` line 102 (`authLimiter`).
- **Findings**:
  - `authLimiter` enforces rate limiting on `/api/v1/auth`. If 429 is returned, it sends `{ success: false, message: 'Too many authentication attempts...' }`.
  - The client form does not handle 429 specifically and displays the raw message without indicating `Retry-After` or providing a countdown.

### (e) CORS / Proxy / Base URL
- **Location**: `client/vite.config.js`; `server/src/app.js`.
- **Findings**:
  - Vite proxies `/api` to `http://localhost:5000`. CORS is permissive in development. Not a cause of registration failure.

### (f) Client Swallowing `error.response.data` & Form Layout Issues
- **Location**: `client/src/pages/RegisterPage.jsx` line 67-69.
- **Findings**:
  - The client catch block only reads `err.response?.data?.message || 'Registration failed'`.
  - When `validate.js` returns `{ message: "Validation failed", errors: [{ field: "phone", message: "..." }] }`, the client ignores `errors` entirely and displays `"Validation failed"`.
  - Input fields in `RegisterPage.jsx` and `LoginPage.jsx` use manual `<input className="cs-input pl-10" />` with an absolute icon, causing text and the `+91` prefix to overlap the icon.
  - The shared `Input.jsx` component uses `pl-10` (40px) which provides insufficient clearance (10px) for 16px icons positioned at `pl-3.5` (14px).

---

## 3. Why Rider Succeeded and Host Failed (Root Cause Summary)

1. **Pre-filled Default Phone vs. User-Typed Phone**:
   - `RegisterPage.jsx` initializes `phone` state with `'+919876543210'`.
   - In earlier testing, registering as Rider left the default valid string untouched.
   - When switching to Host, the user naturally typed their own number in standard Indian format (e.g. `98765 43210` or `+91 98765 43210` matching the placeholder `placeholder="+91 98765 43210"`).
   - The server regex `/^(\+91[-\s]?)?[0]?(91)?[6789]\d{9}$/` failed because `\d{9}` does not tolerate internal whitespace.
2. **Missing Field-Level Error Presentation**:
   - The server returned `{ message: "Validation failed", errors: [{ field: "phone", ... }] }`.
   - The UI displayed only the generic message `"Validation failed"` or `"Registration failed"` without pointing to the phone field.
3. **No Phone Normalization**:
   - Phone numbers are not stripped of whitespace or formatted consistently to `+91XXXXXXXXXX`.
4. **Non-Atomic Operations & Non-Standard Status Codes**:
   - Duplicate accounts return 400 instead of 409.
   - No structured `{ field, message }` payload returned for duplicate email or phone.
