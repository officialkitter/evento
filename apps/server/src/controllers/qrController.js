const QRCode = require('qrcode');
const { admin } = require('../services/supabase');

const TOKEN = /^[0-9a-f]{64}$/i;

async function sendPng(res, token) {
  const png = await QRCode.toBuffer(`EVC1:${token}`, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#2D1A12', light: '#FAF8F5' },
  });
  res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' });
  res.send(png);
}

// GET /api/tickets/:code/qr.png
exports.ticketQr = async (req, res, next) => {
  try {
    if (!TOKEN.test(req.params.code)) return res.status(400).json({ error: 'Invalid code' });
    const { data, error } = await admin.from('tickets').select('id').eq('qr_token', req.params.code).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    await sendPng(res, req.params.code);
  } catch (err) {
    next(err);
  }
};

// GET /api/guests/:code/qr.png  (used as WhatsApp media for invitations)
exports.guestQr = async (req, res, next) => {
  try {
    if (!TOKEN.test(req.params.code)) return res.status(400).json({ error: 'Invalid code' });
    const { data, error } = await admin.from('guests').select('id').eq('qr_token', req.params.code).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    await sendPng(res, req.params.code);
  } catch (err) {
    next(err);
  }
};
