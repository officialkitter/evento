import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Hero } from '../../components/Illustrations';
import { colors } from '../../components/theme';
import { Button, Chip, Field, Screen } from '../../components/ui';
import { getSupabaseClient } from '../../hooks/supabase';

export default function Login() {
  const router = useRouter();
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const target = value.trim();
    if (channel === 'phone' && !/^\+[1-9]\d{7,14}$/.test(target.replace(/\s/g, ''))) {
      Alert.alert('Check your number', 'Use international format, e.g. +255712345678');
      return;
    }
    if (channel === 'email' && !/^\S+@\S+\.\S+$/.test(target)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    setLoading(true);
    const clean = channel === 'phone' ? target.replace(/\s/g, '') : target;
    const { error } =
      channel === 'phone'
        ? await getSupabaseClient().auth.signInWithOtp({ phone: clean })
        : await getSupabaseClient().auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setLoading(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { channel, target: clean } });
  }

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Hero variant="event" title="Evento" subtitle="Invitations, tickets and check-in. Enter it once." height={240} />
        <Animated.View entering={FadeInDown.springify()} style={styles.form}>
          <Text style={styles.h1}>Sign in or create your account</Text>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <Chip label="Phone" active={channel === 'phone'} onPress={() => setChannel('phone')} />
            <Chip label="Email" active={channel === 'email'} onPress={() => setChannel('email')} />
          </View>
          <Field
            label={channel === 'phone' ? 'Mobile number' : 'Email address'}
            value={value}
            onChangeText={setValue}
            placeholder={channel === 'phone' ? '+255712345678' : 'you@example.com'}
            keyboardType={channel === 'phone' ? 'phone-pad' : 'email-address'}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button title="Send code" onPress={submit} loading={loading} />
          <Button title="Browse public events" variant="ghost" onPress={() => router.push('/ticket')} style={{ marginTop: 12 }} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 24 },
  h1: { color: colors.brown, fontSize: 20, fontWeight: '800' },
});
