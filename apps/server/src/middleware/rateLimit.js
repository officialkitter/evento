const rateLimit = require('express-rate-limit');

const make = (windowMs, limit) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
  });

module.exports = {
  globalLimiter: make(15 * 60 * 1000, 600),
  strictLimiter: make(15 * 60 * 1000, 30), // checkout / contribution / lookups
  messageLimiter: make(60 * 1000, 10), // bulk messaging
};
