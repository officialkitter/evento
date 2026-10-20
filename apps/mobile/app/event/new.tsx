import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { colors } from '../../components/theme';
import { Button, Chip, Field, Screen, SectionTitle } from '../../components/ui';
import { EVENT_TYPES, TICKET_NAMES, buildEventPayload, type EventForm, type TicketName } from '../../hooks/eventEngine';
import { useCreateEvent } from '../../hooks/useEvents';

const today = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

export default function NewEvent() {
  const router = useRouter();
  const create = useCreateEvent();
  const [form, setForm] = useState<EventForm>({
    type: 'wedding',
    title: '',
    honoree_names: '',
    host_name: '',
    date: defaultDate,
    time: '16:00',
    venue_name: '',
    city: '',
    dress_code: '',
    rsvp_phone: '',
    is_public: false,
    ticketPrice: '',
    ticketNames: ['Regular'],
    contributions: false,
    guestsText: '',
  });
  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  function toggleTicket(name: TicketName) {
    set('ticketNames', form.ticketNames.includes(name) ? form.ticketNames.filter((n) => n !== name) : [...form.ticketNames, name]);
  }

  async function submit() {
    const built = buildEventPayload(form);
    if ('error' in built) {
      Alert.alert('Almost there', built.error);
      return;
    }
    try {
      const id = await create.mutateAsync(built.payload);
      router.replace(`/event/${id}`);
    } catch (e) {
      Alert.alert('Could not create event', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <Screen scroll edges={[]}>
      <Text style={{ color: colors.muted, marginBottom: 6 }}>Enter the details once - invitations, tickets and your guest list are generated from them.</Text>
      <SectionTitle>Type</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {EVENT_TYPES.map((t) => (
          <Chip key={t.key} label={t.label} active={form.type === t.key} onPress={() => set('type', t.key)} />
        ))}
      </View>

      <SectionTitle>Details</SectionTitle>
      <Field label="Event title" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Amina & Joseph's Wedding" />
      <Field label="Names on the card (optional)" value={form.honoree_names} onChangeText={(v) => set('honoree_names', v)} placeholder="Amina & Joseph" />
      <Field label="Hosted by (optional)" value={form.host_name} onChangeText={(v) => set('host_name', v)} />
      <Field label="Date (YYYY-MM-DD)" value={form.date} onChangeText={(v) => set('date', v)} keyboardType="numbers-and-punctuation" />
      <Field label="Start time (HH:MM, 24h)" value={form.time} onChangeText={(v) => set('time', v)} keyboardType="numbers-and-punctuation" />
      <Field label="Venue" value={form.venue_name} onChangeText={(v) => set('venue_name', v)} />
      <Field label="City" value={form.city} onChangeText={(v) => set('city', v)} />
      <Field label="Dress code (optional)" value={form.dress_code} onChangeText={(v) => set('dress_code', v)} />
      <Field label="RSVP phone (optional)" value={form.rsvp_phone} onChangeText={(v) => set('rsvp_phone', v)} keyboardType="phone-pad" />

      <SectionTitle>Tickets and contributions</SectionTitle>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ color: colors.brown, fontWeight: '700' }}>Sell public tickets</Text>
        <Switch value={form.is_public} onValueChange={(v) => set('is_public', v)} trackColor={{ true: colors.gold, false: colors.line }} thumbColor={colors.brown} />
      </View>
      {form.is_public && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TICKET_NAMES.map((n) => (
              <Chip key={n} label={n} active={form.ticketNames.includes(n)} onPress={() => toggleTicket(n)} />
            ))}
          </View>
          <Field label="Price per ticket (TZS)" value={form.ticketPrice} onChangeText={(v) => set('ticketPrice', v)} keyboardType="number-pad" placeholder="50000" />
        </>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ color: colors.brown, fontWeight: '700' }}>Collect contributions</Text>
        <Switch value={form.contributions} onValueChange={(v) => set('contributions', v)} trackColor={{ true: colors.gold, false: colors.line }} thumbColor={colors.brown} />
      </View>

      <SectionTitle>Guest list</SectionTitle>
      <Field
        label="One guest per line: Name, +phone"
        value={form.guestsText}
        onChangeText={(v) => set('guestsText', v)}
        multiline
        style={{ minHeight: 110, textAlignVertical: 'top' }}
        placeholder={'Neema Joseph, +255712345678\nJuma Ali'}
      />

      <Button title="Create event" onPress={submit} loading={create.isPending} style={{ marginTop: 8 }} />
    </Screen>
  );
}
