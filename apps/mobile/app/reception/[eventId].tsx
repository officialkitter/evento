import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Loader } from '../../components/Loader';
import { colors, statusColor } from '../../components/theme';
import { Button, EmptyState, Screen } from '../../components/ui';
import { useReceptionStore, type ScanResult } from '../../hooks/useReceptionStore';

const RESULT_STATUS: Record<ScanResult['result'], string> = {
  accepted: 'confirmed',
  duplicate: 'partial',
  unknown: 'pending',
  invalid: 'failed',
};
const RESULT_TITLE: Record<ScanResult['result'], string> = {
  accepted: 'Welcome',
  duplicate: 'Already checked in',
  unknown: 'Unverified - queued',
  invalid: 'Invalid code',
};

export default function Reception() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const id = String(eventId);
  const [permission, requestPermission] = useCameraPermissions();
  const { online, queue, roster, last, syncing, syncError, start, scan, sync } = useReceptionStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void start(id).then((u) => {
      if (cancelled) u();
      else unsubscribe = u;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [id, start]);

  async function onScanned({ data }: { data: string }) {
    const res = await scan(data);
    void Haptics.notificationAsync(res.result === 'accepted' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  }

  if (!permission) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Loader />
        </View>
      </Screen>
    );
  }
  if (!permission.granted) {
    return (
      <Screen>
        <EmptyState variant="scan" title="Camera access needed" message="Allow the camera to scan guest and ticket QR codes." />
        <Button title="Allow camera" onPress={() => void requestPermission()} />
      </Screen>
    );
  }

  const total = Object.keys(roster).length;
  const inside = Object.values(roster).filter((r) => r.checkedIn).length;
  const banner = last ? statusColor(RESULT_STATUS[last.result]) : colors.line;

  return (
    <Screen edges={[]} padded={false}>
      <View style={styles.bar}>
        <View style={[styles.pill, { backgroundColor: online ? '#008080' : '#FFB300' }]}>
          <Text style={styles.pillText}>{online ? 'ONLINE' : 'OFFLINE - scans are saved'}</Text>
        </View>
        <Text style={styles.stat}>
          {inside}/{total} in - {queue.length} to sync
        </Text>
      </View>

      <View style={styles.camera}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => void onScanned(r)} />
        <View style={styles.reticle} pointerEvents="none" />
      </View>

      <View style={[styles.result, { backgroundColor: banner }]}>
        {last ? (
          <>
            <Text style={styles.resultTitle}>{RESULT_TITLE[last.result]}</Text>
            {last.name ? <Text style={styles.resultName}>{last.name}</Text> : null}
            {last.detail ? <Text style={styles.resultDetail}>{last.detail}</Text> : null}
          </>
        ) : (
          <Text style={styles.resultDetail}>Point the camera at a QR code</Text>
        )}
      </View>

      <View style={{ padding: 16 }}>
        {syncError ? <Text style={{ color: '#D32F2F', marginBottom: 8 }}>Sync paused: {syncError}</Text> : null}
        <Button title={syncing ? 'Syncing...' : 'Sync now'} variant="brown" onPress={() => void sync()} disabled={!online || syncing} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  stat: { color: colors.brown, fontWeight: '800' },
  camera: { flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 220, height: 220, borderColor: colors.gold, borderWidth: 3, borderRadius: 24 },
  result: { margin: 16, marginBottom: 0, borderRadius: 16, padding: 16, minHeight: 84, justifyContent: 'center' },
  resultTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  resultName: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 2 },
  resultDetail: { color: colors.white, opacity: 0.95, marginTop: 2 },
});
