const jwt = require('jsonwebtoken');
const config = require('../config');

function signVendorToken(vendorId) {
  return jwt.sign({ sub: vendorId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signVendorToken, verifyToken };
