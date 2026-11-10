# ChargeShare India — Comprehensive Responsive & Cross-Device Audit

**Date:** 2026-10-30  
**Audit Tool:** Headless Chromium / Playwright with Chrome Channel, 25 Viewport Profiles  
**Scope:** 20 Routes × 25 Viewports = 500 Viewport Audits, 290 Automated Before-Screenshots in `/docs/screenshots/responsive-before/`

---

## Executive Summary

Across 20 core routes, the audit detected **235 horizontal scroll regressions**, **11,157 touch targets below 44x44px** on touch-enabled viewports, and **46 instances of text clipping** under 200% zoom and 130% OS font scaling.

The primary root cause of horizontal scrolling across **100% of tested routes** on phone viewports (320px to 430px) is the `Navbar` header actions bar and logo row, which expands to between 484px and 516px wide without wrapping or responsive collapsing. In addition, viewport meta restrictions in `index.html` block user zoom, fixed `100vh` units cause height jumps on mobile browser address bar collapse, safe areas (`env(safe-area-inset-*)`) are missing from headers, bottom navigation, and modals, and touch targets across interactive controls fail the WCAG 44×44px minimum target size criterion.

---

## Tested Viewport Matrix

| Category | Viewport Descriptor | Dimensions | Type / Characteristics |
| :--- | :--- | :--- | :--- |
| **Phones (Portrait)** | `phone_320x568` | 320 × 568 | iPhone SE 1st Gen / Minimal Small Phone |
| | `phone_360x740` | 360 × 740 | Standard Android (Galaxy S series base) |
| | `phone_375x667` | 375 × 667 | iPhone SE 2nd/3rd Gen |
| | `phone_390x844` | 390 × 844 | iPhone 13 / 14 |
| | `phone_430x932` | 430 × 932 | iPhone 14 / 15 Pro Max |
| | `phone_412x915` | 412 × 915 | Google Pixel 7 / Pro |
| | `phone_344x882` | 344 × 882 | Samsung Galaxy Z Fold (Cover Screen) |
| **Phones (Landscape)** | `phone_ls_667x375` | 667 × 375 | iPhone SE Landscape |
| | `phone_ls_844x390` | 844 × 390 | iPhone 14 Landscape |
| | `phone_ls_915x412` | 915 × 412 | Pixel 7 Landscape |
| **Tablets (Portrait)** | `tablet_768x1024` | 768 × 1024 | Apple iPad Mini / iPad Air |
| | `tablet_820x1180` | 820 × 1180 | Apple iPad 10th Gen |
| | `tablet_1024x1366` | 1024 × 1366 | Apple iPad Pro 12.9" |
| | `tablet_800x1280` | 800 × 1280 | Android Tablet (Samsung Tab / Lenovo) |
| **Tablets (Landscape)** | `tablet_ls_1024x768` | 1024 × 768 | iPad Mini Landscape |
| | `tablet_ls_1180x820` | 1180 × 820 | iPad 10th Gen Landscape |
| | `tablet_ls_1366x1024`| 1366 × 1024 | iPad Pro 12.9" Landscape |
| | `tablet_ls_1280x800` | 1280 × 800 | Android Tablet Landscape |
| **Laptops & Desktops** | `desktop_1280x720` | 1280 × 720 | HD Laptop / Standard Desktop |
| | `desktop_1366x768` | 1366 × 768 | Common Budget Laptop Resolution |
| | `desktop_1440x900` | 1440 × 900 | MacBook Air 13" |
| | `desktop_1920x1080` | 1920 × 1080 | Full HD Monitor (FHD) |
| | `desktop_2560x1440` | 2560 × 1440 | QHD / 2K Studio Display |
| **Accessibility Viewports** | `zoom_200_360px` | 360 × 740 | 200% Browser Zoom Emulation |
| | `text_scale_130_360px`| 360 × 740 | 130% OS Text Scaling (20.8px Base Font) |

---

## Route Breakdown: Horizontal Scroll, Touch Targets & Clipped Text

