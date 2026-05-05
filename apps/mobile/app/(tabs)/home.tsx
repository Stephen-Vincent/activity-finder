/**
 * Home tab.
 *
 * Sections (MVP — none of this is built yet):
 *  - Greeting + today's weather summary for the user's home location.
 *  - "Today" carousel: 6-10 venues that match weather + open now + ages of children.
 *  - "This weekend" carousel: events Sat/Sun + family-friendly day trips.
 *  - "School holidays" card: appears when a holiday is within 14 days.
 *  - Recently saved.
 *
 * Pulls from useVenues, useWeather, useChildren, useSchoolTerms hooks.
 *
 * Right now this is a placeholder so we can confirm the auth flow worked
 * end-to-end: it shows the signed-in user's email and offers a sign-out
 * button. The sign-out button will move to the Profile tab once that screen
 * exists — leaving it here for now so we can test on the very first signed-in
 * screen the user sees.
 */

import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/providers/AuthProvider';

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  // Synchronous lock — see the matching comment in sign-in.tsx. Stops a
  // double-tap from firing two signOut calls in the brief window before
  // React re-renders with the disabled state.
  const inFlight = useRef(false);

  async function handleSignOut() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // We don't unset signingOut on success — onAuthStateChange will fire
      // and the root will redirect us off this screen, so leaving the button
      // disabled until then is the right UX.
      inFlight.current = false;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.greeting}>
          {profile?.displayName ? `Hi, ${profile.displayName}` : "You're signed in"}
        </Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        {profile?.homePostcode ? (
          <Text style={styles.email}>{profile.homePostcode}</Text>
        ) : null}
        <Text style={styles.note}>
          The real Home tab — weather, today&apos;s picks, school-holiday card — comes later. This
          stub is just here so we can verify sign-in and sign-out end to end.
        </Text>

        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          style={({ pressed }) => [
            styles.button,
            signingOut && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },
  email: {
    fontSize: 16,
    color: '#444',
    marginTop: 4,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginTop: 16,
  },
  button: {
    marginTop: 32,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 28,
    minWidth: 140,
  },
  buttonDisabled: {
    backgroundColor: '#9aa0a6',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
