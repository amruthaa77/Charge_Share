# ChargeShare India — Asset Pipeline & 3D Integration Guide

This guide details the asset pipeline for ChargeShare India's signature 3D charger experience, two-wheeler contextual photography, and responsive media optimization.

---

## 1. 3D Charger Model & Rendering Strategy

### Primary Strategy: Real-time Procedural Three.js Canvas
The application includes a zero-dependency, ultra-lightweight WebGL procedural model (`RealisticCharger3D.jsx`):
- **Geometry:** Ergonomic rounded rectangular housing (`BoxGeometry` with beveled edges), metallic front bezel, separate front maintenance access panel, extruded rubberized charging cable (`CatmullRomCurve3` tube geometry), and cylindrical plug head with metallic brass contacts.
- **Materials:** Physical PBR shaders (`MeshPhysicalMaterial`) with clearcoat `0.3`, roughness `0.25`, and metallic accents.
- **Lighting:** Three-point studio lighting setup (soft warm key light, cool rim light, subtle ground bounce) producing soft natural shadows.
- **Status Ring:** Emissive circular ring (`MeshStandardMaterial` with pulsing emerald green emissive intensity).
- **Performance:** Single WebGL context, auto-disposed on unmount, DPR clamped to `Math.min(window.devicePixelRatio, 2)`, pauses rendering when off-screen via `IntersectionObserver`.

### Secondary Strategy: Pre-rendered WebP Frame Sequence (Drop-in Ready)
For production deployments seeking 100% photorealistic offline raytraced renders:
1. Render 120–160 sequential frames (1280x720px for desktop, 720x405px for mobile) from Blender / Cinema4D in WebP format.
2. Place the frames into `client/public/assets/charger-frames/frame-[001-160].webp`.
3. Set `USE_FRAME_SEQUENCE = true` in `client/src/components/3d/ChargerExperience.jsx`.
4. The canvas preloader caches the first 15 keyframes immediately, then streams remaining frames asynchronously while scrubbing scroll progress.

---

## 2. Contextual EV Two-Wheeler Imagery

**CRITICAL PRODUCT RULE:** All photography on ChargeShare India strictly features **electric two-wheelers** (electric scooters and electric motorcycles) and residential/society charging points. No cars, SUVs, or 4-wheeler imagery.

| Section | Image Purpose | Dimensions | Description / Reference |
| :--- | :--- | :--- | :--- |
| **Hero / Scene 1** | Sweeping Cable & Connector | SVG / 3D WebGL / Transparent PNG | Heavy-duty 16A 3-pin connector with ergonomic handle and coiled rubber cord. |
| **How It Works (01 FIND)** | Rider navigating Bengaluru | 800x600 WebP | Ather 450X / Ola S1 rider checking app in Indiranagar tree-lined lane. |
| **How It Works (02 BOOK)** | Society / Independent gate socket | 800x600 WebP | Wall-mounted 16A weather-covered outdoor socket with green LED indicator. |
| **How It Works (03 CHARGE)** | Connected EV Scooter | 800x600 WebP | TVS iQube plugged into residential porch socket while owner relaxes. |
| **Host Onboarding** | Safe MCB & Earthing Installation | 800x600 WebP | 32A MCB breaker box with residual current device (RCCB) on independent line. |

---

## 3. Fallback Modes (Accessibility & Low-End Hardware)

When any of the following conditions are met:
1. `prefers-reduced-motion: reduce` is detected in browser settings.
2. User toggles the persistent **"Motion / 3D Effects"** switch in the navbar or cookie settings.
3. WebGL context fails to initialize or GPU memory is restricted.
4. Device reports `Save-Data: on` or network speed is slow ($< 3$G).

The 3D canvas automatically swaps for high-resolution static SVG/WebP product compositions, and scroll-scrubbing collapses into clean, readable editorial sections without layout shift.
