/**
 * Local-first reception store.
 *  - Roster is cached in AsyncStorage so scans validate with no connection.
 *  - Every scan is appended to a persisted queue (client-generated UUID = idempotency key).
 *  - When NetInfo reports connectivity the queue is posted to Supabase (checkin_batch RPC);
 *    the inserted `checkins` rows then stream to dashboards through Supabase Realtime.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { getSupabaseClient } from './supabase';

export type RosterEntry = { name: string; kind: string; admits: number; checkedIn: boolean };
export type QueueItem = { id: string; qr_token: string; scanned_at: string };
export type ScanResult = { result: 'accepted' | 'duplicate' | 'unknown' | 'invalid'; name?: string; detail?: string; at: number };

type State = {
  eventId: string | null;
  online: boolean;
  roster: Record<string, RosterEntry>;
  queue: QueueItem[];
  last: ScanResult | null;
  syncing: boolean;
  syncError: string | null;
  start: (eventId: string) => Promise<() => void>;
  scan: (raw: string) => Promise<ScanResult>;
  sync: () => Promise<void>;
};

const rosterKey = (id: string) => `reception:roster:${id}`;
const queueKey = (id: string) => `reception:queue:${id}`;
const isOnline = (s: NetInfoState) => s.isConnected === true && s.isInternetReachable !== false;
const PREFIX = 'EVC1:';

let lastToken = '';
let lastAt = 0;

export const useReceptionStore = create<State>()((set, get) => ({
  eventId: null,
  online: false,
  roster: {},
  queue: [],
  last: null,
  syncing: false,
  syncError: null,

  start: async (eventId) => {
    const [r, q] = await Promise.all([AsyncStorage.getItem(rosterKey(eventId)), AsyncStorage.getItem(queueKey(eventId))]);
    set({
      eventId,
      roster: r ? (JSON.parse(r) as Record<string, RosterEntry>) : {},
      queue: q ? (JSON.parse(q) as QueueItem[]) : [],
      last: null,
      syncError: null,
    });
    const net = await NetInfo.fetch();
    set({ online: isOnline(net) });
    const unsubscribe = NetInfo.addEventListener((state) => {
      const was = get().online;
      const now = isOnline(state);
      set({ online: now });
      if (now && !was) void get().sync();
    });
    if (get().online) void get().sync();
    return unsubscribe;
  },

  scan: async (raw) => {
    const { eventId } = get();
    const now = Date.now();
    const make = (r: Omit<ScanResult, 'at'>): ScanResult => ({ ...r, at: now });

    if (!eventId || !raw.startsWith(PREFIX)) {
      const res = make({ result: 'invalid', detail: 'Not an Evento QR code' });
      set({ last: res });
      return res;
    }
    const token = raw.slice(PREFIX.length);
    if (token === lastToken && now - lastAt < 3000) return get().last ?? make({ result: 'duplicate' });
    lastToken = token;
    lastAt = now;

    const entry = get().roster[token];
    let res: ScanResult;
    if (entry && !entry.checkedIn) {
      res = make({ result: 'accepted', name: entry.name, detail: `Admits ${entry.admits}` });
      set({ roster: { ...get().roster, [token]: { ...entry, checkedIn: true } } });
    } else if (entry) {
      res = make({ result: 'duplicate', name: entry.name, detail: 'Already checked in' });
    } else {
      res = make({ result: 'unknown', detail: 'Not in local roster - queued for server verification' });
    }

    if (res.result !== 'duplicate') {
      const item: QueueItem = { id: Crypto.randomUUID(), qr_token: token, scanned_at: new Date(now).toISOString() };
      const queue = [...get().queue, item];
      set({ queue });
      await Promise.all([
        AsyncStorage.setItem(queueKey(eventId), JSON.stringify(queue)),
        AsyncStorage.setItem(rosterKey(eventId), JSON.stringify(get().roster)),
      ]);
    }
    set({ last: res });
    if (get().online) void get().sync();
    return res;
  },

  sync: async () => {
    const { eventId, syncing, online } = get();
    if (!eventId || syncing || !online) return;
    set({ syncing: true, syncError: null });
    try {
      while (get().queue.length > 0) {
        const batch = get().queue.slice(0, 200);
        const { error } = await getSupabaseClient().rpc('checkin_batch', { p_event: eventId, p_items: batch });
        if (error) throw error;
        const done = new Set(batch.map((b) => b.id));
        const remaining = get().queue.filter((i) => !done.has(i.id));
        set({ queue: remaining });
        await AsyncStorage.setItem(queueKey(eventId), JSON.stringify(remaining));
      }

      const { data, error } = await getSupabaseClient().rpc('get_reception_roster', { p_event: eventId });
      if (error) throw error;
      const pending = new Set(get().queue.map((i) => i.qr_token));
      const roster: Record<string, RosterEntry> = {};
      for (const row of (data ?? []) as { token: string; name: string; kind: string; admits: number; checked_in: boolean }[]) {
        roster[row.token] = { name: row.name, kind: row.kind, admits: row.admits, checkedIn: row.checked_in || pending.has(row.token) };
      }
      set({ roster });
      await AsyncStorage.setItem(rosterKey(eventId), JSON.stringify(roster));
    } catch (e) {
      set({ syncError: e instanceof Error ? e.message : 'Sync failed' });
    } finally {
      set({ syncing: false });
    }
  },
}));
