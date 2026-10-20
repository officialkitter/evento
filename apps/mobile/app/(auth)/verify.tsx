import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Hero } from '../../components/Illustrations';
import { colors } from '../../components/theme';
import { Button, Field, Screen } from '../../components/ui';
import { getSupabaseClient } from '../../hooks/supabase';

export default function Verify() {
  const router = useRouter();
  const { channel, target } = useLocalSearchParams<{ channel: 'phone' | 'email'; target: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    const token = code.trim();
    const { error } =
      channel === 'phone'
        ? await getSupabaseClient().auth.verifyOtp({ phone: String(target), token, type: 'sms' })
        : await getSupabaseClient().auth.verifyOtp({ email: String(target), token, type: 'email' });
    setLoading(false);
    if (error) Alert.alert('Invalid code', error.message);
    // On success the auth listener in the root layout redirects to the tabs.
  }

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <Hero variant="card" title="Check your messages" subtitle={`We sent a code to ${target ?? ''}`} height={200} />
      <View style={{ padding: 24 }}>
        <Text style={styles.hint}>Enter the 6-digit code to continue.</Text>
        <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
        <Button title="Verify" onPress={confirm} loading={loading} />
        <Button title="Use a different number or email" variant="ghost" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, marginBottom: 14 },
});
