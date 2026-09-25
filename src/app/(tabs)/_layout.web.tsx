// Web is only used for design previews. It mirrors the native iOS tab bar at the bottom.
import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

const TABS = [
  { name: 'index', title: 'Today', icon: 'radio_button_checked' },
  { name: 'plan', title: 'Plan', icon: 'swap_horiz' },
  { name: 'coach', title: 'Coach', icon: 'chat_bubble' },
  { name: 'recovery', title: 'Recovery', icon: 'favorite' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: { fontFamily: Fonts.semi, fontSize: 11 },
        tabBarStyle: { backgroundColor: 'rgba(19,21,25,0.96)', borderTopColor: Colors.border, height: 64, paddingTop: 6 },
        sceneStyle: { backgroundColor: Colors.bg },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color }) => <Icon name={t.icon} android={t.icon} size={22} color={String(color)} /> }}
        />
      ))}
    </Tabs>
  );
}
