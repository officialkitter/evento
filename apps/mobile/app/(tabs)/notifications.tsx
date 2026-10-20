import { useQueryClient } from '@tanstack/react-query';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Loader } from '../../components/Loader';
import { colors, radius } from '../../components/theme';
import { EmptyState, Screen } from '../../components/ui';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useNotifications } from '../../hooks/useEvents';
import { getSupabaseClient } from '../../hooks/supabase';

export default function Notifications() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useNotifications(userId);

  async function markRead(id: string) {
    const { error } = await getSupabaseClient().from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
    void qc.invalidateQueries({ queryKey: ['notifications', userId] });
  }

  return (
    <Screen>
      <Text style={styles.h1}>Notifications</Text>
      {isLoading ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Loader />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(n) => n.id}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          ListEmptyComponent={<EmptyState variant="bell" title="You're all caught up" message="Ticket sales and contributions will show up here." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => void markRead(item.id)} style={[styles.row, !item.read && styles.unread]}>
              <Text style={styles.title}>{item.title}</Text>
              {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
              <Text style={styles.time}>{new Date(item.created_at).toLocaleString('en-GB')}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.brown, fontSize: 28, fontWeight: '800', marginBottom: 14 },
  row: { backgroundColor: colors.white, borderRadius: radius, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  unread: { borderLeftWidth: 4, borderLeftColor: colors.gold },
  title: { color: colors.brown, fontWeight: '800', fontSize: 15 },
  body: { color: colors.ink, marginTop: 4 },
  time: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
