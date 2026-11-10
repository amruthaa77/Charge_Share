/**
 * Standardized Client Error Mapper for ChargeShare India.
 * Transforms API errors, network failures, and timeout errors into human-friendly, actionable UI payloads.
 */

export const ERROR_MAPPINGS = {
  // Network & Connectivity
  NETWORK_ERROR: {
    title: 'Connection Failed',
    message: "Can't reach ChargeShare. Check your internet connection.",
    retryable: true,
  },
  TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The server took too long to respond. Please try again.',
    retryable: true,
  },

  // Auth & Credentials
  EMAIL_TAKEN: {
    title: 'Email Already Registered',
    message: 'An account with this email already exists.',
    action: { label: 'Sign in', href: '/login' },
  },
  PHONE_REGISTERED: {
    title: 'Phone Already Registered',
    message: 'This phone number is already registered to another account.',
  },
  INVALID_CREDENTIALS: {
    title: 'Sign In Failed',
    message: 'Invalid email or password. Please verify and try again.',
  },
  ACCOUNT_LOCKED: {
    title: 'Account Temporarily Locked',
    message: 'Account locked due to consecutive failed attempts. Please retry in 15 minutes.',
  },
  INCORRECT_PASSWORD: {
    title: 'Incorrect Password',
    message: 'The current password you entered is incorrect.',
  },
  INVALID_RESET_TOKEN: {
    title: 'Link Expired',
    message: 'This password reset link is invalid or has expired. Please request a new one.',
    action: { label: 'Request Reset', href: '/forgot-password' },
  },
  INVALID_VERIFY_TOKEN: {
    title: 'Link Expired',
    message: 'This email verification link is invalid or has expired.',
  },
  UNAUTHENTICATED: {
    title: 'Session Expired',
    message: 'Your session expired. Please sign in again.',
    action: { label: 'Sign In', href: '/login' },
  },
  SESSION_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session expired. Please sign in again.',
    action: { label: 'Sign In', href: '/login' },
  },
  INVALID_TOKEN: {
    title: 'Session Expired',
    message: 'Your session expired. Please sign in again.',
    action: { label: 'Sign In', href: '/login' },
  },
  FORBIDDEN: {
    title: 'Access Denied',
    message: "You don't have permission to perform this action.",
  },

  // Booking & Slots
  SLOT_TAKEN: {
    title: 'Slot Unavailable',
    message: 'Someone just booked this slot. Pick another time.',
    retryable: true,
  },
  SLOT_IN_PAST: {
    title: 'Invalid Slot Time',
    message: 'The selected slot is in the past. Please choose an upcoming time.',
  },
  HOLD_EXPIRED: {
    title: 'Hold Expired',
    message: 'Your 10-minute hold expired. Please select the slot again.',
    retryable: true,
  },
  PAYMENT_FAILED: {
    title: 'Payment Failed',
    message: 'Payment verification failed. Please try again.',
    retryable: true,
  },
  CANNOT_BOOK_OWN_CHARGER: {
    title: 'Booking Unavailable',
    message: 'Hosts cannot book their own charging stations.',
  },
  CHARGER_UNAVAILABLE: {
    title: 'Charger Unavailable',
    message: 'This charging station is currently paused or inactive.',
  },
  CHARGER_NOT_FOUND: {
    title: 'Charger Not Found',
    message: 'The requested charging station could not be found.',
    action: { label: 'Find Bays', href: '/explore' },
  },

  // Vehicles
  VEHICLE_EXISTS: {
    title: 'Vehicle Already Added',
    message: 'A vehicle with this registration number already exists in your garage.',
  },
  VEHICLE_NOT_FOUND: {
    title: 'Vehicle Not Found',
    message: 'The vehicle could not be found.',
  },

  // Host & Listings
  OUTSIDE_GEOFENCE: {
    title: 'Outside Operating Area',
    message: 'Location is outside the Bengaluru operating area.',
  },

  // Reviews
  ALREADY_REVIEWED: {
    title: 'Already Reviewed',
    message: 'You have already submitted a review for this session.',
  },
  SESSION_NOT_COMPLETED: {
    title: 'Session Incomplete',
    message: 'Reviews can only be submitted after charging is completed.',
  },
  BOOKING_NOT_FOUND: {
    title: 'Booking Not Found',
    message: 'The associated booking could not be found.',
  },

  // General Validation & System
  VALIDATION_ERROR: {
    title: 'Validation Error',
    message: 'Please review and correct the highlighted fields.',
  },
  RATE_LIMITED: {
    title: 'Too Many Attempts',
    message: 'Too many attempts. Try again in a few moments.',
    retryable: true,
  },
  NOT_FOUND: {
    title: 'Resource Not Found',
    message: 'The requested resource could not be found.',
  },
  INTERNAL_SERVER_ERROR: {
    title: 'Server Error',
    message: 'Something went wrong on our side. Please try again.',
    retryable: true,
  },
};

