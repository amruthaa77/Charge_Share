import test from 'node:test';
import assert from 'node:assert/strict';
import { getErrorMessage, applyServerErrors } from '../src/utils/errorMapper.js';

test('getErrorMessage handles Network and Offline errors', () => {
  const netErr = new Error('Network Error');
  const result = getErrorMessage(netErr);
  assert.equal(result.title, 'Connection Failed');
  assert.equal(result.message, "Can't reach ChargeShare. Check your internet connection.");
  assert.equal(result.retryable, true);
  assert.equal(result.code, 'NETWORK_ERROR');
});

test('getErrorMessage handles Timeout errors', () => {
  const timeoutErr = { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' };
  const result = getErrorMessage(timeoutErr);
  assert.equal(result.title, 'Request Timed Out');
  assert.equal(result.retryable, true);
  assert.equal(result.code, 'TIMEOUT');
});

test('getErrorMessage handles 400 VALIDATION_ERROR with field array', () => {
  const valErr = {
    response: {
      status: 400,
      data: {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'phone', message: 'Phone must be 10 digits' },
        ],
        requestId: 'req-val-123',
      },
    },
  };
  const result = getErrorMessage(valErr);
  assert.equal(result.title, 'Validation Error');
  assert.equal(result.requestId, 'req-val-123');
  assert.equal(result.fieldErrors.length, 2);
  assert.equal(result.fieldErrors[0].field, 'email');
  assert.equal(result.fieldErrors[0].message, 'Invalid email format');
});

test('getErrorMessage handles 401 UNAUTHENTICATED with action link', () => {
  const authErr = {
    response: {
      status: 401,
      data: {
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication token is required',
        requestId: 'req-auth-401',
      },
    },
  };
  const result = getErrorMessage(authErr);
  assert.equal(result.title, 'Session Expired');
  assert.equal(result.message, 'Your session expired. Please sign in again.');
  assert.deepEqual(result.action, { label: 'Sign In', href: '/login' });
  assert.equal(result.requestId, 'req-auth-401');
});

test('getErrorMessage handles 403 FORBIDDEN', () => {
  const rbacErr = {
    response: {
      status: 403,
      data: {
        success: false,
        code: 'FORBIDDEN',
        message: 'Access restricted to administrators',
        requestId: 'req-admin-403',
      },
    },
  };
  const result = getErrorMessage(rbacErr);
  assert.equal(result.title, 'Access Denied');
  assert.equal(result.message, "You don't have permission to perform this action.");
});

test('getErrorMessage handles 409 EMAIL_TAKEN with Sign In action', () => {
  const conflictErr = {
    response: {
      status: 409,
      data: {
        success: false,
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
        errors: [{ field: 'email', message: 'An account with this email already exists' }],
        requestId: 'req-dup-email',
      },
    },
  };
  const result = getErrorMessage(conflictErr);
  assert.equal(result.title, 'Email Already Registered');
  assert.equal(result.message, 'An account with this email already exists.');
  assert.deepEqual(result.action, { label: 'Sign in', href: '/login' });
  assert.equal(result.fieldErrors.length, 1);
  assert.equal(result.fieldErrors[0].field, 'email');
});

test('getErrorMessage handles 409 SLOT_TAKEN with retryable flag', () => {
  const slotErr = {
    response: {
      status: 409,
      data: {
        success: false,
        code: 'SLOT_TAKEN',
        message: 'Slot has already been booked by another user',
        requestId: 'req-slot-409',
      },
    },
  };
  const result = getErrorMessage(slotErr);
  assert.equal(result.title, 'Slot Unavailable');
  assert.equal(result.message, 'Someone just booked this slot. Pick another time.');
  assert.equal(result.retryable, true);
});

test('getErrorMessage handles 409 VEHICLE_EXISTS', () => {
  const vehErr = {
    response: {
      status: 409,
      data: {
        success: false,
        code: 'VEHICLE_EXISTS',
        message: 'A vehicle with this registration number already exists',
        errors: [{ field: 'registrationNumber', message: 'A vehicle with this registration number already exists' }],
        requestId: 'req-veh-409',
      },
    },
  };
  const result = getErrorMessage(vehErr);
  assert.equal(result.title, 'Vehicle Already Added');
  assert.equal(result.message, 'A vehicle with this registration number already exists in your garage.');
  assert.equal(result.fieldErrors[0].field, 'registrationNumber');
});

test('getErrorMessage handles 500 INTERNAL_SERVER_ERROR with requestId', () => {
  const serverErr = {
    response: {
      status: 500,
      data: {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong on our side. Please try again',
        requestId: 'cs-req-abc-999',
      },
    },
  };
  const result = getErrorMessage(serverErr);
  assert.equal(result.title, 'Server Error');
  assert.equal(result.message, 'Something went wrong on our side. Please try again.');
  assert.equal(result.requestId, 'cs-req-abc-999');
  assert.equal(result.retryable, true);
});

test('applyServerErrors maps errors to state and banner handlers', () => {
  const apiError = {
    response: {
      status: 400,
      data: {
        code: 'VALIDATION_ERROR',
        errors: [
          { field: 'phone', message: 'Phone number format invalid' },
        ],
        requestId: 'req-test-apply',
      },
    },
  };

  let fieldErrorsState = {};
  let bannerState = null;

  const setFieldErrors = (updater) => {
    fieldErrorsState = typeof updater === 'function' ? updater(fieldErrorsState) : updater;
  };
  const setErrorBanner = (payload) => {
    bannerState = payload;
  };

  applyServerErrors(apiError, setFieldErrors, setErrorBanner);

  assert.equal(fieldErrorsState.phone, 'Phone number format invalid');
  assert.ok(bannerState);
  assert.equal(bannerState.requestId, 'req-test-apply');
});
