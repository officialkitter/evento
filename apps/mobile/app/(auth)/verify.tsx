import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Hero } from '../../components/Illustrations';
import { colors } from '../../components/theme';
import { Button, Field, Screen } from '../../components/ui';
import { getSupabaseClient } from '../../hooks/supabase';

export default function Verify() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function confirm() {
    if (!/^\d{6,8}$/.test(code.trim())) {
      Alert.alert('Enter the verification code', 'Use the numeric code from your email.');
      return;
    }
    setLoading(true);
    const { error } = await getSupabaseClient().auth.verifyOtp({ email: String(email), token: code.trim(), type: 'signup' });
    setLoading(false);
    if (error) Alert.alert('Invalid code', error.message);
    // On success the auth listener in the root layout redirects to the tabs.
  }

  async function resend() {
    setResending(true);
    const { error } = await getSupabaseClient().auth.resend({ type: 'signup', email: String(email) });
    setResending(false);
    Alert.alert(error ? 'Could not resend code' : 'Code sent', error ? error.message : 'Check your inbox for a new code.');
  }

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <Hero variant="card" title="Check your email" subtitle={`We sent a code to ${email ?? ''}`} height={200} />
      <View style={{ padding: 24 }}>
        <Text style={styles.hint}>Enter the code to verify your new account.</Text>
        <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} placeholder="123456" />
        <Button title="Verify and continue" onPress={confirm} loading={loading} />
        <Button title="Resend code" variant="ghost" onPress={resend} loading={resending} style={{ marginTop: 12 }} />
        <Button title="Back to sign up" variant="ghost" onPress={() => router.back()} style={{ marginTop: 4 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, marginBottom: 14 },
});
