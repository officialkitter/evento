import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { EventCard } from '../../components/EventCard';
import { Loader } from '../../components/Loader';
import { colors, space } from '../../components/theme';
import { EmptyState, Screen } from '../../components/ui';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useMyEvents } from '../../hooks/useEvents';

function QuickAction({ icon, label, detail, onPress, delay }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string; onPress: () => void; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ flex: 1 }}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <View style={styles.actionIcon}>
          <Ionicons name={icon} size={20} color={colors.brown} />
        </View>
        <Text style={styles.actionText}>{label}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.session?.user);
  const userId = user?.id;
  const { data, isLoading } = useMyEvents(userId);
  const upcoming = (data ?? []).filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() > Date.now() - 6 * 3600 * 1000);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];

  return (
    <Screen scroll padded={false}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brand}>EVENTO</Text>
              <View style={styles.brandDot} />
            </View>
            <Text style={styles.greeting}>{greeting}{firstName ? `, ${firstName}` : ''}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/profile')} style={styles.profileButton}>
            <Ionicons name="person-outline" size={20} color={colors.brown} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <LinearGradient colors={[colors.brown, '#563426', colors.brownSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View pointerEvents="none" style={styles.heroOrbLarge} />
            <View pointerEvents="none" style={styles.heroOrbSmall} />
            <View style={styles.heroCopy}>
              <View style={styles.heroEyebrow}>
                <Ionicons name="sparkles" size={13} color={colors.gold} />
                <Text style={styles.heroEyebrowText}>MADE FOR YOUR MOMENTS</Text>
              </View>
              <Text style={styles.heroTitle}>Make it a{'\n'}moment to remember.</Text>
              <Text style={styles.heroSubtitle}>Bring every detail together, beautifully.</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/event/new')} style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.85 }]}>
                <Text style={styles.heroButtonText}>Plan an event</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.brown} />
              </Pressable>
            </View>
            <View style={styles.heroDecoration} pointerEvents="none">
              <Ionicons name="sparkles" size={82} color={colors.gold} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.stats}>
          <View style={styles.stat}>
            <View style={styles.statIcon}><Ionicons name="calendar-outline" size={17} color={colors.brown} /></View>
            <View><Text style={styles.statValue}>{data?.length ?? 0}</Text><Text style={styles.statLabel}>TOTAL EVENTS</Text></View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <View style={[styles.statIcon, styles.statIconGold]}><Ionicons name="time-outline" size={17} color={colors.brown} /></View>
            <View><Text style={styles.statValue}>{upcoming.length}</Text><Text style={styles.statLabel}>UPCOMING</Text></View>
          </View>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your shortcuts</Text>
        </View>
        <View style={styles.actions}>
          <QuickAction icon="add-circle-outline" label="New event" detail="Start planning" delay={220} onPress={() => router.push('/event/new')} />
          <QuickAction icon="ticket-outline" label="Find tickets" detail="Your next outing" delay={280} onPress={() => router.push('/ticket')} />
        </View>

        <View style={[styles.sectionHeader, styles.upcomingHeader]}>
          <View>
            <Text style={styles.sectionTitle}>Coming up</Text>
            <Text style={styles.sectionSubtitle}>The moments on your calendar</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/events')} style={styles.viewAll}>
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.brown} />
          </Pressable>
        </View>
        {isLoading ? (
          <View style={{ alignItems: 'center', padding: 28 }}><Loader /></View>
        ) : upcoming.length === 0 ? (
          <EmptyState title="Your next big moment starts here" message="Create an event and bring your invitations, tickets and guest list together." />
        ) : (
          upcoming.slice(0, 4).map((event, index) => (
            <EventCard key={event.id} event={event} index={index} onPress={() => router.push(`/event/${event.id}`)} />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { color: colors.brown, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  greeting: { color: colors.brown, fontSize: 20, fontWeight: '800', marginTop: 5, textTransform: 'capitalize' },
  profileButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  hero: { minHeight: 232, borderRadius: 24, padding: 22, overflow: 'hidden', marginBottom: 18 },
  heroCopy: { zIndex: 1, alignItems: 'flex-start' },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  heroEyebrowText: { color: colors.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  heroTitle: { color: colors.canvas, fontSize: 27, fontWeight: '800', lineHeight: 32, letterSpacing: -0.5 },
  heroSubtitle: { color: colors.goldSoft, fontSize: 12, marginTop: 7 },
  heroButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.gold, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 11, marginTop: 16 },
  heroButtonText: { color: colors.brown, fontWeight: '800', fontSize: 12 },
  heroOrbLarge: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -80, top: -74, backgroundColor: colors.gold, opacity: 0.08 },
  heroOrbSmall: { position: 'absolute', width: 124, height: 124, borderRadius: 62, right: 22, bottom: -82, backgroundColor: colors.gold, opacity: 0.08 },
  heroDecoration: { position: 'absolute', right: -8, bottom: 11, opacity: 0.16, transform: [{ rotate: '-12deg' }] },
  stats: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EDE6' },
  statIconGold: { backgroundColor: colors.goldSoft },
  statValue: { color: colors.brown, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginTop: 1 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.line },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.brown, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  action: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 14, minHeight: 112 },
  actionPressed: { transform: [{ scale: 0.97 }], backgroundColor: '#FFFDF9' },
  actionIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  actionText: { color: colors.brown, fontWeight: '800', fontSize: 13 },
  actionDetail: { color: colors.muted, fontSize: 10, marginTop: 3 },
  upcomingHeader: { marginBottom: space.md },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingLeft: 8 },
  viewAllText: { color: colors.brown, fontWeight: '700', fontSize: 11 },
});
