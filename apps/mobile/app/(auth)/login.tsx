import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Hero } from '../../components/Illustrations';
import { colors } from '../../components/theme';
import { Button, Field, Screen } from '../../components/ui';
import { getSupabaseClient } from '../../hooks/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    if (!password) {
      Alert.alert('Enter your password');
      return;
    }
    setLoading(true);
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email: address, password });
    setLoading(false);
    if (error) Alert.alert('Could not log in', error.message);
    // On success the auth listener in the root layout redirects to the tabs.
  }

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Hero variant="event" title="Evento" subtitle="Invitations, tickets and check-in. Enter it once." height={240} />
          <Animated.View entering={FadeInDown.springify()} style={styles.form}>
            <Text style={styles.h1}>Welcome back</Text>
            <Text style={styles.sub}>Log in with your email and password.</Text>
            <View style={{ height: 14 }} />
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button title="Log in" onPress={submit} loading={loading} />
            <View style={styles.switchRow}>
              <Text style={styles.sub}>New to Evento?</Text>
              <Text accessibilityRole="link" style={styles.link} onPress={() => router.push('/(auth)/signup')}> Create an account</Text>
            </View>
            <Button title="Browse public events" variant="ghost" onPress={() => router.push('/ticket')} style={{ marginTop: 12 }} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 24 },
  h1: { color: colors.brown, fontSize: 22, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 14, marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  link: { color: colors.brown, fontWeight: '800', fontSize: 14, marginTop: 4 },
});
