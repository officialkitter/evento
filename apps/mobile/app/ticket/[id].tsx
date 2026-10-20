import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Hero } from '../../components/Illustrations';
import { Loader } from '../../components/Loader';
import { StatusBadge } from '../../components/StatusBadge';
import { colors } from '../../components/theme';
import { Button, Card, EmptyState, Field, Screen, SectionTitle } from '../../components/ui';
import { api } from '../../hooks/api';
import { formatDate, formatTime } from '../../hooks/eventEngine';

type Category = { id: string; name: string; price: number; currency: string; available: number | null };
type PublicEvent = { id: string; title: string; honoree_names: string | null; starts_at: string; venue_name: string | null; city: string | null; ticket_categories: Category[] };
type OrderResponse = { order: { id: string; status: string; amount_due: number; currency: string }; tickets: { qr_token: string; status: string }[] };

export default function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const event = useQuery({ queryKey: ['public-event', id], queryFn: () => api<{ event: PublicEvent }>(`/api/public/events/${id}`) });

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Poll the order until the mobile money webhook marks it paid, failed or expired.
  const order = useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: () => api<OrderResponse>(`/api/orders/${orderId}?phone=${encodeURIComponent(phone.replace(/[\s-]/g, ''))}`),
    refetchInterval: (query) => {
      const s = query.state.data?.order.status;
      return s === 'paid' || s === 'failed' || s === 'expired' ? false : 3000;
    },
  });

  const ev = event.data?.event;
  const selected = ev?.ticket_categories.find((c) => c.id === categoryId);

  async function pay() {
    if (!selected) {
      Alert.alert('Choose a ticket type');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ order_id: string }>('/api/tickets/checkout', {
        method: 'POST',
        body: { category_id: selected.id, buyer_name: name, buyer_phone: phone, quantity },
      });
      setOrderId(res.order_id);
    } catch (e) {
      Alert.alert('Checkout failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (event.isLoading) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Loader />
        </View>
      </Screen>
    );
  }
  if (!ev) {
    return (
      <Screen>
        <EmptyState title="Event not available" message="It may no longer be on sale." />
      </Screen>
    );
  }

  if (orderId) {
    const status = order.data?.order.status ?? 'pending';
    return (
      <Screen scroll padded={false} edges={[]}>
        <Hero variant="ticket" title={status === 'paid' ? 'Payment confirmed' : status === 'pending' ? 'Approve the payment on your phone' : 'Payment not completed'} height={170} />
        <View style={{ padding: 20, alignItems: 'flex-start' }}>
          <StatusBadge status={status} />
          {status === 'pending' && (
            <View style={{ alignItems: 'center', alignSelf: 'center', marginTop: 24 }}>
              <Loader size={56} />
              <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center' }}>Waiting for your mobile money confirmation...</Text>
            </View>
          )}
          {order.data?.tickets.map((t, i) => (
            <Card key={t.qr_token} style={{ alignSelf: 'stretch', marginTop: 14 }}>
              <Text style={{ color: colors.brown, fontWeight: '800', marginBottom: 8 }}>Ticket {i + 1}</Text>
              <Button title="Show QR" onPress={() => router.push(`/ticket/view/${t.qr_token}`)} />
            </Card>
          ))}
          {(status === 'failed' || status === 'expired') && <Button title="Try again" onPress={() => setOrderId(null)} style={{ marginTop: 20, alignSelf: 'stretch' }} />}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={[]}>
      <Hero variant="event" title={ev.honoree_names || ev.title} subtitle={`${formatDate(ev.starts_at)} - ${formatTime(ev.starts_at)}${ev.city ? ` - ${ev.city}` : ''}`} height={180} />
      <View style={{ padding: 20 }}>
        <SectionTitle>Choose tickets</SectionTitle>
        {ev.ticket_categories.map((c) => {
          const soldOut = c.available !== null && c.available <= 0;
          const active = c.id === categoryId;
          return (
            <Pressable
              key={c.id}
              disabled={soldOut}
              onPress={() => setCategoryId(c.id)}
              style={{ backgroundColor: active ? colors.brown : colors.white, borderColor: active ? colors.gold : colors.line, borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 10, opacity: soldOut ? 0.5 : 1 }}
            >
              <Text style={{ color: active ? colors.gold : colors.brown, fontWeight: '800', fontSize: 16 }}>{c.name}</Text>
              <Text style={{ color: active ? colors.canvas : colors.muted }}>
                {Number(c.price).toLocaleString('en-US')} {c.currency}
                {soldOut ? ' - SOLD OUT' : c.available !== null ? ` - ${c.available} left` : ''}
              </Text>
            </Pressable>
          );
        })}
        {ev.ticket_categories.length === 0 && <EmptyState variant="ticket" title="No tickets on sale yet" />}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
          <Text style={{ color: colors.brown, fontWeight: '700', flex: 1 }}>Quantity</Text>
          <Button title="-" variant="ghost" onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={{ minWidth: 52 }} />
          <Text style={{ width: 40, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.brown }}>{quantity}</Text>
          <Button title="+" variant="ghost" onPress={() => setQuantity((q) => Math.min(20, q + 1))} style={{ minWidth: 52 }} />
        </View>

        <Field label="Your name" value={name} onChangeText={setName} />
        <Field label="Mobile money number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+255712345678" />
        {selected && <Text style={{ color: colors.brown, fontWeight: '800', marginBottom: 10 }}>Total: {(Number(selected.price) * quantity).toLocaleString('en-US')} {selected.currency}</Text>}
        <Button title="Pay with mobile money" onPress={pay} loading={submitting} disabled={!selected} />
      </View>
    </Screen>
  );
}
