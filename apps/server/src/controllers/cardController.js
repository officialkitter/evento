const { admin } = require('../services/supabase');
const { hasEventRole } = require('../middleware/auth');
const { renderCardPdf } = require('../services/cardPdf');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ['invitation', 'contribution', 'save_the_date', 'reminder', 'thank_you'];

// GET /api/events/:id/cards/:kind.pdf?guest=<guestId>   (organizers only)
exports.cardPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kind = req.params.kind;
    if (!UUID.test(id) || !KINDS.includes(kind)) return res.status(400).json({ error: 'Invalid request' });
    if (!(await hasEventRole(req.user.id, id, ['owner', 'co_organizer']))) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const vars = await admin.from('event_template_vars').select('*').eq('event_id', id).single();
    if (vars.error) throw vars.error;

    let guest = null;
    if (req.query.guest && UUID.test(String(req.query.guest))) {
      const g = await admin
        .from('guests')
        .select('full_name,qr_token')
        .eq('id', req.query.guest)
        .eq('event_id', id)
        .maybeSingle();
      if (g.error) throw g.error;
      guest = g.data;
    }

    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${kind}.pdf"` });
    await renderCardPdf(res, kind, vars.data, guest);
  } catch (err) {
    next(err);
  }
};
