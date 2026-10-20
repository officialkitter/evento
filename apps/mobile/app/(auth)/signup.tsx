import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Hero } from '../../components/Illustrations';
import { colors } from '../../components/theme';
import { Button, Field, Screen } from '../../components/ui';
import { getSupabaseClient } from '../../hooks/supabase';

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match');
      return;
    }
    setLoading(true);
    const { data, error } = await getSupabaseClient().auth.signUp({ email: address, password });
    setLoading(false);
    if (error) {
      Alert.alert('Could not create account', error.message);
      return;
    }
    // An existing confirmed email returns a user with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      Alert.alert('Account exists', 'This email is already registered. Please log in instead.');
      return;
    }
    // With email confirmation on, no session is returned and an OTP was emailed.
    if (!data.session) router.push({ pathname: '/(auth)/verify', params: { email: address } });
  }

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Hero variant="card" title="Join Evento" subtitle="Create your account in a minute." height={200} />
          <Animated.View entering={FadeInDown.springify()} style={styles.form}>
            <Text style={styles.h1}>Create account</Text>
            <Text style={styles.sub}>We will email you a verification code.</Text>
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
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button title="Sign up" onPress={submit} loading={loading} />
            <View style={styles.switchRow}>
              <Text style={styles.sub}>Already have an account?</Text>
              <Text accessibilityRole="link" style={styles.link} onPress={() => router.replace('/(auth)/login')}> Log in</Text>
            </View>
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
