require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/kasicart',
  // Normalize allowed origins: trim whitespace and drop any trailing slash so
  // "https://x.vercel.app/" and "https://x.vercel.app" both match.
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  // Isolated MoMo USSD template (SRS FR-USSD-1 / risk mitigation: single
  // configurable module for the dial-string syntax).
  momoUssdTemplate: process.env.MOMO_USSD_TEMPLATE || '*182*8*1*{code}*{amount}#',

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  // Cloudinary (image uploads). Either set CLOUDINARY_URL, or the three parts.
  cloudinary: {
    url: process.env.CLOUDINARY_URL || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'kasicart',
  },
};

config.cloudinaryConfigured = Boolean(
  config.cloudinary.url ||
    (config.cloudinary.cloudName &&
      config.cloudinary.apiKey &&
      config.cloudinary.apiSecret)
);

module.exports = config;
