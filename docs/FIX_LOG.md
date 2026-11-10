# ChargeShare India — Surgical Bug-Fix Pass Log

## Phase 0: Diagnosis & Root Cause Analysis

### 1. Theme Application & Mixing
* **Evidence:**
  * `client/index.html` (line 2 & 13): Hardcoded `<html lang="en" class="dark">` and `<body class="bg-navy-950 text-slate-100...">`.
  * `client/src/context/ThemeContext.jsx` (lines 7, 13–17): Initialized with `localStorage.getItem('cs_theme') || 'light'`. On mount, removed `dark` and added `light` (causing initial theme clash / flash).
  * `client/src/index.css` (lines 9–55): Set CSS variables on `:root, .light` vs `.dark`.
  * `client/src/pages/LandingPage.jsx` (line 148): Hardcoded `bg-mintBg text-forest-900` on the page root. When `.dark` class was applied to `<html>`, the page wrapper still forced `#EAF6F4` light mint background, but child `.dark` styles (shadows, borders, glass cards) switched to dark mode, creating mismatched dark/light surfaces on the same page.
  * `client/src/components/layout/Navbar.jsx` (line 86 & 334): Header used `bg-white/80 dark:bg-[#061A14]/85`, but "Sign In" used `text-forest-800 hover:text-forest-950` without dark variant, rendering dark green text on dark green background.
* **Root Cause:**
  Multiple competing mechanisms (`class="dark"` hardcoded in HTML, `ThemeContext` toggling classes, hardcoded Tailwind utility colors like `bg-mintBg` and `text-forest-900` overriding CSS variables).
* **Fix Applied:**
  Standardized on a single source of truth: `data-theme="light|dark"` and class on `<html>`, set by a tiny inline script in `index.html` before first paint. Mapped all Tailwind semantic tokens (`bg-base`, `bg-raised`, `surface`, `border`, `text-primary`, `text-secondary`, `brand`, etc.) to CSS variables tied to `[data-theme="light"]` and `[data-theme="dark"]`.

---

### 2. Forced Dark Sections & Non-Adaptive Colors
* **Evidence:**
  * `LandingPage.jsx`: Bengaluru Tech Corridors card forced `bg-forest-900 text-white` with fixed `text-forest-200`, `text-forest-300`, `bg-white/5`.
  * `LandingPage.jsx`: Final CTA section forced `bg-gradient-to-br from-forest-900 via-forest-800 to-forest-950 text-white`.
  * `Footer.jsx`: Mixed `bg-white/70 dark:bg-[#061A14]` with `text-forest-700 dark:text-slate-400`.
* **Root Cause:**
  Intentional dark cards used arbitrary ad-hoc text colors instead of a dedicated `.surface-dark` utility with `--on-dark-text` and `--on-dark-secondary` tokens.
* **Fix Applied:**
  Defined `.surface-dark` utility setting `--text-primary: #FFFFFF`, `--text-secondary: rgba(255, 255, 255, 0.85)`, and `--border-subtle: rgba(255, 255, 255, 0.18)`. Applied this for intentional dark sections across both themes.

---

### 3. Hero Scroll Story Glitches (Blank Gap & Missing Scenes 2–5)
* **Evidence:**
  * `LandingPage.jsx`: Page root had `overflow-x-hidden`. The hero section was `<section ref={scrollContainerRef} className="relative h-[480vh] w-full">` with `<div className="sticky top-0 h-screen...">`.
  * `index.css`: `body { overflow-x: hidden; }`.
* **Root Cause:**
  CSS specification mandates that `overflow-x: hidden` on any ancestor element creates a scroll boundary that cancels window `position: sticky`. As a result, the sticky container immediately scrolled away off screen on the very first scroll pixel, leaving 480vh of completely blank empty space. The user never saw scenes 2–5 because the container was already scrolled out of view.