/**
 * Parses any incoming error into a structured UI-ready payload.
 *
 * @param {Error|Object|string} error
 * @returns {{
 *   title: string,
 *   message: string,
 *   fieldErrors: Array<{ field: string, message: string }>,
 *   retryable: boolean,
 *   action: { label: string, href?: string, onClick?: Function } | null,
 *   requestId: string | null,
 *   code: string
 * }}
 */
export function getErrorMessage(error) {
  // Handle empty or string errors
  if (!error) {
    return {
      title: 'Unexpected Error',
      message: 'An unknown error occurred. Please try again.',
      fieldErrors: [],
      retryable: false,
      action: null,
      requestId: null,
      code: 'UNKNOWN_ERROR',
    };
  }

  if (typeof error === 'string') {
    return {
      title: 'Error',
      message: error,
      fieldErrors: [],
      retryable: false,
      action: null,
      requestId: null,
      code: 'CLIENT_ERROR',
    };
  }

  // Network / Offline / Timeout detection
  const isNetworkError =
    error.message === 'Network Error' ||
    error.code === 'ERR_NETWORK' ||
    (typeof navigator !== 'undefined' && navigator.onLine === false);

  const isTimeout =
    error.code === 'ECONNABORTED' ||
    (error.message && error.message.toLowerCase().includes('timeout'));

  if (isTimeout) {
    return {
      title: ERROR_MAPPINGS.TIMEOUT.title,
      message: ERROR_MAPPINGS.TIMEOUT.message,
      fieldErrors: [],
      retryable: true,
      action: null,
      requestId: null,
      code: 'TIMEOUT',
    };
  }

  if (isNetworkError || (!error.response && error.request)) {
    return {
      title: ERROR_MAPPINGS.NETWORK_ERROR.title,
      message: ERROR_MAPPINGS.NETWORK_ERROR.message,
      fieldErrors: [],
      retryable: true,
      action: null,
      requestId: null,
      code: 'NETWORK_ERROR',
    };
  }

  // Extract server error envelope
  const res = error.response || {};
  const status = res.status;
  const data = res.data || {};

  const serverCode = data.code;
  const serverMessage = data.message;
  const requestId = data.requestId || res.headers?.['x-request-id'] || null;

  // Extract field errors
  let fieldErrors = [];
  if (Array.isArray(data.errors)) {
    fieldErrors = data.errors.map((err) => ({
      field: err.field || err.path || 'form',
      message: err.message || 'Invalid value',
    }));
  }

  // 1. Direct match by server code
  if (serverCode && ERROR_MAPPINGS[serverCode]) {
    const preset = ERROR_MAPPINGS[serverCode];
    let resolvedMessage = preset.message;

    // Special case for dynamic rate limit countdown
    if (serverCode === 'RATE_LIMITED' && serverMessage) {
      resolvedMessage = serverMessage;
    }

    return {
      title: preset.title,
      message: resolvedMessage,
      fieldErrors,
      retryable: preset.retryable || false,
      action: preset.action || null,
      requestId,
      code: serverCode,
    };
  }

  // 2. Fallbacks based on HTTP status
  if (status === 400 || status === 422) {
    const isValidation = serverCode === 'VALIDATION_ERROR' || fieldErrors.length > 0;
    return {
      title: isValidation ? 'Validation Error' : 'Invalid Request',
      message:
        serverMessage ||
        (fieldErrors.length > 0
          ? 'Please review and correct the highlighted fields.'
          : 'Please check the information provided and try again.'),
      fieldErrors,
      retryable: false,
      action: null,
      requestId,
      code: serverCode || (isValidation ? 'VALIDATION_ERROR' : 'BAD_REQUEST'),
    };
  }

  if (status === 401) {
    return {
      title: ERROR_MAPPINGS.UNAUTHENTICATED.title,
      message: ERROR_MAPPINGS.UNAUTHENTICATED.message,
      fieldErrors,
      retryable: false,
      action: ERROR_MAPPINGS.UNAUTHENTICATED.action,
      requestId,
      code: serverCode || 'UNAUTHENTICATED',
    };
  }

  if (status === 403) {
    return {
      title: ERROR_MAPPINGS.FORBIDDEN.title,
      message: serverMessage || ERROR_MAPPINGS.FORBIDDEN.message,
      fieldErrors,
      retryable: false,
      action: null,
      requestId,
      code: serverCode || 'FORBIDDEN',
    };
  }

  if (status === 404) {
    return {
      title: ERROR_MAPPINGS.NOT_FOUND.title,
      message: serverMessage || ERROR_MAPPINGS.NOT_FOUND.message,
      fieldErrors,
      retryable: false,
      action: null,
      requestId,
      code: serverCode || 'NOT_FOUND',
    };
  }

  if (status === 409) {
    return {
      title: 'Conflict',
      message: serverMessage || 'This operation conflicts with the current system state.',
      fieldErrors,
      retryable: false,
      action: null,
      requestId,
      code: serverCode || 'CONFLICT',
    };
  }

  if (status === 429) {
    return {
      title: ERROR_MAPPINGS.RATE_LIMITED.title,
      message: serverMessage || ERROR_MAPPINGS.RATE_LIMITED.message,
      fieldErrors,
      retryable: true,
      action: null,
      requestId,
      code: 'RATE_LIMITED',
    };
  }

  if (status >= 500) {
    return {
      title: ERROR_MAPPINGS.INTERNAL_SERVER_ERROR.title,
      message: ERROR_MAPPINGS.INTERNAL_SERVER_ERROR.message,
      fieldErrors: [],
      retryable: true,
      action: null,
      requestId,
      code: serverCode || 'INTERNAL_SERVER_ERROR',
    };
  }

  // Generic fallback
  return {
    title: 'Action Failed',
    message: serverMessage || error.message || 'Something went wrong. Please try again.',
    fieldErrors,
    retryable: false,
    action: null,
    requestId,
    code: serverCode || 'ERROR',
  };
}

