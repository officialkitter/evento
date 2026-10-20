require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { admin } = require('./src/services/supabase');
const { globalLimiter, strictLimiter, messageLimiter } = require('./src/middleware/rateLimit');
const { requireAuth } = require('./src/middleware/auth');
const webhook = require('./src/controllers/webhookController');
const ticketing = require('./src/controllers/ticketingController');
const qr = require('./src/controllers/qrController');
const messaging = require('./src/controllers/messagingController');
const cards = require('./src/controllers/cardController');

const app = express();
app.set('trust proxy', 1); // Railway sits behind a proxy
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());

app.get('/health', (_req, res) => res.json({ ok: true }));

// Webhooks need the raw body for signature verification, so mount before express.json().
app.post('/api/webhooks/mobile-money', express.raw({ type: '*/*', limit: '1mb' }), webhook.mobileMoney);

app.use(express.json({ limit: '1mb' }));
app.use('/api', globalLimiter);

// Public: ticket search, checkout, QR
app.get('/api/public/events', strictLimiter, ticketing.searchEvents);
app.get('/api/public/events/:id', ticketing.getEvent);
app.post('/api/tickets/checkout', strictLimiter, ticketing.checkout);
app.get('/api/orders/:id', ticketing.orderStatus);
app.get('/api/tickets/:code', strictLimiter, ticketing.ticketByCode);
app.get('/api/tickets/:code/qr.png', strictLimiter, qr.ticketQr);
app.get('/api/guests/:code/qr.png', strictLimiter, qr.guestQr);
app.post('/api/contributions', strictLimiter, ticketing.contribute);

// Authenticated organizer endpoints
app.post('/api/messages/send', requireAuth, messageLimiter, messaging.send);
app.get('/api/events/:id/cards/:kind.pdf', requireAuth, cards.cardPdf);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status && err.status < 600 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, '0.0.0.0', () => console.log(`Evento API listening on :${port}`));

// Expire abandoned mobile-money prompts every minute.
const sweeper = setInterval(async () => {
  const { error } = await admin.rpc('expire_stale_orders');
  if (error) console.error('expire_stale_orders failed:', error.message);
}, 60 * 1000);
sweeper.unref();

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
