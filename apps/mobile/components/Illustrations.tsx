import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from './theme';

export type IllustrationVariant = 'event' | 'ticket' | 'card' | 'scan' | 'empty' | 'bell' | 'profile';

function Glyph({ variant }: { variant: IllustrationVariant }) {
  const gold = colors.gold;
  switch (variant) {
    case 'ticket':
      return (
        <G>
          <Rect x={95} y={55} width={130} height={70} rx={10} fill={gold} />
          <Circle cx={95} cy={90} r={9} fill={colors.brown} />
          <Circle cx={225} cy={90} r={9} fill={colors.brown} />
          <Path d="M160 62 V118" stroke={colors.brown} strokeWidth={2} strokeDasharray="5 5" />
          <Rect x={172} y={74} width={40} height={32} rx={4} fill={colors.brown} opacity={0.85} />
        </G>
      );
    case 'card':
      return (
        <G>
          <Rect x={100} y={58} width={120} height={78} rx={8} fill={gold} />
          <Path d="M100 66 L160 104 L220 66" stroke={colors.brown} strokeWidth={3} fill="none" />
          <Circle cx={160} cy={104} r={8} fill={colors.brown} />
        </G>
      );
    case 'scan':
      return (
        <G stroke={gold} strokeWidth={5} fill="none" strokeLinecap="round">
          <Path d="M110 72 V58 H124" />
          <Path d="M196 58 H210 V72" />
          <Path d="M110 108 V122 H124" />
          <Path d="M196 122 H210 V108" />
          <Path d="M122 90 H198" stroke={colors.goldSoft} />
        </G>
      );
    case 'bell':
      return (
        <G fill={gold}>
          <Path d="M160 48 c-22 0 -36 16 -36 38 v22 l-10 14 h92 l-10 -14 v-22 c0 -22 -14 -38 -36 -38 z" />
          <Circle cx={160} cy={134} r={8} />
        </G>
      );
    case 'profile':
      return (
        <G fill={gold}>
          <Circle cx={160} cy={75} r={24} />
          <Path d="M110 138 c0 -28 22 -42 50 -42 s50 14 50 42 z" />
        </G>
      );
    case 'empty':
      return (
        <G>
          <Rect x={110} y={52} width={100} height={84} rx={10} fill="none" stroke={gold} strokeWidth={4} />
          <Path d="M110 76 H210" stroke={gold} strokeWidth={4} />
          <Circle cx={138} cy={102} r={5} fill={gold} />
          <Circle cx={160} cy={102} r={5} fill={gold} />
          <Circle cx={182} cy={102} r={5} fill={gold} opacity={0.4} />
          <Circle cx={138} cy={120} r={5} fill={gold} opacity={0.4} />
        </G>
      );
    default:
      return (
        <G fill="none" stroke={gold} strokeWidth={5}>
          <Path d="M110 138 V90 a50 50 0 0 1 100 0 V138" />
          <Circle cx={145} cy={104} r={14} />
          <Circle cx={175} cy={104} r={14} />
        </G>
      );
  }
}

export function Illustration({ variant = 'event', height = 180 }: { variant?: IllustrationVariant; height?: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.brown} />
          <Stop offset="1" stopColor={colors.brownSoft} />
        </LinearGradient>
      </Defs>
      <Rect width={320} height={180} fill="url(#bg)" />
      <Circle cx={40} cy={30} r={46} fill={colors.gold} opacity={0.12} />
      <Circle cx={290} cy={160} r={64} fill={colors.gold} opacity={0.1} />
      <Circle cx={250} cy={30} r={4} fill={colors.gold} />
      <Circle cx={60} cy={150} r={3} fill={colors.goldSoft} />
      <Circle cx={280} cy={80} r={3} fill={colors.goldSoft} />
      <Circle cx={30} cy={90} r={2.5} fill={colors.gold} />
      <Glyph variant={variant} />
    </Svg>
  );
}

export function Hero({
  variant = 'event',
  title,
  subtitle,
  height = 180,
}: {
  variant?: IllustrationVariant;
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      <View style={StyleSheet.absoluteFill}>
        <Illustration variant={variant} height={height} />
      </View>
      {(title || subtitle) && (
        <View style={styles.copy}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { position: 'absolute', left: 20, right: 20, bottom: 16 },
  title: { color: colors.gold, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.canvas, fontSize: 14, marginTop: 2, opacity: 0.9 },
});
