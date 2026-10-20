const crypto = require('crypto');
const { admin } = require('../services/supabase');
const { PROVIDER, initiateCharge } = require('../services/mobileMoney');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/i;
const PHONE = /^\+?[0-9]{9,15}$/;

const cleanPhone = (p) => String(p || '').replace(/[\s-]/g, '');
const safeSearch = (q) => String(q || '').replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 60);

const publicEventFields =
  'id,type,title,honoree_names,host_name,description,starts_at,ends_at,venue_name,venue_address,city,cover_theme,status';

function withAvailability(categories) {
  return (categories || []).map((c) => ({
    ...c,
    available: c.capacity === null ? null : Math.max(0, c.capacity - c.sold),
  }));
}

// GET /api/public/events?q=
exports.searchEvents = async (req, res, next) => {
  try {
    const q = safeSearch(req.query.q);
    let query = admin
      .from('events')
      .select(`${publicEventFields}, ticket_categories(id,name,price,currency,capacity,sold)`)
      .eq('is_public', true)
      .in('status', ['confirmed', 'live'])
      .gte('starts_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(30);
    if (q) query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%,honoree_names.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ events: data });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/events/:id
exports.getEvent = async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid event id' });
    const { data, error } = await admin
      .from('events')
      .select(`${publicEventFields}, ticket_categories(*)`)
      .eq('id', req.params.id)
      .eq('is_public', true)
      .in('status', ['confirmed', 'live'])
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });
    data.ticket_categories = withAvailability(data.ticket_categories);
    res.json({ event: data });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets/checkout { category_id, buyer_name, buyer_phone, buyer_email?, quantity }
exports.checkout = async (req, res, next) => {
  try {
    const { category_id, buyer_name, buyer_email } = req.body || {};
    const buyer_phone = cleanPhone(req.body && req.body.buyer_phone);
    const quantity = Number(req.body && req.body.quantity);
    if (!UUID.test(String(category_id))) return res.status(400).json({ error: 'Invalid category' });
    if (!buyer_name || String(buyer_name).trim().length < 2) return res.status(400).json({ error: 'Name is required' });
    if (!PHONE.test(buyer_phone)) return res.status(400).json({ error: 'A valid mobile money number is required' });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return res.status(400).json({ error: 'Quantity must be 1-20' });
    }

    const created = await admin.rpc('create_order', {
      p_category: category_id,
      p_buyer_name: String(buyer_name),
      p_buyer_phone: buyer_phone,
      p_buyer_email: buyer_email ? String(buyer_email) : null,
      p_quantity: quantity,
    });
    if (created.error) {
      const msg = created.error.message || 'Could not create order';
      const business = /sold out|not on sale|closed|not found|invalid/i.test(msg);
      return res.status(business ? 409 : 500).json({ error: business ? msg : 'Could not create order' });
    }
    const order = created.data;

    const providerRef = `PAY-${crypto.randomUUID()}`;
    const pay = await admin
      .from('payments')
      .insert({
        order_id: order.id,
        provider: PROVIDER,
        provider_ref: providerRef,
        amount: order.amount_due,
        currency: order.currency,
        status: 'pending',
      })
      .select('id')
      .single();
    if (pay.error) throw pay.error;

    try {
      await initiateCharge({
        amount: order.amount_due,
        currency: order.currency,
        phone: buyer_phone,
        reference: providerRef,
      });
    } catch (chargeErr) {
      await admin.from('payments').update({ status: 'failed' }).eq('id', pay.data.id);
      return res.status(chargeErr.status || 502).json({ error: 'Could not start the mobile money prompt' });
    }

    res.status(201).json({
      order_id: order.id,
      reference: order.reference,
      amount_due: order.amount_due,
      currency: order.currency,
      status: order.status,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id?phone=  -> polling endpoint, returns tickets once paid
exports.orderStatus = async (req, res, next) => {
  try {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid order id' });
    const phone = cleanPhone(req.query.phone);
    const { data: order, error } = await admin
      .from('orders')
      .select('id,status,quantity,amount_due,amount_paid,currency,buyer_phone,event_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!order || order.buyer_phone !== phone) return res.status(404).json({ error: 'Order not found' });

    let tickets = [];
    if (order.status === 'paid' || order.status === 'partial') {
      const t = await admin
        .from('tickets')
        .select('qr_token,status,admits,holder_name')
        .eq('order_id', order.id)
        .order('created_at');
      if (t.error) throw t.error;
      tickets = t.data;
    }
    const { buyer_phone, ...safe } = order;
    res.json({ order: safe, tickets });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/:code
exports.ticketByCode = async (req, res, next) => {
  try {
    if (!TOKEN.test(req.params.code)) return res.status(400).json({ error: 'Invalid ticket code' });
    const { data, error } = await admin
      .from('tickets')
      .select('qr_token,status,admits,holder_name,checked_in_at, ticket_categories(name), events(title,honoree_names,starts_at,venue_name,city)')
      .eq('qr_token', req.params.code)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket: data });
  } catch (err) {
    next(err);
  }
};

// POST /api/contributions { campaign_id, contributor_name, contributor_phone, amount }
exports.contribute = async (req, res, next) => {
  try {
    const { campaign_id, contributor_name } = req.body || {};
    const phone = cleanPhone(req.body && req.body.contributor_phone);
    const amount = Number(req.body && req.body.amount);
    if (!UUID.test(String(campaign_id))) return res.status(400).json({ error: 'Invalid campaign' });
    if (!contributor_name || String(contributor_name).trim().length < 2) return res.status(400).json({ error: 'Name is required' });
    if (!PHONE.test(phone)) return res.status(400).json({ error: 'A valid mobile money number is required' });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return res.status(400).json({ error: 'Invalid amount' });

    const camp = await admin
      .from('contribution_campaigns')
      .select('id,currency, events!inner(status)')
      .eq('id', campaign_id)
      .in('events.status', ['confirmed', 'live'])
      .maybeSingle();
    if (camp.error) throw camp.error;
    if (!camp.data) return res.status(404).json({ error: 'Campaign not found' });

    const ins = await admin
      .from('contributions')
      .insert({ campaign_id, contributor_name: String(contributor_name).trim(), contributor_phone: phone, pledged: amount })
      .select('id')
      .single();
    if (ins.error) throw ins.error;

    const providerRef = `PAY-${crypto.randomUUID()}`;
    const pay = await admin
      .from('payments')
      .insert({
        contribution_id: ins.data.id,
        provider: PROVIDER,
        provider_ref: providerRef,
        amount,
        currency: camp.data.currency,
        status: 'pending',
      })
      .select('id')
      .single();
    if (pay.error) throw pay.error;

    try {
      await initiateCharge({ amount, currency: camp.data.currency, phone, reference: providerRef });
    } catch (chargeErr) {
      await admin.from('payments').update({ status: 'failed' }).eq('id', pay.data.id);
      return res.status(chargeErr.status || 502).json({ error: 'Could not start the mobile money prompt' });
    }
    res.status(201).json({ contribution_id: ins.data.id, status: 'pending' });
  } catch (err) {
    next(err);
  }
};
