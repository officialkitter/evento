const twilio = require('twilio');

let client = null;
function getClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      const err = new Error('Messaging is not configured');
      err.status = 503;
      throw err;
    }
    client = twilio(sid, token);
  }
  return client;
}

function toE164(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// channel: 'sms' | 'whatsapp'
async function sendMessage({ channel, to, body, mediaUrl }) {
  const c = getClient();
  const number = toE164(to);
  if (channel === 'whatsapp') {
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!from) throw new Error('TWILIO_WHATSAPP_FROM is not set');
    const payload = { from, to: `whatsapp:${number}`, body };
    if (mediaUrl) payload.mediaUrl = [mediaUrl];
    return c.messages.create(payload);
  }
  const from = process.env.TWILIO_SMS_FROM;
  if (!from) throw new Error('TWILIO_SMS_FROM is not set');
  return c.messages.create({ from, to: number, body });
}

module.exports = { sendMessage };
