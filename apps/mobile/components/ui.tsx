import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loader } from './Loader';
import { Illustration, type IllustrationVariant } from './Illustrations';
import { colors, radius } from './theme';

export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  padded?: boolean;
}) {
  const inner = padded ? styles.padded : undefined;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[inner, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  variant = 'gold',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'gold' | 'brown' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = variant === 'gold' ? colors.gold : variant === 'brown' ? colors.brown : 'transparent';
  const fg = variant === 'gold' ? colors.brown : variant === 'brown' ? colors.gold : colors.brown;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, borderColor: variant === 'ghost' ? colors.line : bg },
        style,
      ]}
    >
      {loading ? <Loader size={22} color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? colors.brown : colors.white, borderColor: active ? colors.brown : colors.line }]}
    >
      <Text style={{ color: active ? colors.gold : colors.ink, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({ variant = 'empty', title, message }: { variant?: IllustrationVariant; title: string; message?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <Illustration variant={variant} height={140} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  padded: { padding: 20 },
  button: { minHeight: 52, borderRadius: radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderWidth: 1 },
  buttonText: { fontSize: 16, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  section: { color: colors.brown, fontSize: 18, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emptyArt: { width: '100%', borderRadius: radius, overflow: 'hidden', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.brown },
  emptyMsg: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6 },
});
