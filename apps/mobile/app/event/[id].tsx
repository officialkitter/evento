import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Text, View } from 'react-native';
import { CardPreview } from '../../components/EventCard';
import { Hero } from '../../components/Illustrations';
import { Loader } from '../../components/Loader';
import { StatusBadge } from '../../components/StatusBadge';
import { colors } from '../../components/theme';
import { Button, Card, EmptyState, Screen, SectionTitle } from '../../components/ui';
import { effectiveStatus, formatDate, formatTime } from '../../hooks/eventEngine';
import { getSupabaseClient } from '../../hooks/supabase';
import { useDashboard, usePublishEvent } from '../../hooks/useEvents';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.brown, fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export default function EventDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = String(id);
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error } = useDashboard(eventId);
  const publish = usePublishEvent(eventId);

  // Live check-in counter via Supabase Realtime.
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`checkins:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins', filter: `event_id=eq.${eventId}` }, () => {
        void qc.invalidateQueries({ queryKey: ['dashboard', eventId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, qc]);

  if (isLoading) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Loader />
        </View>
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen>
        <EmptyState title="Could not load this event" message={error instanceof Error ? error.message : 'Please try again.'} />
      </Screen>
    );
  }

  const { event, vars, guests, categories, campaign } = data;
  const status = effectiveStatus(event);
  const rsvpYes = guests.filter((g) => g.rsvp === 'yes').length;

  async function onPublish() {
    try {
      await publish.mutateAsync();
    } catch (e) {
      Alert.alert('Could not publish', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <Screen scroll padded={false} edges={[]}>
      <Hero variant="event" title={vars.headline_names} subtitle={`${formatDate(event.starts_at)} - ${formatTime(event.starts_at)}`} height={190} />
      <View style={{ padding: 20 }}>
        <StatusBadge status={status} />
        {event.status === 'draft' && <Button title="Publish event" onPress={onPublish} loading={publish.isPending} style={{ marginTop: 14 }} />}
        <Button title="Open reception scanner" variant="brown" onPress={() => router.push(`/reception/${eventId}`)} style={{ marginTop: 10 }} />

        <SectionTitle>At a glance</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row' }}>
            <Stat label="GUESTS" value={String(guests.length)} />
            <Stat label="RSVP YES" value={String(rsvpYes)} />
            <Stat label="CHECKED IN" value={String(data.checkedIn)} />
          </View>
        </Card>

        <SectionTitle>Invitation preview</SectionTitle>
        <CardPreview kind="invitation" vars={vars} />

        {event.is_public && (
          <>
            <SectionTitle>Tickets</SectionTitle>
            <Card>
              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                <Stat label="SOLD" value={String(data.ticketsSold)} />
                <Stat label="REVENUE (TZS)" value={data.revenue.toLocaleString('en-US')} />
              </View>
              {categories.map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: colors.brown, fontWeight: '700' }}>{c.name}</Text>
                  <Text style={{ color: colors.muted }}>
                    {Number(c.price).toLocaleString('en-US')} {c.currency} - {c.sold}
                    {c.capacity === null ? '' : `/${c.capacity}`} sold
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {campaign && (
          <>
            <SectionTitle>Contributions</SectionTitle>
            <Card>
              <Text style={{ color: colors.brown, fontWeight: '800' }}>{campaign.title}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                Raised {campaign.raised.toLocaleString('en-US')} {campaign.currency}
                {campaign.target ? ` of ${Number(campaign.target).toLocaleString('en-US')}` : ''}
              </Text>
            </Card>
          </>
        )}

        <SectionTitle>Guest list</SectionTitle>
        {guests.length === 0 ? (
          <EmptyState variant="empty" title="No guests yet" message="Guests you add are used for invitations and reception check-in." />
        ) : (
          guests.slice(0, 50).map((g) => (
            <Card key={g.id} style={{ paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.brown, fontWeight: '700' }}>{g.full_name}</Text>
                  {g.phone ? <Text style={{ color: colors.muted, fontSize: 12 }}>{g.phone}</Text> : null}
                </View>
                <StatusBadge status={g.checked_in_at ? 'checked_in' : g.rsvp === 'yes' ? 'confirmed' : 'pending'} />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
