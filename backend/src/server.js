const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

const authRouter = require('./routes/auth');
const vendorsRouter = require('./routes/vendors');
const itemsRouter = require('./routes/items');
const storesRouter = require('./routes/stores');
const uploadsRouter = require('./routes/uploads');
const ordersRouter = require('./routes/orders');
const analyticsRouter = require('./routes/analytics');
const categoriesRouter = require('./routes/categories');

const app = express();

// CORS: allow the configured frontend origin(s). Use "*" in CORS_ORIGIN to allow
// any origin. Requests with no Origin (curl, health checks) are always allowed.
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (
      config.corsOrigin.includes('*') ||
      config.corsOrigin.includes(normalized)
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'kasicart-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/stores', storesRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/categories', categoriesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(config.port, () => {
  console.log(`KasiCart backend listening on http://localhost:${config.port}`);
});