| Route | Path | Viewports Failing ScrollWidth | Min Target Violations | Clipped Text Hits | Root Cause Elements |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Landing** | `/` | 10 (Phones) | 602 | 7 | `Navbar` actions (516px), Hero canvas fixed width, testimonial cards without `min-w-0` |
| **Login** | `/login` | 10 (Phones) | 569 | 1 | `Navbar` actions (516px), auth card horizontal margins on 320px |
| **Register** | `/register` | 10 (Phones) | 592 | 1 | `Navbar` actions (516px), 2-col role picker chips |
| **Forgot Password** | `/forgot-password` | 10 (Phones) | 520 | 1 | `Navbar` actions (516px) |
| **Reset Password** | `/reset-password` | 10 (Phones) | 538 | 1 | `Navbar` actions (516px) |
| **Explore** | `/explore` | 10 (Phones) | 609 | 2 | `Navbar` actions (516px), corridor pill track without overflow padding, `h-[calc(100vh-230px)]` |
| **Charger Detail** | `/chargers/demo-charger` | 10 (Phones) | 706 | 6 | `Navbar` actions (516px), slot time buttons row, fixed QR code size (160px), sticky widget un-docked |
| **My Passes** | `/my-bookings` | 17 (Phones + Tablets) | 642 | 0 | `Navbar` authenticated pill group (484px), action button row (`Keep Pass` / `Cancel`) |
| **Garage** | `/vehicles` | 17 (Phones + Tablets) | 564 | 0 | `Navbar` authenticated pill group (484px), vehicle card action pills |
| **Host Dashboard** | `/host/dashboard` | 17 (Phones + Tablets) | 686 | 0 | `Navbar` authenticated pill group (484px), 4-button horizontal socket action cluster |
| **Become a Host** | `/become-a-host` | 17 (Phones + Tablets) | 531 | 1 | `Navbar` actions (516px), 4-column stepper indicator crams labels on `<400px` |
| **Admin KYC** | `/admin` | 17 (Phones + Tablets) | 531 | 1 | `Navbar` authenticated pill group (484px), table row actions flex row |
| **About** | `/about` | 10 (Phones) | 483 | 9 | `Navbar` actions (516px), value cards grid without flex-wrap |
| **Contact** | `/contact` | 10 (Phones) | 614 | 0 | `Navbar` actions (516px), grievance officer address card |
| **Help** | `/help` | 10 (Phones) | 483 | 0 | `Navbar` actions (516px), FAQ trigger height |
| **Privacy Policy** | `/privacy` | 10 (Phones) | 483 | 7 | `Navbar` actions (516px), table of contents sidebar |
| **Terms of Service** | `/terms` | 10 (Phones) | 483 | 3 | `Navbar` actions (516px) |
| **Refund Policy** | `/refund-policy` | 10 (Phones) | 483 | 3 | `Navbar` actions (516px) |
| **Cookie Policy** | `/cookies` | 10 (Phones) | 501 | 2 | `Navbar` actions (516px), cookie category table without horizontal scroll wrapper |
| **404 Not Found** | `/page-404-check` | 10 (Phones) | 537 | 1 | `Navbar` actions (516px) |

---

## Detailed Root Cause Analysis & Empirical Evidence

### 1. Viewport Meta Violation (`client/index.html`)
* **Evidence:** Line 6:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  ```
* **Failure:** Disabling user zoom (`maximum-scale=1.0`, `user-scalable=no`) directly violates WCAG 2.1 AA Success Criterion 1.4.4 (Resize Text) and causes accessibility audits to fail. It also lacks `viewport-fit=cover`, resulting in letterboxed margins on notched iPhones and Android edge displays.
* **Fix Required:** Update to `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Add `<meta name="theme-color">` for both color schemes and `<meta name="color-scheme" content="light dark">`.

### 2. Universal Horizontal Overflow on Mobile (`Navbar.jsx`)
* **Evidence:**
  - Viewport width: **320px**
  - Document scrollWidth: **516px** (Logged-out) / **484px** (Logged-in)
  - Offending elements:
    - Logo container (`.font-editorial.text-xl` + `Bengaluru` badge + `EV Two-Wheeler Network` subtitle) has minimum intrinsic width of ~210px.
    - Right-side actions bar (`Sign In` link + `Get Started` button + theme toggle + hamburger button) has minimum intrinsic width of ~240px.
    - Combined row inside `justify-between h-16` forces the header to 516px, overflowing all phone viewports (320px–430px).
* **Fix Required:**
  - Condense logo on mobile (`< 640px`): Show compact brand icon + "ChargeShare" with badge hidden or inline; hide subtitle on mobile.
  - Collapse buttons on mobile: Move "Sign In" / "Get Started" / "Demo Switcher" / user profile items into the animated slide-out navigation drawer.
  - On mobile header, show only Logo + Theme Toggle + Mobile Menu trigger (total width < 260px).
  - Add `html, body { overflow-x: clip; max-width: 100%; }` in `index.css`.

### 3. Missing Mobile Slide-Out Drawer in Navbar
* **Evidence:** `Navbar.jsx` lines 442–450 toggle `setMobileMenuOpen(!mobileMenuOpen)`, but the JSX never renders a mobile drawer component when `mobileMenuOpen` is true! As a result, mobile users have no way to access navigation links, the demo switcher, or profile actions from the header.
* **Fix Required:** Implement a sliding drawer with Backdrop, Focus Trap, Escape key listener, safe-area padding (`pt-safe`, `pb-safe`), and auto-closing on route navigation.

