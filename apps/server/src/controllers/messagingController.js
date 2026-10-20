const { admin } = require('../services/supabase');
const { hasEventRole } = require('../middleware/auth');
const { sendMessage } = require('../services/twilio');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ['invitation', 'contribution', 'save_the_date', 'reminder', 'thank_you'];
const MAX_RECIPIENTS = 200;

// Same wording engine on every channel, driven by the shared event_template_vars row.
function compose(kind, v, guestName) {
  const when = `${v.date_long} at ${v.time_short}`;
  const where = [v.venue_name, v.city].filter(Boolean).join(', ');
  const rsvp = v.rsvp_phone ? ` RSVP: ${v.rsvp_phone}.` : '';
  const hi = guestName ? `Dear ${guestName}, ` : '';
  switch (kind) {
    case 'save_the_date':
      return `${hi}save the date! ${v.headline_names} - ${when}${where ? `, ${where}` : ''}.`;
    case 'reminder':
      return `${hi}a gentle reminder: ${v.headline_names} is on ${when}${where ? ` at ${where}` : ''}.${rsvp}`;
    case 'thank_you':
      return `${hi}thank you for being part of ${v.headline_names}. Your presence meant the world to us.`;
    case 'contribution':
      return `${hi}you are warmly invited to contribute towards ${v.headline_names}.${rsvp}`;
    default:
      return `${hi}you are invited to ${v.headline_names} on ${when}${where ? ` at ${where}` : ''}.${v.dress_code ? ` Dress code: ${v.dress_code}.` : ''}${rsvp}`;
  }
}

// POST /api/messages/send { event_id, kind, channel, guest_ids? }
exports.send = async (req, res, next) => {
  try {
    const { event_id, kind, channel, guest_ids } = req.body || {};
    if (!UUID.test(String(event_id))) return res.status(400).json({ error: 'Invalid event' });
    if (!KINDS.includes(kind)) return res.status(400).json({ error: 'Invalid card kind' });
    if (!['sms', 'whatsapp'].includes(channel)) return res.status(400).json({ error: 'Invalid channel' });

    const allowed = await hasEventRole(req.user.id, event_id, ['owner', 'co_organizer']);
    if (!allowed) return res.status(403).json({ error: 'Not allowed' });

    const vars = await admin.from('event_template_vars').select('*').eq('event_id', event_id).single();
    if (vars.error) throw vars.error;

    let q = admin.from('guests').select('id,full_name,phone,qr_token').eq('event_id', event_id).not('phone', 'is', null);
    if (Array.isArray(guest_ids) && guest_ids.length) {
      q = q.in('id', guest_ids.filter((g) => UUID.test(String(g))));
    }
    const guests = await q.limit(MAX_RECIPIENTS);
    if (guests.error) throw guests.error;

    const base = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
    let sent = 0;
    const failed = [];
    const rows = guests.data;
    for (let i = 0; i < rows.length; i += 10) {
      const chunk = rows.slice(i, i + 10);
      const results = await Promise.allSettled(
        chunk.map((g) =>
          sendMessage({
            channel,
            to: g.phone,
            body: compose(kind, vars.data, g.full_name),
            mediaUrl: channel === 'whatsapp' && kind === 'invitation' && base ? `${base}/api/guests/${g.qr_token}/qr.png` : undefined,
          })
        )
      );
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') sent += 1;
        else failed.push({ guest_id: chunk[idx].id, error: String(r.reason && r.reason.message ? r.reason.message : r.reason) });
      });
    }

    res.json({ sent, failed_count: failed.length, failed: failed.slice(0, 20) });
  } catch (err) {
    next(err);
  }
};

module.exports.compose = compose;
