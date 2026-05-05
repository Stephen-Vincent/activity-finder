/**
 * Bottom tab layout for the signed-in experience.
 *
 * Tabs (MVP):
 *  - Home: weather + child-aware "today" picks, school-holiday hub, recently saved.
 *  - Discover: map + list with filters (the big one).
 *  - Plans: saved baskets of activities for planned days.
 *  - Profile: children, settings, premium status, support.
 *
 * Right now this is intentionally bare — no icons, default chrome. Once we
 * pick an icon set (lucide, expo's vector-icons, etc.) we'll wire those in
 * via `tabBarIcon`. For now the goal is just "the routes exist and are
 * reachable so we can verify the auth round-trip."
 */

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="plans" options={{ title: 'Plans' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
