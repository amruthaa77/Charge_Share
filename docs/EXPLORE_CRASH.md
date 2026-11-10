# ChargeShare India — Explore Page Crash Diagnostic (/explore)

## 1. Reproduction Log (Logged-Out Fresh Incognito Session)
- **URL**: `http://localhost:5173/explore`
- **Session State**: Fresh incognito window, unauthenticated (`isAuthenticated: false`), default theme (light), viewport: 1280x800.

### Timeline
| Elapsed Time | UI State / Event Description | Error Boundary Active? |
|--------------|------------------------------|------------------------|
| **0.0s** (`~0ms`) | Initial render of `/explore`: Navbar renders, heading `"Bengaluru Two-Wheeler Bays - 0 Active Sockets"` renders, CardSkeleton placeholders mount in the bay list column. Leaflet map initializes center on Bengaluru `[12.9716, 77.5946]`. | `false` |
| **0.3s** (`335ms`) | Network call `GET /api/v1/chargers?city=Bengaluru&verifiedOnly=true` completes with HTTP 200 (20 verified chargers returned in Bengaluru bounding box). | `false` |
| **0.5s** (`500ms`) | `setChargers(list)` updates state; `setSelectedCharger(list[0])` selects the first verified charger (`_id: "6ae6226d4fbd75f7816afeed"`, coords `[77.6083, 12.9166]`). | `false` |
| **1.0s - 2.2s** (`~1400-2200ms`) | `<MapController>` effect triggers `map.flyTo([lat, lng], 14, { animate: true, duration: 1.2 })`. In the mobile map instance (hidden on desktop via `lg:hidden` with `display: none` / `0x0` dimensions), Leaflet's `flyTo` animation frame callback divides by `size.x` (0) and `size.y` (0), producing `NaN`. Leaflet attempts `new LatLng(NaN, NaN)` during animation frame. | `false` |
| **2.2s - 2.3s** (`~2174ms`) | Leaflet throws `Error: Invalid LatLng object: (NaN, NaN)`. Component `<MapController>` crashes. React bubbles the unhandled exception up the fiber tree to root `<ErrorBoundary>`. | `true` |
| **3.0s - 4.0s** (`3000ms+`) | Whole viewport displays fallback screen: `"Charging View Interrupted - We encountered a hiccup displaying the charging network map. Your saved sessions and garage are safe."` with buttons `"Reload Page"` and `"Back to Home"`. | `true` |

---

## 2. Permanent Error Boundary Logging Output

Permanently added to `client/src/components/common/ErrorBoundary.jsx`:
```javascript
componentDidCatch(error, errorInfo) {
  console.error('ChargeShare India ErrorBoundary caught an exception:');
  console.error('Error message:', error?.message);
  console.error('Error stack:', error?.stack);
  console.error('Component stack:', errorInfo?.componentStack);
}
```

### Exact Error Message Captured
```
Invalid LatLng object: (NaN, NaN)
```

### Exact Error Stack Captured
```
Error: Invalid LatLng object: (NaN, NaN)
    at new LatLng (http://localhost:5173/node_modules/.vite/deps/chunk-A2646ZNO.js?v=dd21fef8:941:17)
    at Object.unproject (http://localhost:5173/node_modules/.vite/deps/chunk-A2646ZNO.js?v=dd21fef8:1125:18)
    at Object.pointToLatLng (http://localhost:5173/node_modules/.vite/deps/chunk-A2646ZNO.js?v=dd21fef8:1027:34)
    at NewClass.unproject (http://localhost:5173/node_modules/.vite/deps/chunk-A2646ZNO.js?v=dd21fef8:2652:35)
    at NewClass.frame (http://localhost:5173/node_modules/.vite/deps/chunk-A2646ZNO.js?v=dd21fef8:2220:22)
    at NewClass.flyTo (http://localhost:5173/node_modules/.vite/deps/chunk-A2646ZNO.js?v=dd21fef8:2229:17)
    at http://localhost:5173/src/components/map/ChargerMap.jsx:117:13
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-UVXKGGW7.js?v=dd21fef8:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-UVXKGGW7.js?v=dd21fef8:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-UVXKGGW7.js?v=dd21fef8:18179:17)
```

### Exact Component Stack Captured
```
The above error occurred in the <MapController> component:

    at MapController (http://localhost:5173/src/components/map/ChargerMap.jsx:109:26)
    at div
    at MapContainerComponent (http://localhost:5173/node_modules/.vite/deps/react-leaflet.js?v=dd21fef8:545:34)
    at div
    at ChargerMap (http://localhost:5173/src/components/map/ChargerMap.jsx:154:3)
    at div
    at div
    at div
    at ExplorePage (http://localhost:5173/src/pages/ExplorePage.jsx:42:43)
    at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=dd21fef8:4112:5)
    at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=dd21fef8:4582:5)
    at ErrorBoundary (http://localhost:5173/src/components/common/ErrorBoundary.jsx:8:5)
    at main
    at div
    at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=dd21fef8:4525:15)
    at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=dd21fef8:5263:5)
    at ToastProvider (http://localhost:5173/src/context/ToastContext.jsx:22:33)
    at AuthProvider (http://localhost:5173/src/context/AuthContext.jsx:22:32)
    at ThemeProvider (http://localhost:5173/src/context/ThemeContext.jsx:20:33)
    at _a (http://localhost:5173/node_modules/.vite/deps/react-helmet-async.js?v=dd21fef8:627:5)
    at App
```

