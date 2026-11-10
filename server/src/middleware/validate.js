export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.safeParse(req[source]);
      if (!parsed.success) {
        const errors = parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors,
          requestId: req.id,
        });
      }
      req[source] = parsed.data;
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUEST_DATA',
        message: 'Invalid request data',
        error: err.message,
        requestId: req.id,
      });
    }
  };
};
