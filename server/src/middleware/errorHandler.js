import crypto from 'crypto';
import { APIError } from '../utils/errors.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let errors = err.errors || null;
  const requestId = req?.id || crypto.randomUUID();

  // APIError instance
  if (err instanceof APIError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    errors = err.errors;
  }
  // Handle Mongoose duplicate key error (11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    if (field === 'email') {
      code = 'EMAIL_TAKEN';
      message = 'An account with this email address already exists. Sign in instead.';
    } else if (field === 'phone') {
      code = 'PHONE_REGISTERED';
      message = 'This phone number is already registered.';
    } else if (field === 'chargerId' || (err.message && err.message.includes('chargerId_1_slotStart_1'))) {
      code = 'SLOT_TAKEN';
      message = 'This charging time slot has already been booked or held by another EV owner. Please choose another time slot.';
    } else if (field === 'registrationNumber') {
      code = 'VEHICLE_EXISTS';
      message = 'A vehicle with this registration number already exists in your garage.';
    } else {
      code = 'DUPLICATE_RECORD';
      message = `A record with this ${field} already exists.`;
    }
    errors = [{ field, message }];
  }
  // Handle Mongoose CastError (Bad ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = `Resource not found with id of ${err.value}`;
  }
  // Handle Mongoose validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    errors = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));
    message = errors.map((e) => e.message).join(', ') || 'Validation error';
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHENTICATED';
    message = 'Invalid token. Please authenticate.';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'SESSION_EXPIRED';
    message = 'Session expired. Please log in again.';
  }

  // Handle 500 or unexpected exceptions
  if (statusCode >= 500) {
    console.error(`[Error ${requestId}]`, err.stack || err);
    code = 'INTERNAL_SERVER_ERROR';
    message = 'Something went wrong on our side. Please try again';
    return res.status(statusCode).json({
      success: false,
      code,
      message,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(errors && errors.length > 0 && { errors }),
    requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
