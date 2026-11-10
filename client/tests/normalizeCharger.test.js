import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCharger,
  normalizeChargerList,
  isWithinBengaluru,
  BENGALURU_BOUNDS,
  BENGALURU_CENTER,
} from '../src/utils/normalizeCharger.js';

test('isWithinBengaluru verifies geographic bounds strictly for Bengaluru', () => {
  // Center of Bengaluru
  assert.equal(isWithinBengaluru(12.9716, 77.5946), true);
  // Boundary points
  assert.equal(isWithinBengaluru(12.80, 77.45), true);
  assert.equal(isWithinBengaluru(13.15, 77.75), true);

  // Outside bounds (Mumbai, Delhi, Chennai, etc.)
  assert.equal(isWithinBengaluru(19.0760, 72.8777), false); // Mumbai
  assert.equal(isWithinBengaluru(28.6139, 77.2090), false); // Delhi
  assert.equal(isWithinBengaluru(13.0827, 80.2707), false); // Chennai

  // Non-finite
  assert.equal(isWithinBengaluru(NaN, 77.5946), false);
  assert.equal(isWithinBengaluru(12.9716, NaN), false);
  assert.equal(isWithinBengaluru(null, undefined), false);
});

test('normalizeCharger preserves a valid charger object', () => {
  const input = {
    _id: 'test-123',
    title: 'Koramangala 16A Bay',
    location: {
      type: 'Point',
      coordinates: [77.6200, 12.9350], // [lng, lat]
    },
    price: 30,
    powerKW: 3.3,
    status: 'VERIFIED',
    connectorType: '16A_3PIN',
    address: 'Koramangala 4th Block, Bengaluru',
    hostId: { _id: 'host-1', name: 'Arun' },
  };

  const output = normalizeCharger(input);
  assert.ok(output);
  assert.equal(output._id, 'test-123');
  assert.equal(output.title, 'Koramangala 16A Bay');
  assert.deepEqual(output.location.coordinates, [77.6200, 12.9350]);
  assert.equal(output.price, 30);
  assert.equal(output.powerKW, 3.3);
  assert.equal(output.status, 'VERIFIED');
});

test('normalizeCharger parses coordinates supplied as strings', () => {
  const input = {
    title: 'Indiranagar Hub',
    location: {
      coordinates: ['77.6412', '12.9784'],
    },
    price: '28',
    powerKW: '7.4',
  };

  const output = normalizeCharger(input);
  assert.ok(output);
  assert.equal(typeof output.location.coordinates[0], 'number');
  assert.equal(typeof output.location.coordinates[1], 'number');
  assert.equal(output.location.coordinates[0], 77.6412);
  assert.equal(output.location.coordinates[1], 12.9784);
  assert.equal(output.price, 28);
  assert.equal(output.powerKW, 7.4);
});

test('normalizeCharger detects and swaps inverted coordinates [lat, lng] to GeoJSON [lng, lat]', () => {
  const input = {
    title: 'HSR Layout Socket',
    location: {
      // Mistakenly passed as [lat, lng]
      coordinates: [12.9121, 77.6446],
    },
  };

  const output = normalizeCharger(input);
  assert.ok(output);
  // Must be corrected to [lng, lat]
  assert.equal(output.location.coordinates[0], 77.6446);
  assert.equal(output.location.coordinates[1], 12.9121);
});

test('normalizeCharger discards charger with NaN, null, undefined or [0, 0] coordinates', () => {
  assert.equal(normalizeCharger({ location: { coordinates: [NaN, NaN] } }), null);
  assert.equal(normalizeCharger({ location: { coordinates: null } }), null);
  assert.equal(normalizeCharger({ location: { coordinates: [0, 0] } }), null);
  assert.equal(normalizeCharger({ location: {} }), null);
  assert.equal(normalizeCharger(null), null);
  assert.equal(normalizeCharger(undefined), null);
  assert.equal(normalizeCharger('invalid string'), null);
});

test('normalizeCharger discards charger outside Bengaluru bounding box', () => {
  const outsideMumbai = {
    title: 'Bandra Charger',
    location: { coordinates: [72.8258, 19.0596] },
  };
  assert.equal(normalizeCharger(outsideMumbai), null);
});

test('normalizeCharger supplies sensible defaults for missing host, price, power, title, and address', () => {
  const input = {
    location: { coordinates: [77.5946, 12.9716] },
  };

  const output = normalizeCharger(input);
  assert.ok(output);
  assert.equal(output.price, 25);
  assert.equal(output.powerKW, 3.3);
  assert.equal(output.status, 'VERIFIED');
  assert.equal(output.connectorType, '16A_3PIN');
  assert.equal(output.hostId.name, 'Verified Bengaluru Host');
  assert.equal(output.title, 'Bengaluru EV Two-Wheeler Socket');
  assert.equal(output.address, 'Bengaluru, Karnataka, India');
  assert.equal(output.city, 'Bengaluru');
  assert.ok(Array.isArray(output.connectors));
  assert.equal(output.connectors.length, 1);
});

test('normalizeChargerList filters out invalid chargers and returns only sanitized ones', () => {
  const list = [
    { title: 'Good 1', location: { coordinates: [77.6, 12.9] } },
    { title: 'Bad Coords NaN', location: { coordinates: [NaN, 12.9] } },
    { title: 'Mumbai Outside', location: { coordinates: [72.8, 19.0] } },
    null,
    undefined,
    { title: 'Good 2 Swapped', location: { coordinates: [13.0, 77.5] } },
  ];

  const sanitized = normalizeChargerList(list);
  assert.equal(sanitized.length, 2);
  assert.equal(sanitized[0].title, 'Good 1');
  assert.equal(sanitized[1].title, 'Good 2 Swapped');
  assert.deepEqual(sanitized[1].location.coordinates, [77.5, 13.0]);
});
