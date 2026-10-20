import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { getSupabaseClient } from './supabase';

type AuthState = {
  session: Session | null;
  ready: boolean;
  init: () => () => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  ready: false,
  init: () => {
    const supabase = getSupabaseClient();
    supabase.auth
      .getSession()
      .then(({ data }) => set({ session: data.session, ready: true }))
      .catch(() => set({ ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => set({ session, ready: true }));
    return () => data.subscription.unsubscribe();
  },
  signOut: async () => {
    await getSupabaseClient().auth.signOut();
    set({ session: null });
  },
}));
