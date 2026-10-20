import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { CardPreview } from '../../components/EventCard';
import { Loader } from '../../components/Loader';
import { Button, Chip, EmptyState, Screen, SectionTitle } from '../../components/ui';
import { colors } from '../../components/theme';
import { api } from '../../hooks/api';
import { CARD_KINDS, type CardKind } from '../../hooks/eventEngine';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useCards, useMyEvents, useTemplateVars } from '../../hooks/useEvents';

export default function Cards() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const events = useMyEvents(userId);
  const cards = useCards(userId);
  const [eventId, setEventId] = useState<string | undefined>();
  const [kind, setKind] = useState<CardKind>('invitation');
  const [sending, setSending] = useState<'sms' | 'whatsapp' | null>(null);

  useEffect(() => {
    if (!eventId && events.data?.length) setEventId(events.data[0].id);
  }, [events.data, eventId]);

  const vars = useTemplateVars(eventId);
  const statusByKind = useMemo(() => {
    const map: Record<string, string> = {};
    (cards.data ?? []).filter((c) => c.event_id === eventId).forEach((c) => (map[c.kind] = c.status));
    return map;
  }, [cards.data, eventId]);

  async function send(channel: 'sms' | 'whatsapp') {
    if (!eventId) return;
    setSending(channel);
    try {
      const res = await api<{ sent: number; failed_count: number }>('/api/messages/send', {
        method: 'POST',
        auth: true,
        body: { event_id: eventId, kind, channel },
      });
      Alert.alert('Delivery finished', `${res.sent} sent, ${res.failed_count} failed.`);
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSending(null);
    }
  }

  if (events.isLoading) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Loader />
        </View>
      </Screen>
    );
  }

  if (!events.data?.length) {
    return (
      <Screen>
        <EmptyState variant="card" title="No cards yet" message="Create an event and all five card types are generated for you." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={{ color: colors.brown, fontSize: 28, fontWeight: '800' }}>Cards</Text>
      <SectionTitle>Event</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {events.data.map((e) => (
          <Chip key={e.id} label={e.honoree_names || e.title} active={e.id === eventId} onPress={() => setEventId(e.id)} />
        ))}
      </ScrollView>
      <SectionTitle>Card type</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {CARD_KINDS.map((k) => (
          <Chip key={k.key} label={k.label} active={k.key === kind} onPress={() => setKind(k.key)} />
        ))}
      </View>
      {vars.isLoading || !vars.data ? (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Loader />
        </View>
      ) : (
        <>
          <CardPreview kind={kind} vars={vars.data} />
          <Text style={{ color: colors.muted, marginBottom: 14 }}>Status: {statusByKind[kind] ?? 'draft'} - uses your event details, nothing to retype.</Text>
          <Button title="Send via WhatsApp" loading={sending === 'whatsapp'} onPress={() => void send('whatsapp')} />
          <Button title="Send via SMS" variant="brown" loading={sending === 'sms'} onPress={() => void send('sms')} style={{ marginTop: 10 }} />
        </>
      )}
    </Screen>
  );
}
