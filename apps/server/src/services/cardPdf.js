const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const BROWN = '#2D1A12';
const GOLD = '#D4AF37';
const WARM_WHITE = '#FAF8F5';

const HEADINGS = {
  invitation: 'You are invited',
  contribution: 'Join us in contributing',
  save_the_date: 'Save the date',
  reminder: 'A gentle reminder',
  thank_you: 'Thank you',
};

// Streams an A5 card PDF into `res`. `vars` is a row of event_template_vars.
async function renderCardPdf(res, kind, vars, guest) {
  const doc = new PDFDocument({ size: 'A5', margin: 36, info: { Title: `${vars.headline_names} - ${kind}` } });
  doc.pipe(res);
  const w = doc.page.width;
  const h = doc.page.height;

  doc.rect(0, 0, w, h).fill(BROWN);
  doc.lineWidth(1.5).strokeColor(GOLD).rect(16, 16, w - 32, h - 32).stroke();
  doc.lineWidth(0.5).rect(22, 22, w - 44, h - 44).stroke();

  const center = (text, size, color, font, gap = 10) => {
    doc.fillColor(color).font(font).fontSize(size).text(text, 36, doc.y, { width: w - 72, align: 'center' });
    doc.moveDown(gap / size);
  };

  doc.y = 60;
  center(String(HEADINGS[kind] || HEADINGS.invitation).toUpperCase(), 11, GOLD, 'Helvetica', 18);
  center(vars.headline_names, 28, WARM_WHITE, 'Helvetica-Bold', 14);
  if (vars.host_name) center(`Hosted by ${vars.host_name}`, 11, GOLD, 'Helvetica-Oblique', 16);
  center(`${vars.date_long}`, 13, WARM_WHITE, 'Helvetica', 6);
  center(`${vars.time_short}`, 13, GOLD, 'Helvetica-Bold', 12);
  const where = [vars.venue_name, vars.venue_address, vars.city].filter(Boolean).join(' - ');
  if (where) center(where, 11, WARM_WHITE, 'Helvetica', 10);
  if (vars.dress_code) center(`Dress code: ${vars.dress_code}`, 10, GOLD, 'Helvetica', 8);
  if (vars.rsvp_phone) center(`RSVP ${vars.rsvp_phone}`, 10, WARM_WHITE, 'Helvetica', 8);

  if (guest && guest.qr_token) {
    const png = await QRCode.toBuffer(`EVC1:${guest.qr_token}`, {
      type: 'png',
      width: 300,
      margin: 2,
      color: { dark: BROWN, light: WARM_WHITE },
    });
    const size = 110;
    doc.image(png, (w - size) / 2, h - size - 64, { width: size });
    doc.fillColor(GOLD).font('Helvetica').fontSize(9).text(guest.full_name, 36, h - 50, { width: w - 72, align: 'center' });
  }

  doc.end();
}

module.exports = { renderCardPdf };