---

## 3. Network Requests Made by `/explore`
Captured from Chrome Network interceptor:

1. `GET http://localhost:5173/explore` -> 200 OK (HTML document, 20ms)
2. `GET /@vite/client` -> 200 OK (Vite HMR client, 31ms)
3. `GET /fonts/fraunces-latin-400.woff2` -> 200 OK (Font, 59ms)
4. `GET /fonts/inter-latin-variable.woff2` -> 200 OK (Font, 71ms)
5. `GET https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` -> 200 OK (CSS, 348ms)
6. `GET https://checkout.razorpay.com/v1/checkout.js` -> 200 OK (Razorpay SDK, 423ms)
7. `GET http://localhost:5173/api/v1/chargers?city=Bengaluru&verifiedOnly=true` -> 200 OK (JSON, 335ms)
   - Response Shape:
     ```json
     {
       "success": true,
       "count": 20,
       "total": 26,
       "page": 1,
       "chargers": [
         {
           "location": { "type": "Point", "coordinates": [77.6083, 12.9166] },
           "_id": "6ae6226d4fbd75f7816afeed",
           "hostId": { "_id": "6ae6226b4fbd75f7816afded", "name": "Ramesh Kumar" },
           "title": "Koramangala 4th Block - Rapid 16A Socket",
           "description": "Dedicated EV two-wheeler socket...",
           "address": "80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034",
           "city": "Bengaluru",
           "powerKW": 3.3,
           "connectorType": "16A_3PIN",
           "pricingType": "PER_HOUR",
           "price": 25,
           "status": "VERIFIED",
           "availableNow": true
         }
       ]
     }
     ```
8. Leaflet CartoDB Map Tiles:
   - `GET https://a.basemaps.cartocdn.com/light_all/12/2930/1908.png` -> 200 OK (~120ms)
   - `GET https://b.basemaps.cartocdn.com/light_all/12/2931/1908.png` -> 200 OK (~130ms)

**Key Comparison**: The response from `GET /api/v1/chargers` matches the API schema. The crash occurs 1.8 seconds AFTER the API response arrives because the API response updates `selectedCharger`, which kicks off `map.flyTo` on the 0-dimension map container.

---

## 4. Post-Mount Asynchronous Operations in Explore & Children

Audited all code executing after mount:
1. `ExplorePage.jsx` (`useEffect` on line 130):
   - Calls `fetchChargers()`, which triggers `chargerAPI.search(params)`.
   - On resolution, filters by Bengaluru geofence, sets `chargers`, and executes `setSelectedCharger(list[0])`.
2. `ChargerMap.jsx` (`MapController` `useEffect` on line 114):
   - Watches `selectedCoords` and `map`.
   - Calls `map.flyTo([lat, lng], 14, { animate: true, duration: 1.2 })`.
   - **Root Vulnerability**: Does not check `map.getSize()`. If container is `display: none` (`0x0`), Leaflet computes animation steps divided by 0 -> `NaN` -> throws `Invalid LatLng object: (NaN, NaN)`.
   - **Secondary Vulnerability**: Does not validate that `lat` and `lng` are finite numbers (`Number.isFinite`).
   - **Tertiary Vulnerability**: Does not wrap `flyTo` in `try / catch` with safe fallback to `setView`.
3. `ChargerMap.jsx` (`MapResizer` `useEffect` on line 134):
   - Window `resize` event listener.
   - `setTimeout` at 150ms and 400ms calling `map.invalidateSize()`.
4. `ExplorePage.jsx` (Dual Map Mounting lines 419 and 431):
   - **Architectural Bug**: `ExplorePage.jsx` renders **TWO** `<ChargerMap>` instances simultaneously in the DOM:
     - One in `<div className="hidden lg:grid ...">` (Desktop)
     - One in `<div className="lg:hidden ...">` (Mobile)
   - In any viewport, one of the two wrappers has `display: none`. The Leaflet instance inside the hidden container has dimensions `0x0`. When `setSelectedCharger` runs, the hidden instance animates `flyTo` with 0 width/height, producing `NaN` and crashing the application.
5. `MobileNav.jsx` (Duplicate key warning):
   - Line 25 keys navigation items by `item.to`. When unauthenticated, both "Passes" and "Account" point to `/login`, triggering React duplicate key warnings.
