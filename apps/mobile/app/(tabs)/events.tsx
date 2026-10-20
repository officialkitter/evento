import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventCard } from '../../components/EventCard';
import { Loader } from '../../components/Loader';
import { colors } from '../../components/theme';
import { EmptyState, Screen } from '../../components/ui';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useMyEvents } from '../../hooks/useEvents';

export default function MyEvents() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data, isLoading, refetch, isRefetching } = useMyEvents(userId);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR CALENDAR</Text>
          <Text style={styles.h1}>My events</Text>
          <Text style={styles.subtitle}>Every detail, all in one place.</Text>
        </View>
        <View style={styles.count}>
          <Text style={styles.countValue}>{data?.length ?? 0}</Text>
          <Text style={styles.countLabel}>EVENTS</Text>
        </View>
      </View>
      {isLoading ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Loader />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(e) => e.id}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState title="Nothing here yet" message="Tap + to create an event." />}
          renderItem={({ item, index }) => <EventCard event={item} index={index} onPress={() => router.push(`/event/${item.id}`)} />}
        />
      )}
      <Pressable style={styles.fab} onPress={() => router.push('/event/new')} accessibilityLabel="Create event">
        <Ionicons name="add" size={26} color={colors.white} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  h1: { color: colors.brown, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  count: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  countValue: { color: colors.brown, fontSize: 17, fontWeight: '800' },
  countLabel: { color: colors.brownSoft, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 20, backgroundColor: colors.brown, alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
