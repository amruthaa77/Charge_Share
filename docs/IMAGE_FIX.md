# Image Audit & Remediation Plan (ChargeShare India)

**Audit Date**: November 7, 2026  
**Scope**: Platform-wide bay/charger photography, remote hotlinked URLs, fallback assets, and visual presentation across Bengaluru two-wheeler charging grid.

---

## 1. Inspection of Source Images in `C:\projects\ev_charger\evimages`

The source directory `C:\projects\ev_charger\evimages` exists on the host machine and contains **11 image files** (10 distinct images, with files 2 and 9 being duplicate framing of the same scene).

All 11 files were viewed and inspected for subject matter, dimensions, and flags (cars, human faces, readable number plates, brand logos):

| # | Filename | Format | Dimensions | File Size | Aspect Ratio | Visual Content & Flags | Status |
|---|---|---|---|---|---|---|---|
| 1 | `Ather 340 & Ather 450 electric scooters launched___.jpg` | JPEG | 735 × 491 px | 28,132 B | 1.50 (3:2) | White Ather electric scooter plugged into wall-mounted charging dock against pure white backdrop. Clean studio lighting.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo**: Ather dot emblem on charger dock | **APPROVED** (Core EV Bay) |
| 2 | `Ather 450X Gen 3 With Extended Range, Improved Features Launched_ Price.jpg` | JPEG | 736 × 413 px | 53,166 B | 1.78 (16:9) | Matte-grey Ather 450X electric scooter parked on sidewalk charging from black wall-mount socket with green ivy accent.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo**: Minimal dot logo on wall dock | **APPROVED** (Core EV Bay) |
| 3 | `ather charging.jpg` | JPEG | 736 × 1308 px | 166,011 B | 0.56 (9:16) | White electric scooter at an authentic outdoor public charging kiosk (Ather Grid) on a Bengaluru paved sidewalk.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: **FLAGGED** - Green commercial EV number plate on rear fender (`KA 05 ...`).<br>• **Logo**: **FLAGGED** - "ATHER GRID" text on pillar.<br>*Owner rule applied: Usable since not a car.* | **APPROVED** (Authentic Bengaluru Bay) |
| 4 | `Barcelona impulsa estaciones mixtas para cargar coches y motos eléctricas.jpg` | JPEG | 735 × 441 px | 76,948 B | 1.67 (5:3) | Two-tone black/white electric scooter plugged into green/white public EV charging bollard on a harbor promenade with palm trees.<br>• **Car**: **NONE** (Despite the Spanish file title mentioning "coches", the photograph itself contains **zero cars**).<br>• **Face**: No<br>• **Plate**: Blurred European moped square plate.<br>• **Logo**: None prominent | **APPROVED** (Outdoor Charging Bay) |
| 5 | `CHALO SMART ECO.jpg` | JPEG | 736 × 736 px | 50,326 B | 1.00 (1:1) | Modern white and lime-green electric scooter parked in architectural concrete tunnel.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo/Text**: **FLAGGED** - "GOEEN E BIKE" banner at top; phone number and website at bottom. When center-cropped to 16:9, the top and bottom marketing text are completely cropped out. | **APPROVED** (Clean 16:9 crop) |
| 6 | `Check out Ola electric scooter in detailed images_ Does Ather 450X have an anticipated contender__.jpg` | JPEG | 736 × 736 px | 23,364 B | 1.00 (1:1) | All-black Ola S1 Pro electric scooter in dark studio with illuminated dual-ring LED headlights.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo**: Embossed "OLA" emblem on front fairing. | **APPROVED** (Dark Theme Hero Bay) |
| 7 | `Ev scooty.jpg` | JPEG | 735 × 985 px | 67,907 B | 0.75 (3:4) | Metallic navy-blue utility electric scooter with tubular front crash guard and cargo rack on double stand.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo**: Stylized phoenix decal on rear flank. | **APPROVED** (Utility EV Bay) |
| 8 | `Honda Activa EV_ A New Era of Electric Mobility in India.jpg` | JPEG | 736 × 1604 px | 89,190 B | 0.46 (9:20) | Pearl white concept electric scooter on showroom display with neon blue ambient background lighting.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo**: Illuminated "Honda" wordmark in headlamp cluster. | **APPROVED** (Modern Concept Bay) |
| 9 | `The impact of government subsidies on  EV's.jpg` | JPEG | 735 × 441 px | 59,213 B | 1.67 (5:3) | Identical scene to #2, but slightly wider vertical frame showing floor and wall tiles.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo**: Minimal dot logo on charger. | **APPROVED** (Alternative crop of #2) |
| 10 | `The Industrial Design Evolution of Modern EV Scooters.jpg` | JPEG | 736 × 736 px | 30,373 B | 1.00 (1:1) | Minimalist matte-black futuristic electric scooter in seamless monochrome studio.<br>• **Car**: No<br>• **Face**: No<br>• **Plate**: No<br>• **Logo**: None. | **APPROVED** (Minimalist EV Bay) |
| 11 | `Why Event Venues Should Offer EV Charging Stations in 2026.jpg` | JPEG | 735 × 913 px | 82,470 B | 0.81 (4:5) | Silver electric scooter plugged into green 16A charging socket on outdoor concrete bollard.<br>• **Car**: **FLAGGED** - On the far left background, the front grille/headlight of a parked passenger car/SUV is partially visible.<br>• **Face**: No, but a human hand/arm is visible reaching toward the scooter seat on the right edge.<br>• **Plate**: Minimal front bracket.<br>• **Logo**: Green socket housing.<br>*Recommendation: Because file #11 partially shows a car in the background, we exclude file #11 from the primary rotation, leaving 9 pristine, 100% car-free scooter images from files 1-10.* | **EXCLUDED (Partial Car in BG)** |

