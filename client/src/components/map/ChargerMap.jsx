import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  isWithinBengaluru,
  BENGALURU_BOUNDS,
  BENGALURU_CENTER,
} from '../../utils/normalizeCharger';

// Re-export constants for backward compatibility
export { isWithinBengaluru, BENGALURU_BOUNDS, BENGALURU_CENTER };

// Luxury Custom Pin Marker for Two-Wheeler Charging Bays
// Designed with a minimum 44x44px touch target hitbox for mobile accessibility
const createTeardropIcon = (isAvailable = true, powerKW = 3.3, isSelected = false, price = 14, isDark = false) => {
  const primaryBg = isAvailable
    ? 'linear-gradient(135deg, #0B3D2E 0%, #0E9F6E 100%)'
    : 'linear-gradient(135deg, #64748B 0%, #475569 100%)';
  const shadowGlow = isSelected
    ? '0 0 24px 6px rgba(14, 159, 110, 0.65)'
    : isAvailable
    ? '0 4px 16px rgba(11, 61, 46, 0.28)'
    : '0 4px 10px rgba(0, 0, 0, 0.2)';

  const ringBorder = isSelected
    ? 'border: 2.5px solid #34D399;'
    : isDark
    ? 'border: 2px solid rgba(255, 255, 255, 0.25);'
    : 'border: 2px solid rgba(255, 255, 255, 0.9);';

  return L.divIcon({
    className: 'custom-teardrop-marker',
    html: `
      <div style="
        position: relative;
        width: 48px;
        height: 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        cursor: pointer;
        transform: translateZ(0);
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      " class="hover:scale-110">
        <!-- Touch hitbox expander -->
        <div style="position: absolute; inset: -6px; border-radius: 50%; pointer-events: auto;"></div>

        <!-- Pin Head -->
        <div style="
          width: 42px;
          height: 42px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: ${primaryBg};
          box-shadow: ${shadowGlow};
          ${ringBorder}
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <!-- Inner icon / content (rotated back 45deg) -->
          <div style="
            transform: rotate(45deg);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1;
          ">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: -0.3px;">₹${price}</span>
            <span style="font-size: 8px; font-weight: 600; opacity: 0.85;">16A</span>
          </div>
        </div>

        <!-- Subtle Pulse Indicator if available -->
        ${
          isAvailable
            ? `<div style="
                position: absolute;
                bottom: 0px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #0E9F6E;
                box-shadow: 0 0 10px #0E9F6E;
              "></div>`
            : ''
        }
      </div>
    `,
    iconSize: [48, 56],
    iconAnchor: [24, 56],
    popupAnchor: [0, -52],
  });
};

// Smooth map fly-to controller with strict dimension and finiteness guards
const MapController = ({ selectedCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedCoords || !Array.isArray(selectedCoords) || selectedCoords.length < 2) {
      return;
    }

    const lng = typeof selectedCoords[0] === 'string' ? parseFloat(selectedCoords[0]) : Number(selectedCoords[0]);
    const lat = typeof selectedCoords[1] === 'string' ? parseFloat(selectedCoords[1]) : Number(selectedCoords[1]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    if (!isWithinBengaluru(lat, lng)) {
      return;
    }

    // Guard against unmounted or zero-size container (prevents NaN division in flyTo)
    const container = map.getContainer ? map.getContainer() : null;
    if (!container || !container.parentElement) {
      return;
    }

    const size = map.getSize ? map.getSize() : null;
    if (!size || size.x <= 0 || size.y <= 0) {
      return;
    }

    try {
      map.flyTo([lat, lng], 14, {
        animate: true,
        duration: 1.2,
      });
    } catch (flyError) {
      console.warn('[ChargerMap] map.flyTo fallback to setView:', flyError.message);
      try {
        map.setView([lat, lng], 14);
      } catch (_) {
        // Silently ignore if map container is in transit
      }
    }
  }, [selectedCoords, map]);

  return null;
};

// Responsive map resizer that triggers invalidateSize() safely using rAF
const MapResizer = ({ resizeTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let animId = null;
    const safeInvalidate = () => {
      if (animId) cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        try {
          const container = map.getContainer ? map.getContainer() : null;
          if (container && map.getSize) {
            const size = map.getSize();
            if (size.x > 0 && size.y > 0) {
              map.invalidateSize({ animate: false });
            }
          }
        } catch (_) {
          // Ignore transient resize errors
        }
      });
    };

    window.addEventListener('resize', safeInvalidate);
    safeInvalidate();
    const timer1 = setTimeout(safeInvalidate, 150);
    const timer2 = setTimeout(safeInvalidate, 400);

    return () => {
      window.removeEventListener('resize', safeInvalidate);
      if (animId) cancelAnimationFrame(animId);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map, resizeTrigger]);

  return null;
};

export const ChargerMap = ({
  chargers = [],
  selectedCharger = null,
  onSelectCharger,
  resizeTrigger = null,
}) => {
  const { isDark } = useTheme();

  // Clean OpenStreetMap tiles - dark mode styling applied automatically via Leaflet tile filter in index.css
  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  let center = BENGALURU_CENTER;
  if (selectedCharger?.location?.coordinates && Array.isArray(selectedCharger.location.coordinates)) {
    const sLng = typeof selectedCharger.location.coordinates[0] === 'string'
      ? parseFloat(selectedCharger.location.coordinates[0])
      : Number(selectedCharger.location.coordinates[0]);
    const sLat = typeof selectedCharger.location.coordinates[1] === 'string'
      ? parseFloat(selectedCharger.location.coordinates[1])
      : Number(selectedCharger.location.coordinates[1]);

    if (Number.isFinite(sLat) && Number.isFinite(sLng) && isWithinBengaluru(sLat, sLng)) {
      center = [sLat, sLng];
    }
  }

  // Strictly filter markers to Bengaluru bounding box with finite coordinates
  const bengaluruChargers = Array.isArray(chargers)
    ? chargers.filter((charger) => {
        if (!charger?.location?.coordinates || !Array.isArray(charger.location.coordinates)) return false;
        const [c0, c1] = charger.location.coordinates;
        const lng = typeof c0 === 'string' ? parseFloat(c0) : Number(c0);
        const lat = typeof c1 === 'string' ? parseFloat(c1) : Number(c1);
        return Number.isFinite(lat) && Number.isFinite(lng) && isWithinBengaluru(lat, lng);
      })
    : [];

  return (
    <div className="relative w-full h-full min-h-[340px] rounded-3xl overflow-hidden border border-border shadow-luxury-md bg-surface">
      <MapContainer
        center={center}
        zoom={12}
        minZoom={10}
        maxBounds={BENGALURU_BOUNDS}
        maxBoundsViscosity={0.8}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <ZoomControl position="topright" />
        <MapResizer resizeTrigger={resizeTrigger} />
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {selectedCharger?.location?.coordinates && (
          <MapController selectedCoords={selectedCharger.location.coordinates} />
        )}

        {bengaluruChargers.map((charger) => {
          const c0 = charger.location.coordinates[0];
          const c1 = charger.location.coordinates[1];
          const lng = typeof c0 === 'string' ? parseFloat(c0) : Number(c0);
          const lat = typeof c1 === 'string' ? parseFloat(c1) : Number(c1);
          const isSelected = selectedCharger?._id === charger._id;
          const isAvailable = charger.status === 'VERIFIED';
          const displayPrice = Number.isFinite(charger.price) ? charger.price : 25;
          const displayPower = Number.isFinite(charger.powerKW) ? charger.powerKW : 3.3;

          return (
            <Marker
              key={charger._id || `${lat}-${lng}`}
              position={[lat, lng]}
              icon={createTeardropIcon(isAvailable, displayPower, isSelected, displayPrice, isDark)}
              eventHandlers={{
                click: () => {
                  if (onSelectCharger && charger) onSelectCharger(charger);
                },
              }}
            >
              <Popup className="custom-popup">
                <div className="p-4 min-w-[250px] bg-surface text-text-primary rounded-2xl border border-border shadow-luxury-xl">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified 16A Bay</span>
                    <span className="ml-auto text-brand font-extrabold bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                      {displayPower} kW
                    </span>
                  </div>
                  <h4 className="font-editorial font-bold text-text-primary text-sm leading-snug mb-1">
                    {charger.title || 'Bengaluru Two-Wheeler Bay'}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-1 mb-3">
                    {charger.address || 'Bengaluru, Karnataka'}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border">
                    <div className="font-bold text-text-primary text-sm">
                      ₹{displayPrice}
                      <span className="text-[10px] text-text-muted font-normal">
                        /{charger.pricingType === 'PER_HOUR' ? 'hr' : 'kWh'}
                      </span>
                    </div>
                    <Link
                      to={`/chargers/${charger._id}`}
                      className="px-3.5 py-1.5 bg-brand hover:brightness-110 text-brand-contrast font-bold rounded-xl text-xs shadow-luxury-sm transition-all flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Book Bay</span>
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
