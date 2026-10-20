import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Hero } from '../../components/Illustrations';
import { Loader } from '../../components/Loader';
import { colors, radius } from '../../components/theme';
import { Button, EmptyState, Field, Screen } from '../../components/ui';
import { api } from '../../hooks/api';
import { formatDate } from '../../hooks/eventEngine';

type PublicEvent = {
  id: string;
  title: string;
  honoree_names: string | null;
  starts_at: string;
  venue_name: string | null;
  city: string | null;
  ticket_categories: { id: string; name: string; price: number; currency: string }[];
};

export default function TicketSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [code, setCode] = useState('');

  const { data, isFetching, error } = useQuery({
    queryKey: ['public-events', submitted],
    queryFn: () => api<{ events: PublicEvent[] }>(`/api/public/events?q=${encodeURIComponent(submitted)}`),
  });

  return (
    <Screen padded={false} edges={[]}>
      <Hero variant="ticket" title="Find your event" subtitle="Search public events and pay with mobile money." height={170} />
      <View style={{ padding: 20, flex: 1 }}>
        <Field label="Search by event or city" value={q} onChangeText={setQ} onSubmitEditing={() => setSubmitted(q)} returnKeyType="search" placeholder="Dar es Salaam" />
        <Button title="Search" onPress={() => setSubmitted(q)} />
        <View style={{ height: 14 }} />
        <Field label="Already have a ticket? Paste your code" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} />
        <Button title="Open ticket" variant="ghost" onPress={() => /^[0-9a-f]{64}$/i.test(code.trim()) && router.push(`/ticket/view/${code.trim()}`)} />

        {isFetching ? (
          <View style={{ alignItems: 'center', padding: 24 }}>
            <Loader />
          </View>
        ) : error ? (
          <EmptyState title="Could not load events" message={error instanceof Error ? error.message : 'Check your connection.'} />
        ) : (
          <FlatList
            style={{ marginTop: 14 }}
            data={data?.events ?? []}
            keyExtractor={(e) => e.id}
            ListEmptyComponent={<EmptyState variant="ticket" title="No public events found" message="Try another search." />}
            renderItem={({ item }) => {
              const from = item.ticket_categories.length ? Math.min(...item.ticket_categories.map((c) => Number(c.price))) : null;
              return (
                <Pressable style={styles.row} onPress={() => router.push(`/ticket/${item.id}`)}>
                  <Text style={styles.title}>{item.honoree_names || item.title}</Text>
                  <Text style={styles.meta}>
                    {formatDate(item.starts_at)} {item.city ? `- ${item.city}` : ''}
                  </Text>
                  {from !== null ? <Text style={styles.price}>From {from.toLocaleString('en-US')} {item.ticket_categories[0].currency}</Text> : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.white, borderRadius: radius, borderColor: colors.line, borderWidth: 1, padding: 14, marginBottom: 10 },
  title: { color: colors.brown, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.muted, marginTop: 2 },
  price: { color: colors.gold, fontWeight: '800', marginTop: 6 },
});