---

## 2. Bay Image Pipeline Audit (Data & Architecture)

| Component / Layer | Source / File | Current State | Issues Identified | Target Action |
|---|---|---|---|---|
| **Database Model** | `server/src/models/Charger.js` | `photos: { type: [String], default: [] }` | Stores raw string URLs. No schema change allowed. | Retain `photos: [String]` schema untouched. Ensure elements point to `/images/bays/bay-X.webp`. |
| **Database Seed** | `server/src/scripts/seed.js` | `sampleImages = ['https://images.unsplash.com/...']` (lines 210-216, 617-620) | Hardcoded Unsplash remote URLs representing four-wheel passenger cars and Teslas. Assigns pairs of images resulting in unwanted 2-item galleries. | Replace `sampleImages` with local WebP paths `['/images/bays/bay-1.webp', ...]` assigned round-robin based on charger index. Remove multi-item array; assign single canonical bay image. |
| **Host Upload Route** | `server/src/routes/upload.routes.js` | Multer disk storage writes to `server/uploads/`, returns `/uploads/:filename` | Accepts 10MB JPG/PNG/WEBP/PDF. Working cleanly. | Preserve host upload capability. Ensure validation and URL normalization remains functional. |
| **Host Onboard Form** | `client/src/pages/HostOnboardPage.jsx` | Hardcoded `photos: ['https://images.unsplash.com/...']` (lines 171-174) | Submits remote car photo URLs for newly hosted chargers. | Replace hardcoded Unsplash URLs with default local canonical image `/images/bays/bay-1.webp`. |
| **Server API Controller** | `server/src/controllers/charger.controller.js` | Returns `charger.photos` as stored in MongoDB. | If `photos` is empty, client receives empty array resulting in broken dark box. | In `getChargers` and `getCharger`, guarantee `image` and `thumbnail` properties: if `photos[0]` is missing, compute stable hash of `_id` to pick from `BAY_IMAGES`. |
| **Charger Detail Page** | `client/src/pages/ChargerDetailPage.jsx` | Lines 232-240 has fallback array of Unsplash car images. Lines 494-531 renders `photos[activePhotoIdx]` and multi-thumbnail carousel. | 1. Car photos shown when remote images load.<br>2. Two tiny thumbnails rendered even for single photo.<br>3. Broken dark box if image fails to load. | Replace gallery with single `<BayImage>` hero. Remove thumbnails, controls, and Unsplash fallbacks. |
| **Explore List Cards** | `client/src/pages/ExplorePage.jsx` | Lines 360-435 renders title, price, specs, tags, and Book button, but **NO image**. | Cards lack visual identity; user screen recording noted empty list card headers. | Add compact thumbnail (`BayImage`) on the left of each card (96×72 desktop, 72×56 mobile) with zero layout shift. |
| **Map Popup** | `client/src/components/map/ChargerMap.jsx` | Renders badge, title, address, price, and "Book Bay" button. | Currently text-only. User instruction: "do not add images to places that had none." | Keep clean text-only popup. Do not add unwanted images. |
| **Host Dashboard** | `client/src/pages/HostDashboardPage.jsx` | Renders title, address, badges, settings button. | Currently text-only. | Keep as-is per instruction. |
| **Admin KYC & Listings** | `client/src/pages/admin/AdminListingsPage.jsx`, `AdminKYCPage.jsx` | Renders tables and documents. | KYC documents (Aadhaar, electricity bill) must remain untouched. | Keep KYC document viewer intact. |

