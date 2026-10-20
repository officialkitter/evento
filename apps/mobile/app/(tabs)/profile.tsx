import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Hero } from '../../components/Illustrations';
import { colors } from '../../components/theme';
import { Button, Card, Screen } from '../../components/ui';
import { useAuthStore } from '../../hooks/useAuthStore';

export default function Profile() {
  const router = useRouter();
  const user = useAuthStore((s) => s.session?.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <Screen scroll padded={false}>
      <Hero variant="profile" title="Your profile" height={180} />
      <View style={{ padding: 20 }}>
        <Card>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>Signed in as</Text>
          <Text style={{ color: colors.brown, fontSize: 18, fontWeight: '800', marginTop: 4 }}>{user?.email ?? (user?.phone ? `+${user.phone.replace(/^\+/, '')}` : '-')}</Text>
        </Card>
        <Button title="Find public tickets" variant="brown" onPress={() => router.push('/ticket')} />
        <Button title="Sign out" variant="ghost" onPress={() => void signOut()} style={{ marginTop: 12 }} />
      </View>
    </Screen>
  );
}
