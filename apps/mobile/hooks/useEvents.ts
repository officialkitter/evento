import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventRow, TemplateVars } from './eventEngine';
import { getSupabaseClient } from './supabase';

export type Guest = { id: string; full_name: string; phone: string | null; rsvp: string; seats: number; checked_in_at: string | null };
export type Category = { id: string; name: string; price: number; currency: string; capacity: number | null; sold: number };
export type CardRow = { id: string; kind: string; status: string; event_id: string };

export function useMyEvents(userId?: string) {
  return useQuery({
    queryKey: ['events', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from('events')
        .select('*, event_members!inner(user_id,role)')
        .eq('event_members.user_id', userId as string)
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as (EventRow & { event_members: { role: string }[] })[];
    },
  });
}

export function useDashboard(id: string) {
  return useQuery({
    queryKey: ['dashboard', id],
    queryFn: async () => {
      const [ev, vars, guests, cats, orders, camp, checked] = await Promise.all([
        getSupabaseClient().from('events').select('*').eq('id', id).single(),
        getSupabaseClient().from('event_template_vars').select('*').eq('event_id', id).single(),
        getSupabaseClient().from('guests').select('id,full_name,phone,rsvp,seats,checked_in_at').eq('event_id', id).order('full_name'),
        getSupabaseClient().from('ticket_categories').select('*').eq('event_id', id).order('price'),
        getSupabaseClient().from('orders').select('id,status,amount_paid,quantity').eq('event_id', id),
        getSupabaseClient().from('contribution_campaigns').select('id,title,target_amount,currency, contributions(pledged,paid,status)').eq('event_id', id).maybeSingle(),
        getSupabaseClient().from('checkins').select('id', { count: 'exact', head: true }).eq('event_id', id).eq('result', 'accepted'),
      ]);
      for (const r of [ev, vars, guests, cats, orders, camp, checked]) {
        if (r.error) throw r.error;
      }
      const paidOrders = (orders.data ?? []).filter((o) => o.status === 'paid' || o.status === 'partial');
      const contributions = (camp.data?.contributions ?? []) as { pledged: number; paid: number }[];
      return {
        event: ev.data as EventRow,
        vars: vars.data as unknown as TemplateVars,
        guests: (guests.data ?? []) as Guest[],
        categories: (cats.data ?? []) as Category[],
        revenue: paidOrders.reduce((sum, o) => sum + Number(o.amount_paid), 0),
        ticketsSold: paidOrders.reduce((sum, o) => sum + o.quantity, 0),
        campaign: camp.data ? { title: camp.data.title as string, target: camp.data.target_amount as number | null, currency: camp.data.currency as string, raised: contributions.reduce((s, c) => s + Number(c.paid), 0) } : null,
        checkedIn: checked.count ?? 0,
      };
    },
  });
}

export function useCards(userId?: string) {
  return useQuery({
    queryKey: ['cards', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from('cards')
        .select('id,kind,status,event_id, events!inner(title,starts_at,event_members!inner(user_id))')
        .eq('events.event_members.user_id', userId as string);
      if (error) throw error;
      return (data ?? []) as unknown as (CardRow & { events: { title: string; starts_at: string } })[];
    },
  });
}

export function useTemplateVars(eventId?: string) {
  return useQuery({
    queryKey: ['vars', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().from('event_template_vars').select('*').eq('event_id', eventId as string).single();
      if (error) throw error;
      return data as unknown as TemplateVars;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await getSupabaseClient().rpc('create_event_bundle', { payload });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['events'] });
      void qc.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function usePublishEvent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await getSupabaseClient().from('events').update({ status: 'confirmed' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dashboard', id] });
      void qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export type NotificationRow = { id: string; title: string; body: string | null; read: boolean; created_at: string };

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().from('notifications').select('id,title,body,read,created_at').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}