---

## 3. Site-Wide Image Audit (Non-Bay Images)

| Location | Component / File | Current Source | Status / Problem | Action |
|---|---|---|---|---|
| OpenGraph Image | `client/public/og-image.png`, `SEO.jsx` | Local PNG (1200×630) | High quality branded vector banner ("Bengaluru Peer-to-Peer 16A Electric Scooter Charging Grid - Zero Cars"). | Retain. Update `SEO.jsx` description text to remove "car". |
| Favicon | `client/index.html` | Inline SVG data URI | Clean green lightning bolt. | Retain. |
| Vehicle Icons | `client/public/images/vehicles/*.svg` | Local SVGs | Neutral electric scooter and motorcycle outlines. | Retain. |
| Car SVG File | `client/public/images/cars/car-secondary.svg` | Local SVG | Depicts electric car profile ("Slow Trickle Charge"). Unreferenced. | **DELETE FILE** to eliminate all car assets. |
| Obsolete Pexels Assets | `client/public/images/bays/*.webp` | 40+ unreferenced Pexels files | Downloaded stock photos of office towers, balconies, and random pavements. | **DELETE ALL** and replace with clean `bay-1.webp` through `bay-9.webp`. |
| Unsplash Avatars in Seed | `server/src/scripts/seed.js` (lines 61-147) | `images.unsplash.com/photo-...` | Profile avatars for seed users (Aditya, Rajesh, Priya, etc.). | Not bay/car images. Leave or serve locally if needed. |
| Unsplash KYC Proofs | `server/src/scripts/seed.js` (lines 683-686) | `images.unsplash.com/photo-...` | Mock ID proofs for KYC verification. | Leave intact (verified documents, not bay photos). |

---

## 4. Before-State Screenshots

Pre-existing screenshots demonstrating the exact reported issues are preserved in `/docs/screenshots/images-before/`:

1. `bay_malleshwaram_tesla.png`: Bay detail page showing a white Tesla Roadster for Malleshwaram 15th Cross Home Socket.
2. `bay_electronic_city_car.png`: Bay detail page showing a dark sports sedan for Electronic City Phase 1.
3. `bay_btm_layout_broken.png`: Bay detail page for BTM Layout 2nd Stage Udupi Garden showing a broken box.
4. `bay_kalyan_nagar_broken.png`: Bay detail page for Kalyan Nagar HRBR Layout showing a broken box.
5. `explore_1280_dark.png` & `explore_1280_light.png`: Explore page list cards lacking bay thumbnails.
6. `explore_360_dark.png` & `explore_360_light.png`: Mobile explore page list cards.

---

## 5. Implementation Roadmap

1. **Step 1: Import & Optimize Images**:
   - Write `client/scripts/import_bay_images.js` (`npm run import:bay-images`).
   - Center-crop files 1–10 to 16:9 WebP at 1200px (hero) and 480px (thumb) under 150 KB.
   - Generate `client/public/images/bay-fallback.svg` (< 10 KB branded scooter outline).
   - Export shared module `client/src/constants/bayImages.js` and `server/src/constants/bayImages.js`.
   - Create `client/public/images/CREDITS.md` and `/credits` route.
2. **Step 2: Clean Up Old Assets & Database Migration**:
   - Delete obsolete files in `client/public/images/bays/` and `client/public/images/cars/`.
   - Update `server/src/scripts/seed.js` to assign `bay-1.webp` through `bay-9.webp` round-robin.
   - Create idempotent `server/src/scripts/migrate-bay-images.js` (`npm run migrate:bay-images`) and execute against MongoDB.
   - Update server API controllers to guarantee `image` and `thumbnail` fallbacks via stable hash.
3. **Step 3: Client Components & Verification**:
   - Build `BayImage.jsx` with progressive fallback, srcset, lazy loading, and error suppression.
   - Update `ChargerDetailPage.jsx` to render single hero image (no carousel/thumbnails).
   - Update `ExplorePage.jsx` to include compact 16:9 thumbnail on card left edge.
   - Verify all tests pass (`npm run test:concurrency`, client tests, lint).
   - Capture after-screenshots into `/docs/screenshots/images-after/`.
