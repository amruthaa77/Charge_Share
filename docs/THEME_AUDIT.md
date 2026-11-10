# ChargeShare India — Theme Audit Report (Step 0)

> Generated: 2026-10-30T18:00:00.001Z  
> Total Hard-Coded Color Occurrences in `/client/src`: **95**

---

## 1. How Theme is Applied & Variables Confirmed

### Theme Initialization & Persistence Flow
1. **Pre-Paint Inline Script (`client/index.html`):**
   Runs synchronously in `<head>` before DOM rendering to eliminate theme flicker / FOUC:
   - Reads `?theme=` query parameter (if provided).
   - Reads `localStorage.getItem('cs_theme')`.
   - Fallback to `window.matchMedia('(prefers-color-scheme: dark)').matches`.
   - Sets `document.documentElement.setAttribute('data-theme', theme)`.
   - Appends `class="dark"` or `class="light"` to `<html>`.

2. **React Context (`client/src/context/ThemeContext.jsx`):**
   - `ThemeProvider` provides `theme`, `toggleTheme()`, and `isDark: theme === 'dark'`.
   - Listens for state changes and synchronizes both `data-theme` attribute and `cs_theme` in `localStorage`.

3. **Tailwind Config Configuration (`client/tailwind.config.js`):**
   - Configured with `darkMode: ['selector', '[data-theme="dark"]']` so that Tailwind selectors trigger on `[data-theme="dark"]`.

### CSS Variables for Both Themes (`client/src/index.css`)

| CSS Variable | Light Theme (`[data-theme="light"]`) | Dark Theme (`[data-theme="dark"]`) | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--bg` | `#EAF6F4` | `#061A14` | App / Canvas background |
| `--bg-raised` | `#FFFFFF` | `#0A261D` | Raised container surfaces |
| `--surface` | `#FFFFFF` | `#0A261D` | Card & container surface |
| `--surface-elevated` | `#F4FAF8` | `#0F3328` | Popovers, modals, dropdowns |
| `--border` | `rgba(11, 61, 46, 0.12)` | `rgba(34, 197, 94, 0.16)` | Standard subtle borders |
| `--border-strong` | `rgba(11, 61, 46, 0.22)` | `rgba(34, 197, 94, 0.30)` | Prominent input & card borders |
| `--text` | `#0B1F1A` | `#F0FDF4` | Primary body text |
| `--text-primary` | `#0B1F1A` | `#F0FDF4` | Headings & primary labels |
| `--text-secondary` | `#2C4A42` | `#A7D8CB` | Subtitles & secondary labels |
| `--text-muted` | `#4B6B63` | `#78A89C` | Captions, hints, placeholders |
| `--brand` | `#097A54` | `#10B981` | Primary brand green |
| `--brand-hover` | `#06543A` | `#34D399` | Brand hover green |
| `--brand-contrast` | `#FFFFFF` | `#03140F` | Text on brand buttons |
| `--accent` | `#0E9F6E` | `#10B981` | Interactive chips & pills |
| `--accent-cyan` | `#0891B2` | `#38BDF8` | Tech corridor & map pins |
| `--accent-amber` | `#D97706` | `#FBBF24` | Star ratings & warnings |
| `--danger` | `#DC2626` | `#F87171` | Error states & SOS badges |
| `--success` | `#097A54` | `#10B981` | Success badges & verified ticks |
| `--input-bg` | `#FFFFFF` | `#072018` | Text inputs, selects, textareas |
| `--input-text` | `#0B1F1A` | `#F0FDF4` | Form input value color |
| `--input-border` | `rgba(11, 61, 46, 0.22)` | `rgba(34, 197, 94, 0.28)` | Form input borders |
| `--placeholder` | `#64827A` | `#648F83` | Input placeholder text |

---

## 2. Token Adoption Status Across Codebase

### Pages / Components Using Tokens Correctly:
- **`LandingPage.jsx`:** Fully token-driven (`bg-bg`, `bg-surface`, `text-text-primary`, `border-border`, `bg-brand`, `text-brand-contrast`).
- **`RealisticCharger3D.jsx`:** Adapts studio lights and materials dynamically.
- **`Navbar.jsx` (partially):** Uses tokenized header background and drawer, but has a few nested badge hardcodes.