### 4. Touch Targets Failing 44×44px Criterion
* **Evidence:** 11,157 instances of interactive elements with dimensions under 44×44px across touch viewports:
  - Theme toggle button: 34×34px (`p-2`)
  - Filter chips on Explore page: 28px to 32px height
  - Pagination / stepper circles: 36×36px
  - Table action buttons (`Approve`, `Reject`, `Settings`, `Pause`): 32px to 36px height
* **Fix Required:** Add `@media (pointer: coarse)` CSS utility or explicit `min-h-[44px] min-w-[44px]` touch target sizing with flex centering.

### 5. Fixed Height `100vh` Viewport Jump
* **Evidence:**
  - `App.jsx` line 62: `<div className="flex flex-col min-h-screen">`
  - `LandingPage.jsx` line 184: `min-h-[600px]` inside `h-[100svh]`
  - `ExplorePage.jsx` line 313: `h-[calc(100vh-230px)]`
  - `HostOnboardPage.jsx` line 184: `min-h-screen`
  - `Modal.jsx` line 103: `max-h-[90vh]`
* **Failure:** In mobile browsers (Safari on iOS, Chrome on Android), `100vh` includes the area obscured by the collapsible address bar and navigation bar. When the address bar collapses or expands on scroll, elements jump and bottom buttons are covered. In landscape mode (e.g. 667×375), `min-h-[600px]` causes the hero to exceed the screen height by 225px, breaking the pinned scrolltrigger.
* **Fix Required:** Standardize on `100dvh` (with `100vh` fallback). Change `min-h-[600px]` to responsive clamp (`min-h-[clamp(340px,70dvh,600px)]`).

### 6. Stepper Layout Degradation on Mobile (`HostOnboardPage.jsx`)
* **Evidence:** Lines 205–220 render 4 grid columns: `grid grid-cols-4 gap-2`. On a 320px or 360px viewport, each column is allocated 70px to 80px, causing text labels ("16A Socket Specs", "Bengaluru Pin", "Safety & KYC") to cram and clip vertically.
* **Fix Required:** On screens `< 640px`, collapse the stepper into a compact "Step 2 of 4: [Current Step Name]" indicator with a slim horizontal progress bar.

### 7. Explore Map & Bottom Sheet Usability on Mobile
* **Evidence:** `ExplorePage.jsx` switches between list and map using an exclusive toggle (`mobileTab === 'list' ? ... : ...`). In map view, the user loses charger details; in list view, the spatial context is lost.
* **Fix Required:** Implement a mobile bottom sheet with peek (docked bottom card), half-expanded, and full list view over the full-screen map, with `touch-action: pan-y` so map gesture pan and sheet swipe do not conflict.

### 8. Charger Detail Booking CTA Floating / Hidden on Mobile
* **Evidence:** In `ChargerDetailPage.jsx`, the booking widget sits in `lg:col-span-5` below the reviews and details in mobile DOM order. A mobile user has to scroll past 6 screens of content before finding the "Instant Book Now" button.
* **Fix Required:** Implement a sticky bottom action bar on mobile (`sticky bottom-0 z-30 pb-safe`) with live status, price per hour, and a prominent "Book Bay Now" button that opens the booking drawer sheet.

### 9. Confirmation QR Code Scaling
* **Evidence:** Fixed `size={160}` in `ChargerDetailPage.jsx` and `MyBookingsPage.jsx`. On high-resolution phones, 160px is difficult for station optical scanners to read from a distance, while on small screens the surrounding card was inflexible.
* **Fix Required:** Scale QR fluidly between 200px and 280px based on container width (`w-full max-w-[280px] aspect-square`).

---

## Action Plan for Steps 1–5

1. **Step 1 (Foundations):** `index.html` meta updates, safe-area utilities in `index.css`, `100dvh` viewport standard, `overflow-x: clip`, fluid clamp typography, shared `Container` component, touch target enforcement on coarse pointers, iOS `-webkit-tap-highlight-color` and `manipulation`.
2. **Step 2 (Components):** Hardened `Navbar` with mobile drawer and condensed logo; `MobileNav` with `pb-safe` and content padding; `Modal` bottom-sheet on mobile; compact forms & `HostOnboardPage` stepper; horizontal scroll hint wrappers on tables; Recharts responsive adjustments; Explore map bottom-sheet; Charger detail sticky CTA; fluid QR pass.
3. **Step 3 (Landing Scroll Story on Mobile):** Clamped editorial font size, Lenis touch tuning (`syncTouch: false`), landscape min-height fix, 3D WebGL DPR cap at 1.5, responsive callouts grid.
4. **Step 4 (Automated Responsive Tests):** Playwright device suite `client/tests/responsive.spec.js` asserting zero horizontal scroll, zero bounding box overflow, >= 44x44 touch targets, zero console errors; outputs screenshots to `/docs/screenshots/responsive-after/`.
5. **Step 5 (Real-Device & Documentation):** Add `npm run dev:lan`, document remote debugging & manual testing checklist in `README.md`.
