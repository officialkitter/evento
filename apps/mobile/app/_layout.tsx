import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Loader } from '../components/Loader';
import { colors } from '../components/theme';
import { supabaseConfigurationError } from '../hooks/supabase';
import { useAuthStore } from '../hooks/useAuthStore';

function SupabaseSetupScreen() {
  return (
    <SafeAreaView style={styles.setupScreen}>
      <ScrollView contentContainerStyle={styles.setupContent}>
        <View style={styles.setupIcon}>
          <Text style={styles.setupIconText}>!</Text>
        </View>
        <Text style={styles.setupEyebrow}>ONE QUICK SETUP</Text>
        <Text style={styles.setupTitle}>Connect your Supabase project</Text>
        <Text style={styles.setupMessage}>
          Evento needs your Supabase project credentials to sign in and load events. Add them to your local environment file
          and restart Expo.
        </Text>

        <View style={styles.setupCard}>
          <Text style={styles.setupStep}>1. Open <Text style={styles.setupCode}>apps/mobile/.env</Text></Text>
          <Text style={styles.setupStep}>2. Set your project URL and publishable key:</Text>
          <View style={styles.setupCodeBlock}>
            <Text selectable style={styles.setupCodeText}>EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</Text>
            <Text selectable style={styles.setupCodeText}>EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key</Text>
          </View>
          <Text style={styles.setupHint}>
            Get both values from your Supabase project settings. A publishable key is safe for app clients; never put a secret key here or commit credentials to source control.
          </Text>
        </View>

        <View style={styles.setupCard}>
          <Text style={styles.setupStep}>3. From the repository root, run:</Text>
          <View style={styles.setupCodeBlock}>
            <Text selectable style={styles.setupCodeText}>Copy-Item apps/mobile/.env.example apps/mobile/.env</Text>
            <Text selectable style={styles.setupCodeText}>cd apps/mobile</Text>
            <Text selectable style={styles.setupCodeText}>npx expo start --clear</Text>
          </View>
          <Text style={styles.setupHint}>
            Replace the example values in the copied file before restarting. If you already created .env, stop Expo and start it again so the new values are loaded.
          </Text>
        </View>

        <Text accessibilityRole="alert" style={styles.setupError}>{supabaseConfigurationError}</Text>
        <Text style={styles.setupFooter}>This screen will disappear automatically once valid credentials are loaded.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } }));
  const { session, ready, init } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (supabaseConfigurationError) return;
    return init();
  }, [init]);

  useEffect(() => {
    if (!ready || supabaseConfigurationError) return;
    const root = String(segments[0] ?? '');
    const inAuth = root === '(auth)';
    const isPublic = root === 'ticket'; // public ticket search, checkout and QR views
    if (!session && !inAuth && !isPublic) router.replace('/(auth)/login');
    else if (session && inAuth) router.replace('/(tabs)');
  }, [session, ready, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <StatusBar style="dark" />
          {supabaseConfigurationError ? (
            <SupabaseSetupScreen />
          ) : (
            <>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.brown },
                  headerTintColor: colors.gold,
                  headerTitleStyle: { color: colors.canvas },
                  contentStyle: { backgroundColor: colors.canvas },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="event/new" options={{ title: 'New event' }} />
                <Stack.Screen name="event/[id]" options={{ title: 'Event dashboard' }} />
                <Stack.Screen name="ticket/index" options={{ title: 'Find tickets' }} />
                <Stack.Screen name="ticket/[id]" options={{ title: 'Get tickets' }} />
                <Stack.Screen name="ticket/view/[code]" options={{ title: 'Your ticket' }} />
                <Stack.Screen name="reception/[eventId]" options={{ title: 'Reception check-in' }} />
              </Stack>
              {!ready && (
                <View style={styles.splash} pointerEvents="none">
                  <Loader size={56} />
                </View>
              )}
            </>
          )}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.brown, alignItems: 'center', justifyContent: 'center' },
  setupScreen: { flex: 1, backgroundColor: colors.canvas },
  setupContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 34, justifyContent: 'center' },
  setupIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  setupIconText: { color: colors.brown, fontSize: 26, fontWeight: '900' },
  setupEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 8 },
  setupTitle: { color: colors.brown, fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.5 },
  setupMessage: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 22 },
  setupCard: { backgroundColor: colors.white, borderRadius: 16, borderColor: colors.line, borderWidth: 1, padding: 16, marginBottom: 12 },
  setupStep: { color: colors.brown, fontSize: 13, lineHeight: 20, fontWeight: '700', marginBottom: 7 },
  setupCode: { fontFamily: 'monospace', color: colors.brownSoft, fontWeight: '700' },
  setupCodeBlock: { backgroundColor: '#F7F2EC', borderRadius: 10, padding: 11, gap: 6, marginTop: 3 },
  setupCodeText: { color: colors.brown, fontFamily: 'monospace', fontSize: 10, lineHeight: 16 },
  setupHint: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 10 },
  setupError: { color: '#A13B31', fontSize: 12, lineHeight: 18, marginTop: 2, marginBottom: 12 },
  setupFooter: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 14 },
});
