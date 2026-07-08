const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source]);

    if (error) {
      error.isJoi = true;
      return next(error);
    }

    req[source] = value;
    next();
  };
};

module.exports = validateRequest;