/**
 * Universal helper for forms to distribute field errors, focus the first invalid field,
 * and display a top-level alert banner.
 *
 * Supports:
 * - applyServerErrors(error, setFieldErrors, setErrorBanner)
 * - applyServerErrors(reactHookFormMethods, error)
 * - applyServerErrors({ setFieldErrors, setErrorState }, error)
 */
export function applyServerErrors(arg1, arg2, arg3) {
  let form = null;
  let error = null;
  let setFieldErrors = null;
  let setErrorBanner = null;

  if (arg1 && (arg1.response || arg1.message || arg1.code || typeof arg1 === 'string')) {
    // Signature: applyServerErrors(error, setFieldErrors, setErrorBanner)
    error = arg1;
    setFieldErrors = typeof arg2 === 'function' ? arg2 : null;
    setErrorBanner = typeof arg3 === 'function' ? arg3 : null;
  } else if (arg1 && typeof arg1 === 'object') {
    // Signature: applyServerErrors(form, error)
    form = arg1;
    error = arg2;
    if (typeof form.setFieldErrors === 'function') setFieldErrors = form.setFieldErrors;
    if (typeof form.setErrorState === 'function') setErrorBanner = form.setErrorState;
    if (typeof form.setErrorBanner === 'function') setErrorBanner = form.setErrorBanner;
  }

  const parsed = getErrorMessage(error);
  const { fieldErrors } = parsed;

  // 1. Distribute field errors to React Hook Form if present
  if (form && typeof form.setError === 'function' && fieldErrors.length > 0) {
    fieldErrors.forEach(({ field, message }) => {
      form.setError(field, { type: 'server', message });
    });
  }

  // 2. Distribute field errors to custom state updater if present
  if (setFieldErrors && fieldErrors.length > 0) {
    const mapped = {};
    fieldErrors.forEach(({ field, message }) => {
      mapped[field] = message;
    });
    setFieldErrors((prev) => (typeof prev === 'object' && prev !== null ? { ...prev, ...mapped } : mapped));
  }

  // 3. Focus the first invalid field
  if (fieldErrors.length > 0) {
    const firstField = fieldErrors[0].field;
    if (form && typeof form.setFocus === 'function') {
      try {
        form.setFocus(firstField);
      } catch {
        // Fallback to DOM query
      }
    } else if (typeof document !== 'undefined') {
      const el = document.querySelector(`[name="${firstField}"], #${firstField}`);
      if (el && typeof el.focus === 'function') {
        el.focus();
      }
    }
  }

  // 4. Update banner state
  if (setErrorBanner) {
    // If no field errors or if explicit banner needed, provide parsed error
    setErrorBanner(parsed);
  }

  return parsed;
}
