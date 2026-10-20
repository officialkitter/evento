/**
 * Core multi-generator engine ("enter information once, use it everywhere").
 * The form is parsed ONCE into a payload; the database (create_event_bundle) fans it out into the
 * event, invitation/contribution/reminder cards, ticket categories and the reception roster.
 * Every artifact then reads the same `event_template_vars` row via composeCard().
 */
export type EventType = 'wedding' | 'birthday' | 'graduation' | 'memorial' | 'corporate' | 'party' | 'fundraiser' | 'custom';
export type CardKind = 'invitation' | 'contribution' | 'save_the_date' | 'reminder' | 'thank_you';
export type TicketName = 'Regular' | 'VIP' | 'VVIP' | 'Early Bird' | 'Couple' | 'Group';

export const EVENT_TYPES: { key: EventType; label: string }[] = [
  { key: 'wedding', label: 'Wedding' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'graduation', label: 'Graduation' },
  { key: 'memorial', label: 'Memorial' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'party', label: 'Party' },
  { key: 'fundraiser', label: 'Fundraiser' },
  { key: 'custom', label: 'Custom' },
];

export const CARD_KINDS: { key: CardKind; label: string }[] = [
  { key: 'invitation', label: 'Invitation' },
  { key: 'contribution', label: 'Contribution' },
  { key: 'save_the_date', label: 'Save the date' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'thank_you', label: 'Thank you' },
];

export const TICKET_NAMES: TicketName[] = ['Regular', 'VIP', 'VVIP', 'Early Bird', 'Couple', 'Group'];

export type EventRow = {
  id: string;
  owner_id: string;
  type: EventType;
  title: string;
  honoree_names: string | null;
  host_name: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  dress_code: string | null;
  rsvp_phone: string | null;
  is_public: boolean;
  status: string;
};

export type TemplateVars = {
  event_id: string;
  type: EventType;
  title: string;
  headline_names: string;
  host_name: string | null;
  date_long: string;
  time_short: string;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
  dress_code: string | null;
  rsvp_phone: string | null;
  guest_count: number;
};

/** draft/pending stay as stored; confirmed becomes live/expired based on the clock. */
export function effectiveStatus(e: { status: string; starts_at: string; ends_at: string | null }): string {
  if (e.status !== 'confirmed' && e.status !== 'live') return e.status;
  const now = Date.now();
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 6 * 3600 * 1000;
  if (now > end) return 'expired';
  if (now >= start) return 'live';
  return 'confirmed';
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function composeCard(kind: CardKind, v: TemplateVars): { eyebrow: string; headline: string; lines: string[] } {
  const where = [v.venue_name, v.city].filter(Boolean).join(', ');
  const when = `${v.date_long} - ${v.time_short}`;
  const base = [when, where].filter(Boolean);
  switch (kind) {
    case 'save_the_date':
      return { eyebrow: 'Save the date', headline: v.headline_names, lines: base };
    case 'reminder':
      return { eyebrow: 'A gentle reminder', headline: v.headline_names, lines: [...base, v.rsvp_phone ? `RSVP ${v.rsvp_phone}` : ''].filter(Boolean) };
    case 'thank_you':
      return { eyebrow: 'Thank you', headline: v.headline_names, lines: ['Your presence meant the world to us.'] };
    case 'contribution':
      return { eyebrow: 'Join us in contributing', headline: v.headline_names, lines: [...base, v.rsvp_phone ? `Contact ${v.rsvp_phone}` : ''].filter(Boolean) };
    default:
      return {
        eyebrow: 'You are invited',
        headline: v.headline_names,
        lines: [...base, v.dress_code ? `Dress code: ${v.dress_code}` : '', v.rsvp_phone ? `RSVP ${v.rsvp_phone}` : ''].filter(Boolean),
      };
  }
}

/** "Amina, +255712345678" per line -> guest roster entries. */
export function parseGuestLines(text: string): { full_name: string; phone?: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, phone] = line.split(',').map((s) => s.trim());
      return phone ? { full_name: name, phone: phone.replace(/\s/g, '') } : { full_name: name };
    })
    .filter((g) => g.full_name.length > 0);
}

export type EventForm = {
  type: EventType;
  title: string;
  honoree_names: string;
  host_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue_name: string;
  city: string;
  dress_code: string;
  rsvp_phone: string;
  is_public: boolean;
  ticketPrice: string;
  ticketNames: TicketName[];
  contributions: boolean;
  guestsText: string;
};

export function buildEventPayload(f: EventForm): { payload: Record<string, unknown> } | { error: string } {
  if (f.title.trim().length < 2) return { error: 'Please enter an event title.' };
  const start = new Date(`${f.date}T${f.time}:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || !/^\d{2}:\d{2}$/.test(f.time) || Number.isNaN(start.getTime())) {
    return { error: 'Use date as YYYY-MM-DD and time as HH:MM.' };
  }
  const price = Number(f.ticketPrice || '0');
  if (f.is_public && (!Number.isFinite(price) || price < 0)) return { error: 'Ticket price must be a number.' };

  return {
    payload: {
      type: f.type,
      title: f.title.trim(),
      honoree_names: f.honoree_names.trim(),
      host_name: f.host_name.trim(),
      starts_at: start.toISOString(),
      venue_name: f.venue_name.trim(),
      city: f.city.trim(),
      dress_code: f.dress_code.trim(),
      rsvp_phone: f.rsvp_phone.trim(),
      is_public: f.is_public,
      contributions: f.contributions,
      tickets: f.is_public ? f.ticketNames.map((name) => ({ name, price })) : [],
      guests: parseGuestLines(f.guestsText),
    },
  };
}
