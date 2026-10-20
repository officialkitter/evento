import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Loader } from './Loader';
import { StatusBadge } from './StatusBadge';
import { colors } from './theme';

const CORNER = 28;

export function QRFrame({ value, size = 220, status, caption }: { value?: string; size?: number; status?: string; caption?: string }) {
  const box = size + 40;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.frame, { width: box, height: box }]}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        {value ? <QRCode value={value} size={size} color={colors.brown} backgroundColor={colors.canvas} /> : <Loader />}
      </View>
      {status ? (
        <View style={{ marginTop: 14 }}>
          <StatusBadge status={status} />
        </View>
      ) : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const corner = { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.gold } as const;
const styles = StyleSheet.create({
  frame: { backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  corner,
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 20 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 20 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 20 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 20 },
  caption: { marginTop: 10, color: colors.muted, fontSize: 13, textAlign: 'center' },
});
