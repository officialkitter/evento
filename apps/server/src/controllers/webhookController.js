const { admin } = require('../services/supabase');
const { PROVIDER, verifySignature, parseEvent } = require('../services/mobileMoney');

// Mounted with express.raw(), so req.body is a Buffer (required for signature checks).
exports.mobileMoney = async (req, res, next) => {
  let eventRowId = null;
  try {
    if (!verifySignature(req.body, req.get('x-signature'))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    let body;
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const evt = parseEvent(body);
    if (!evt.reference) return res.status(400).json({ error: 'Missing reference' });

    // Idempotency: each provider event is processed once.
    const ins = await admin
      .from('payment_events')
      .insert({ provider: PROVIDER, event_key: evt.eventKey, payload: body })
      .select('id')
      .single();
    if (ins.error) {
      if (ins.error.code === '23505') return res.status(200).json({ ok: true, duplicate: true });
      throw ins.error;
    }
    eventRowId = ins.data.id;

    if (evt.status === 'pending') return res.status(200).json({ ok: true, ignored: 'pending' });

    const update = { status: evt.status, raw: body };
    if (evt.status === 'paid' && evt.amount !== null) update.amount = evt.amount; // record what was really paid
    const allowedFrom = evt.status === 'paid' ? ['pending', 'expired'] : ['pending'];

    // The DB trigger apply_payment() then updates the order/contribution and issues tickets.
    const upd = await admin
      .from('payments')
      .update(update)
      .eq('provider', PROVIDER)
      .eq('provider_ref', evt.reference)
      .in('status', allowedFrom)
      .select('id');
    if (upd.error) throw upd.error;

    return res.status(200).json({ ok: true, updated: upd.data.length });
  } catch (err) {
    // Let the provider retry: forget the idempotency record if processing failed.
    if (eventRowId) await admin.from('payment_events').delete().eq('id', eventRowId);
    return next(err);
  }
};