### Pages / Components Violating Token Usage (The Root Cause):
Every other page was authored using Tailwind utility colors (`bg-white`, `bg-mintBg`, `text-forest-900`, `text-forest-600`, `bg-slate-100`, `bg-emerald-100`, `text-emerald-800`).
Because `bg-white` sets `background-color: #fff` regardless of `[data-theme="dark"]`, these components render glaring white boxes in dark mode!

---

## 3. Detailed Audit Counts by File

### A. Pages (`13` files, `47` violations)

| Page | `bg-white` | `bg-slate-` | `bg-[#` | `text-slate-` | `text-emerald-` | `divide-` | Other Patterns | Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| `client/src/pages/LandingPage.jsx` | 5 | 1 | 0 | 0 | 6 | 0 | border-slate-:1, to-:2, style={{color/bg:1 | **16** |
| `client/src/pages/AdminDashboardPage.jsx` | 0 | 0 | 0 | 0 | 0 | 4 | - | **4** |
| `client/src/pages/ChargerDetailPage.jsx` | 1 | 0 | 0 | 1 | 0 | 2 | - | **4** |
| `client/src/pages/ExplorePage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:4 | **4** |
| `client/src/pages/ResetPasswordPage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:4 | **4** |
| `client/src/pages/HostDashboardPage.jsx` | 0 | 0 | 0 | 0 | 0 | 2 | style={{color/bg:1 | **3** |
| `client/src/pages/TermsPage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | to-:3 | **3** |
| `client/src/pages/AboutPage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | to-:2 | **2** |
| `client/src/pages/ForgotPasswordPage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:2 | **2** |
| `client/src/pages/MyBookingsPage.jsx` | 1 | 0 | 0 | 1 | 0 | 0 | - | **2** |
| `client/src/pages/HelpPage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | to-:1 | **1** |
| `client/src/pages/HostOnboardPage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | to-:1 | **1** |
| `client/src/pages/RegisterPage.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | to-:1 | **1** |

### B. Components (`9` files, `31` violations)

| Component | `bg-white` | `bg-slate-` | `bg-[#` | `text-slate-` | `text-emerald-` | `border-slate-` | Other Patterns | Total |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| `client/src/components/common/CookieConsent.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:8 | **8** |
| `client/src/components/common/AccountSettingsModal.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:4 | **4** |
| `client/src/components/common/Button.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:4 | **4** |
| `client/src/components/common/ErrorBoundary.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:4 | **4** |
| `client/src/components/common/Input.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:3 | **3** |
| `client/src/components/common/SEO.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | to-:3 | **3** |
| `client/src/components/common/Modal.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | ring-:2 | **2** |
| `client/src/components/layout/Navbar.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | divide-:2 | **2** |
| `client/src/components/layout/Footer.jsx` | 0 | 0 | 0 | 0 | 0 | 0 | to-:1 | **1** |

### C. Contexts & Styles (`3` files, `17` violations)

| File | Total Violations | Breakout |
| :--- | :---: | :--- |
| `client/src/index.css` | **13** | css-hex-rgb: 13 |
| `client/src/App.jsx` | **2** | ring-: 2 |
| `client/src/context/ToastContext.jsx` | **2** | ring-: 2 |

---

## 4. Remediation Plan

1. **Step 1: CSS Tokens Definition:**
   Consolidate all semantic tokens in `client/src/index.css` and map in `tailwind.config.js`:
   - `bg-surface`, `bg-bg`, `bg-raised`, `bg-elevated`
   - `text-fg`, `text-fg-secondary`, `text-fg-muted`
   - `border-line`, `border-subtle`, `border-strong`
   - `bg-input`, `text-input`, `border-input`
   - `bg-chip`, `text-chip`, `bg-badge`, `text-badge`
   - `bg-brand`, `text-brand`, `text-on-brand`

2. **Step 2: Shared Component Harmonization:**
   Convert `Modal`, `Card`, `Button`, `Input`, `ToastContext`, `ErrorBoundary`, `AccountSettingsModal`, `Footer`, `Navbar` to rely purely on CSS variables.

3. **Step 3: Page Sweep (One by One):**
   Replace hardcoded `bg-white`, `bg-mintBg`, `bg-slate-*`, `text-slate-*`, `text-emerald-*`, `text-forest-*` across all pages in order, capturing before/after screenshots and verifying `git diff --stat`.

4. **Step 4: Color Linter & Regression Guardrail:**
   Create `scripts/check_colors.js` and add `npm run check:colors` to prevent any future hard-coded color regressions.