* **Fix Applied:**
  Replaced the broken `position: sticky` implementation with a **GSAP ScrollTrigger** timeline with `pin: true`, `scrub: 0.6`, `anticipatePin: 1`, `pinSpacing: true`, and integrated smoothly with **Lenis** smooth scroll. Drove all 5 scenes explicitly via the timeline. Hero pinned element uses `h-[100svh]` (fallback `100vh`) and parent uses `overflow-clip` instead of `overflow-x: hidden`.

---

### 4. Hero 3D / Canvas Cropping & Headline Collision
* **Evidence:**
  * `LandingPage.jsx`: `<RealisticCharger3D className="w-full h-full max-w-6xl max-h-[85vh]" />` was centered directly over the `CHARGE` text.
  * `RealisticCharger3D.jsx`: In Scene 1, `connectorGroup.position.set(2.5 - localP * 3.2, 0.4 - localP * 0.4, 3.2 - localP * 0.8)`. In Three.js units with camera at `z=7.5`, `x=2.5` placed the plug directly on top of the "E" in `CHARGE`.
  * `RealisticCharger3D.jsx`: `centerBadge` had `color: 0x07221a`, `transmission: 0.4`, rendering a dark semi-transparent circular glass disc directly over "G" and "E".
  * `RealisticCharger3D.jsx`: Cable curve points extended to `(1.0, -2.6, -4.8)`. Due to the `max-h-[85vh]` canvas bounds and camera frustum, the cable was clipped with a hard straight edge.
* **Root Cause:**
  Lack of dedicated layout separation between the 3D element and the typography, hard canvas bounding box constraint (`max-h-[85vh]`), and unoptimized camera FOV / cable spline endpoints.
* **Fix Applied:**
  1. Repositioned connector coordinates in Scene 1 to start lower and shifted (`x: 1.6, y: -0.4, z: 2.6`) so it never collides with or obscures the letter "E" in `CHARGE`.
  2. Adjusted camera position (`z=8.2`), FOV (42°), and cable spline curve endpoints with rounded sphere cap so the cable curves gently into camera depth without hard clipping.
  3. Removed the dark translucent `centerBadge` disc artifact.
  4. Added studio 3-point neutral lighting with contact shadow and balanced PBR materials.
  5. Added `ResizeObserver`, capped DPR at 2, paused render loop when offscreen (`IntersectionObserver`), full disposal on unmount, and accessible fallback for `prefers-reduced-motion`.

---

### 5. Non-Adaptive Text Colors (Dark Green on Dark Green)
* **Evidence:**
  * `LandingPage.jsx`: Used `text-forest-900` (`#07221A`), `text-forest-700` (`#0B3D2E`), and `text-forest-600` directly. In dark mode, `#07221A` on `#061A14` was virtually invisible (<1.2:1 contrast ratio, severe WCAG failure).
  * `Navbar.jsx`: "Sign In" had `text-forest-800 hover:text-forest-950` with no dark mode class, rendering invisible dark green text on dark navbar.
  * `HostOnboardPage.jsx`: `<input>` elements used `border-forest-900/15 text-xs text-forest-900` with NO background token, producing dark grey inputs with dark green text on dark theme.
  * Small text (`text-[9px]`, `text-[10px]`, `text-[11px]`): Failed minimum 12px legibility threshold.
* **Root Cause:**
  Direct use of absolute colors instead of CSS variables tied to semantic theme tokens.
* **Fix Applied:**
  Replaced hardcoded `forest-900/700/600` text classes with semantic CSS variables (`var(--text)`, `var(--text-secondary)`, `var(--input-bg)`, `var(--input-text)`). Ensured all text is at least 12px (`text-xs`) and meets WCAG AA 4.5:1 (normal text) and 3:1 (large text/UI).

---

## Issue Checklist & Verification Status Table

