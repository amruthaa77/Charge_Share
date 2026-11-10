import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const BENGALURU_CENTER = [12.9716, 77.5946];
export const BENGALURU_BOUNDS = [
  [12.80, 77.45], // South-West
  [13.15, 77.75], // North-East
];

const pinIcon = L.divIcon({
  className: 'location-pin',
  html: `
    <div style="
      background: linear-gradient(135deg, #047857 0%, #22C55E 100%);
      color: #FFFFFF;
      width: 38px;
      height: 38px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(4, 120, 87, 0.6);
      border: 3px solid #FFFFFF;
    ">
      <svg style="transform: rotate(45deg); width: 16px; height: 16px; fill: #FFFFFF;" viewBox="0 0 24 24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

const clampToBengaluru = (lat, lng) => {
  const clampedLat = Math.min(13.15, Math.max(12.80, lat));
  const clampedLng = Math.min(77.75, Math.max(77.45, lng));
  return [Number(clampedLat.toFixed(5)), Number(clampedLng.toFixed(5))];
};

const MapEventsHandler = ({ onLocationChange }) => {
  useMapEvents({
    click(e) {
      const [cLat, cLng] = clampToBengaluru(e.latlng.lat, e.latlng.lng);
      onLocationChange(cLat, cLng);
    },
  });
  return null;
};

export const LocationPickerMap = ({ latitude, longitude, onLocationChange }) => {
  const { isDark } = useTheme();

  // Clamp current coords to Bengaluru bounding box
  const [validLat, validLng] = clampToBengaluru(latitude || 12.9716, longitude || 77.5946);
  const position = [validLat, validLng];

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const markerHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const [cLat, cLng] = clampToBengaluru(latLng.lat, latLng.lng);
          onLocationChange(cLat, cLng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-border shadow-nature-md">
      <MapContainer
        center={position}
        zoom={12}
        minZoom={10}
        maxBounds={BENGALURU_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
        />
        <MapEventsHandler onLocationChange={onLocationChange} />
        <Marker
          position={position}
          draggable={true}
          eventHandlers={markerHandlers}
          icon={pinIcon}
        />
      </MapContainer>
      <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-surface/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-border text-[11px] text-text-primary flex items-center justify-between shadow-nature-md">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand flex-shrink-0" />
          <span className="font-semibold text-text-secondary">
            Bengaluru Geofence: Drag marker inside city limits
          </span>
        </div>
        <div className="font-mono text-brand font-bold text-[11px]">
          {validLat.toFixed(4)}, {validLng.toFixed(4)}
        </div>
      </div>
    </div>
  );
};
