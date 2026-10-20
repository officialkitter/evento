import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Hero } from '../../../components/Illustrations';
import { QRFrame } from '../../../components/QRFrame';
import { colors } from '../../../components/theme';
import { EmptyState, Screen } from '../../../components/ui';
import { api } from '../../../hooks/api';
import { formatDate, formatTime } from '../../../hooks/eventEngine';

type TicketResponse = {
  ticket: {
    qr_token: string;
    status: string;
    admits: number;
    holder_name: string;
    ticket_categories: { name: string } | null;
    events: { title: string; honoree_names: string | null; starts_at: string; venue_name: string | null; city: string | null } | null;
  };
};

export default function TicketView() {
  const { code } = useLocalSearchParams<{ code: string }>();
  // Refresh so the badge flips to "checked in" after the gate scans it.
  const { data, error, isLoading } = useQuery({
    queryKey: ['ticket', code],
    queryFn: () => api<TicketResponse>(`/api/tickets/${code}`),
    refetchInterval: 5000,
  });
  const t = data?.ticket;

  return (
    <Screen scroll padded={false} edges={[]}>
      <Hero variant="ticket" title={t?.events?.honoree_names || t?.events?.title || 'Your ticket'} subtitle={t?.ticket_categories?.name} height={160} />
      <View style={{ padding: 24, alignItems: 'center' }}>
        {error ? (
          <EmptyState title="Ticket not found" message={error instanceof Error ? error.message : undefined} />
        ) : (
          <>
            <QRFrame value={isLoading || !t ? undefined : `EVC1:${t.qr_token}`} status={t?.status} caption={t ? `Admits ${t.admits} - ${t.holder_name}` : undefined} />
            {t?.events && (
              <Text style={{ color: colors.brown, marginTop: 20, textAlign: 'center', fontWeight: '700' }}>
                {formatDate(t.events.starts_at)} - {formatTime(t.events.starts_at)}
                {'\n'}
                {[t.events.venue_name, t.events.city].filter(Boolean).join(', ')}
              </Text>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