| # | Issue | Root Cause | Files Changed | Target Fix | Status |
|---|-------|------------|---------------|------------|:------:|
| 1 | Scroll story scenes 2-5 do not render | `overflow-x: hidden` cancels `sticky top-0`, child scrolls off | `LandingPage.jsx`, `index.css` | GSAP ScrollTrigger timeline with `pin: true` | **DONE** |
| 2 | Blank full-screen gap after the hero | 480vh container remains after sticky child unpinned prematurely | `LandingPage.jsx` | Pinned ScrollTrigger with `pinSpacing: true` & clean end | **DONE** |
| 3 | Mixed dark/light themes; navbar flips | Multiple theme mechanisms, hardcoded background on page root | `index.html`, `ThemeContext.jsx`, `index.css`, `tailwind.config.js` | Single `data-theme` on `<html>`, pre-paint script, CSS variables | **DONE** |
| 4 | Dark-mode hero word & tagline invisible | Hardcoded `text-forest-900` on dark background | `LandingPage.jsx` | Use semantic `--text-primary` & `--text-secondary` | **DONE** |
| 5 | Host onboarding inputs unreadable | `<input>` has no background token and uses `text-forest-900` | `HostOnboardPage.jsx`, `index.css` | Standardize form tokens (`--input-bg`, `--input-text`, `--input-border`, `.cs-input`) | **DONE** |
| 6 | "Sign In" invisible in dark navbar; wrong toggle | No dark text class on Sign In; toggle styling | `Navbar.jsx` | Semantic nav tokens; moon in light mode, sun in dark mode with AA contrast | **DONE** |
| 7 | "How it works" cards text invisible | Hardcoded `text-forest-900/700` inside cards | `LandingPage.jsx` | Semantic card tokens (`--surface`, `--text-primary`, `--text-secondary`) | **DONE** |
| 8 | Earnings ₹ figure nearly invisible | `text-forest-900` on ₹ figure | `LandingPage.jsx` | High-contrast brand green `--color-primary` / `text-brand font-extrabold` display token | **DONE** |
| 9 | Hero product is a crude blob | Primitive unlit shapes with dark materials | `RealisticCharger3D.jsx` | Studio 3-point lighting, bevels, PBR materials, smooth normals | **DONE** |
| 10 | Product overlaps "E" of CHARGE with circle | Center positioning `x=2.5` & translucent glass badge | `RealisticCharger3D.jsx`, `LandingPage.jsx` | Separate layout layers, adjust connector coordinates, remove glass circle artifact | **DONE** |
| 11 | Hard straight crop on cable/canvas edge | Canvas container `max-h-[85vh]` clips 3D spline | `RealisticCharger3D.jsx`, `LandingPage.jsx` | Enlarge canvas bounds, adjust camera FOV & spline endpoints with sphere cap | **DONE** |
| 12 | Excessive empty gaps between sections | Uncontrolled large margins (`py-24 sm:py-32`) | `LandingPage.jsx` | Consistent scale `clamp(56px, 8vw, 112px)` (`py-16 sm:py-24`) | **DONE** |
| 13 | Tiny low-contrast small text | Font size `< 12px` and low-contrast green text | `Navbar.jsx`, `LandingPage.jsx`, `Footer.jsx`, `HostOnboardPage.jsx` | Minimum 12px, AA contrast secondary text | **DONE** |
| 14 | Inconsistent form controls | Raw inputs without shared tokens | `HostOnboardPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `index.css` | Unified form styles (`.cs-input`) for inputs, textareas, selects | **DONE** |
| 15 | Cookie banner visibility | Positioned at `bottom-4` overlapping mobile bottom bar | `CookieConsent.jsx` | Set `bottom-20 sm:bottom-6 z-50` with accessible tokens and >=12px text | **DONE** |
| 16 | Scroll jumpiness | Framer Motion / layout thrashing & 100vh viewport jumps | `LandingPage.jsx`, `main.jsx` | Lenis + GSAP ScrollTrigger ticker synchronization, `svh/dvh` | **DONE** |

---

## Verification & Quality Assurance Report

### 1. Client ESLint Verification
* Command: `npm --prefix client run lint`
* Output:
  ```
  > chargeshare-client@1.0.0 lint
  > eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0
  ```
* Result: **0 errors, 0 warnings (Exit code: 0)**

### 2. Client Production Build Verification
* Command: `npm --prefix client run build`
* Output:
  ```
  vite v6.4.5 building for production...
  ✓ 2777 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                                          1.75 kB │ gzip:   0.95 kB
  dist/assets/index-CFRy5wp1.css                          69.25 kB │ gzip:  14.29 kB
  dist/assets/index-BqNBWOoy.js                        1,999.03 kB │ gzip: 567.32 kB
  ✓ built in 54.16s
  ```
* Result: **Vite build passed with 0 errors (Exit code: 0)**

### 3. Server Test Suite Verification (Including Concurrency)
* Command: `npm --prefix server test`
* Output:
  ```
  ⚡ CHARGESHARE INDIA CONCURRENCY TEST RESULT
  ===============================================================
  Total simultaneous requests fired: 25
  ✅ HTTP 201 Created (Booking Succeeded)    : 1
  🛡️  HTTP 409 Conflict (Double-Booking Blocked): 24
  ❌ Unexpected Error Responses              : 0
  ===============================================================
  STATUS: PASS - Zero double-bookings allowed under heavy race conditions.

  Test Suites: 10 passed, 10 total
  Tests:       60 passed, 60 total
  Snapshots:   0 total
  Time:        60.617 s
  ```
* Result: **All 10 test suites and 60/60 tests passing (Exit code: 0)**

### 4. WCAG 2.1 AA Color Contrast Verification
Calculated using official WCAG 2.1 relative luminance and contrast formula:
$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

| Mode | Token Description | Foreground (FG) | Background (BG) | Contrast Ratio | WCAG AA Status |
|:----:|-------------------|:---------------:|:---------------:|:--------------:|:--------------:|
| Light | Primary Text on Background | `#07221A` | `#F7FAF7` | **15.94:1** | PASS (AA) |
| Light | Primary Text on White Surface | `#07221A` | `#FFFFFF` | **16.76:1** | PASS (AA) |
| Light | Secondary Text on Background | `#164E3E` | `#F7FAF7` | **9.11:1** | PASS (AA) |
| Light | Secondary Text on White Surface | `#164E3E` | `#FFFFFF` | **9.57:1** | PASS (AA) |
| Light | Brand Button Text on Brand BG | `#FFFFFF` | `#047857` | **5.48:1** | PASS (AA) |
| Light | Input Text on Input BG | `#052E16` | `#FFFFFF` | **14.91:1** | PASS (AA) |
| Light | Nav Text on Nav BG | `#07221A` | `#FFFFFF` | **16.76:1** | PASS (AA) |
| Dark | Primary Text on Dark BG | `#F1F5F9` | `#061A14` | **16.45:1** | PASS (AA) |
| Dark | Primary Text on Dark Surface | `#F1F5F9` | `#0A291F` | **14.20:1** | PASS (AA) |
| Dark | Secondary Text on Dark BG | `#94A3B8` | `#061A14` | **7.03:1** | PASS (AA) |
| Dark | Secondary Text on Dark Surface | `#94A3B8` | `#0A291F` | **6.07:1** | PASS (AA) |
| Dark | Brand Button Contrast Text | `#061A14` | `#10B981` | **7.10:1** | PASS (AA) |
| Dark | Input Text on Input BG | `#F1F5F9` | `#0A1C16` | **16.10:1** | PASS (AA) |
| Dark | Nav Text on Dark Nav BG | `#F0FDF4` | `#061A14` | **17.21:1** | PASS (AA) |

Every evaluated combination exceeds the 4.5:1 WCAG AA threshold for body text.
