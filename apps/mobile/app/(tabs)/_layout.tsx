import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { colors } from '../../components/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, inactive: IconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brown,
        tabBarInactiveTintColor: '#A99B8D',
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="events" options={{ title: 'My Events', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="cards" options={{ title: 'Cards', tabBarIcon: icon('card', 'card-outline') }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: icon('notifications', 'notifications-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
