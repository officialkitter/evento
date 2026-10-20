const crypto = require('crypto');

const PROVIDER = process.env.MOBILE_MONEY_PROVIDER || 'mobilemoney';

// HMAC-SHA256 over the raw request body; header may be hex or "sha256=<hex>".
function verifySignature(rawBody, headerValue) {
  const secret = process.env.MOBILE_MONEY_WEBHOOK_SECRET;
  if (!secret || !headerValue || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = String(headerValue).replace(/^sha256=/i, '').trim().toLowerCase();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ADAPTER POINT: map your provider's callback JSON to this shape.
// Generic payload: { id, reference, status: "SUCCESS"|"FAILED"|"PENDING", amount, currency }
function parseEvent(body) {
  const reference = String(body.reference || body.merchant_reference || '');
  const rawStatus = String(body.status || '').toUpperCase();
  let status = 'pending';
  if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'].includes(rawStatus)) status = 'paid';
  else if (['FAILED', 'CANCELLED', 'CANCELED', 'REJECTED'].includes(rawStatus)) status = 'failed';
  const amount = body.amount === undefined || body.amount === null ? null : Number(body.amount);
  return {
    eventKey: String(body.id || body.transaction_id || `${reference}:${rawStatus}`),
    reference,
    status,
    amount: Number.isFinite(amount) ? amount : null,
    currency: body.currency ? String(body.currency) : null,
  };
}

// ADAPTER POINT: trigger the USSD/STK push. Adjust path and body to your provider's API.
async function initiateCharge({ amount, currency, phone, reference }) {
  const base = process.env.MOBILE_MONEY_BASE_URL;
  if (!base) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('Mobile money provider is not configured');
      err.status = 503;
      throw err;
    }
    return { sandbox: true }; // local dev: no provider call; POST a signed webhook to simulate payment
  }
  const res = await fetch(`${base.replace(/\/$/, '')}/charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MOBILE_MONEY_API_KEY || ''}`,
    },
    body: JSON.stringify({
      amount,
      currency,
      msisdn: phone,
      reference,
      callback_url: `${process.env.PUBLIC_API_URL || ''}/api/webhooks/mobile-money`,
    }),
  });
  if (!res.ok) {
    const err = new Error(`Provider rejected the charge (${res.status})`);
    err.status = 502;
    throw err;
  }
  return res.json().catch(() => ({}));
}

module.exports = { PROVIDER, verifySignature, parseEvent, initiateCharge };
