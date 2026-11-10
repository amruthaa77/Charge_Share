/**
 * normalizeCharger.js
 * Robust normalizer and validator for ChargeShare India charger data.
 * Guarantees valid coordinates, pricing, power, status, and connectors strictly for Bengaluru.
 */

export const BENGALURU_BOUNDS = [
  [12.80, 77.45], // Southwest corner
  [13.15, 77.75], // Northeast corner
];

export const BENGALURU_CENTER = [12.9716, 77.5946];

/**
 * Validates whether given latitude and longitude are within Bengaluru bounds.
 * @param {number} lat - Latitude (12.80 - 13.15)
 * @param {number} lng - Longitude (77.45 - 77.75)
 * @returns {boolean}
 */
export const isWithinBengaluru = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 12.80 && lat <= 13.15 && lng >= 77.45 && lng <= 77.75;
};

/**
 * Normalizes and sanitizes a single charger object.
 * Returns null if the charger cannot be safely salvaged.
 *
 * @param {any} raw - Raw charger object from API or props
 * @returns {object|null} Sanitized charger object or null if completely invalid
 */
export const normalizeCharger = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  // 1. Coordinates parsing and GeoJSON validation
  let rawCoords = null;
  if (Array.isArray(raw.location?.coordinates)) {
    rawCoords = raw.location.coordinates;
  } else if (Array.isArray(raw.coordinates)) {
    rawCoords = raw.coordinates;
  } else if (raw.location && typeof raw.location.lat === 'number' && typeof raw.location.lng === 'number') {
    rawCoords = [raw.location.lng, raw.location.lat];
  } else if (raw.lat !== undefined && raw.lng !== undefined) {
    rawCoords = [raw.lng, raw.lat];
  }

  let lng = NaN;
  let lat = NaN;

  if (Array.isArray(rawCoords) && rawCoords.length >= 2) {
    const c0 = typeof rawCoords[0] === 'string' ? parseFloat(rawCoords[0]) : rawCoords[0];
    const c1 = typeof rawCoords[1] === 'string' ? parseFloat(rawCoords[1]) : rawCoords[1];

    if (Number.isFinite(c0) && Number.isFinite(c1)) {
      // Check standard GeoJSON [lng, lat]
      if (isWithinBengaluru(c1, c0)) {
        lng = c0;
        lat = c1;
      }
      // Check swapped [lat, lng] (e.g. lat around 12.9, lng around 77.6)
      else if (isWithinBengaluru(c0, c1)) {
        lng = c1;
        lat = c0;
      }
    }
  }

  // If coordinates cannot be salvaged within Bengaluru bounding box, discard
  if (!isWithinBengaluru(lat, lng)) {
    return null;
  }

  // 2. Sanitize price
  let price = 25;
  if (raw.price !== undefined && raw.price !== null) {
    const parsedPrice = typeof raw.price === 'string' ? parseFloat(raw.price) : Number(raw.price);
    if (Number.isFinite(parsedPrice) && parsedPrice >= 0) {
      price = parsedPrice;
    }
  }

  // 3. Sanitize powerKW
  let powerKW = 3.3;
  if (raw.powerKW !== undefined && raw.powerKW !== null) {
    const parsedPower = typeof raw.powerKW === 'string' ? parseFloat(raw.powerKW) : Number(raw.powerKW);
    if (Number.isFinite(parsedPower) && parsedPower > 0) {
      powerKW = parsedPower;
    }
  }

  // 4. Sanitize connectorType and connectors list
  const connectorType = typeof raw.connectorType === 'string' && raw.connectorType.trim()
    ? raw.connectorType.trim()
    : '16A_3PIN';

  const connectors = Array.isArray(raw.connectors) && raw.connectors.length > 0
    ? raw.connectors.map((conn, idx) => ({
        type: typeof conn === 'string' ? conn : conn?.type || connectorType,
        powerKW: typeof conn?.powerKW === 'number' ? conn.powerKW : powerKW,
        status: conn?.status || 'AVAILABLE',
        connectorId: conn?.connectorId || `conn-${idx + 1}`,
      }))
    : [{ type: connectorType, powerKW, status: 'AVAILABLE', connectorId: 'conn-1' }];

  // 5. Host info
  const hostId = raw.hostId && typeof raw.hostId === 'object'
    ? {
        _id: String(raw.hostId._id || 'unknown-host'),
        name: String(raw.hostId.name || 'Verified Bengaluru Host'),
        email: raw.hostId.email ? String(raw.hostId.email) : undefined,
        phone: raw.hostId.phone ? String(raw.hostId.phone) : undefined,
      }
    : typeof raw.hostId === 'string'
    ? { _id: raw.hostId, name: 'Verified Bengaluru Host' }
    : { _id: 'unknown-host', name: 'Verified Bengaluru Host' };

  // 6. Title and address
  const title = typeof raw.title === 'string' && raw.title.trim()
    ? raw.title.trim()
    : 'Bengaluru EV Two-Wheeler Socket';

  const address = typeof raw.address === 'string' && raw.address.trim()
    ? raw.address.trim()
    : 'Bengaluru, Karnataka, India';

  const description = typeof raw.description === 'string' ? raw.description : '';
  const city = typeof raw.city === 'string' && raw.city.trim() ? raw.city.trim() : 'Bengaluru';
  const status = typeof raw.status === 'string' ? raw.status : 'VERIFIED';
  const pricingType = raw.pricingType === 'PER_KWH' ? 'PER_KWH' : 'PER_HOUR';
  const availableNow = raw.availableNow !== false;
  const isEmergencyReady = Boolean(raw.isEmergencyReady || raw.emergencyAvailable);

  return {
    ...raw,
    _id: String(raw._id || Math.random().toString(36).substring(2, 9)),
    title,
    description,
    address,
    city,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    price,
    pricingType,
    powerKW,
    connectorType,
    connectors,
    status,
    hostId,
    availableNow,
    isEmergencyReady,
  };
};

/**
 * Normalizes a list of chargers, discarding corrupt / non-Bengaluru entries.
 *
 * @param {Array} list - Array of raw chargers
 * @returns {Array} Array of sanitized chargers
 */
export const normalizeChargerList = (list) => {
  if (!Array.isArray(list)) return [];
  return list
    .map((c) => normalizeCharger(c))
    .filter((c) => c !== null);
};
