import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { effectiveStatus, formatDate, formatTime, type CardKind, type EventRow, type TemplateVars, composeCard } from '../hooks/eventEngine';
import { StatusBadge } from './StatusBadge';
import { colors, radius } from './theme';

export function EventCard({ event, onPress, index = 0 }: { event: EventRow; onPress: () => void; index?: number }) {
  const date = new Date(event.starts_at);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).springify()}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${event.honoree_names || event.title}`}
        style={({ pressed }) => [styles.wrap, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
      >
        <View style={styles.card}>
          <View style={styles.dateTile}>
            <Text style={styles.dateMonth}>{date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</Text>
            <Text style={styles.dateDay}>{date.toLocaleDateString('en-GB', { day: '2-digit' })}</Text>
          </View>

          <View style={styles.details}>
            <View style={styles.cardTop}>
              <Text style={styles.type}>{event.type.replace('_', ' ')}</Text>
              <StatusBadge status={effectiveStatus(event)} />
            </View>
            <Text style={styles.title} numberOfLines={1}>{event.honoree_names || event.title}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text style={styles.meta}>{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</Text>
            </View>
            {event.venue_name ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.muted} />
                <Text style={styles.meta} numberOfLines={1}>{[event.venue_name, event.city].filter(Boolean).join(', ')}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function CardPreview({ kind, vars }: { kind: CardKind; vars: TemplateVars }) {
  const copy = composeCard(kind, vars);
  return (
    <View style={styles.preview}>
      <View style={styles.previewInner}>
        <Text style={styles.eyebrow}>{copy.eyebrow.toUpperCase()}</Text>
        <Text style={styles.previewTitle}>{copy.headline}</Text>
        {copy.lines.map((l) => (
          <Text key={l} style={styles.previewLine}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, borderRadius: radius, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  dateTile: { width: 54, height: 62, borderRadius: 14, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  dateMonth: { color: colors.brownSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  dateDay: { color: colors.brown, fontSize: 22, fontWeight: '800', marginTop: 1 },
  details: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 },
  type: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.brown, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  meta: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  preview: { backgroundColor: colors.brown, borderRadius: radius, padding: 10, marginBottom: 10 },
  previewInner: { borderColor: colors.gold, borderWidth: 1, borderRadius: 10, padding: 18, alignItems: 'center' },
  eyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  previewTitle: { color: colors.canvas, fontSize: 24, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  previewLine: { color: colors.goldSoft, fontSize: 13, textAlign: 'center', marginTop: 2 },
});
