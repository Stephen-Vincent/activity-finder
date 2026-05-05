/**
 * Profile tab.
 *
 * Sections (this build):
 *   - About you      → display name (inline edit), email (read-only with
 *                      "Change email — coming soon"), marketing toggle
 *                      (saves immediately on flip).
 *   - Where you are  → country + postcode, inline edit with re-geocoding.
 *   - Your kids      → list of children (rename / change DOB / remove inline)
 *                      + Add a child button.
 *   - Account        → sign out, plus a "Delete account" placeholder.
 *
 * Sections deferred (future work — see DESIGN.md §10):
 *   - Avatar
 *   - Preferences (currency display, distance unit, notification settings)
 *   - Premium (status + Stripe portal link)
 *   - Venue owner (if the user owns one or more venues)
 *   - Legal links (privacy, terms, contact)
 *
 * The screen is broken into per-section sub-components below; each owns its
 * own edit state. Saving funnels through `updateProfile` (from AuthProvider)
 * and the `useChildren` hook's mutations, both of which refresh their cached
 * state on success.
 *
 * The reusable bits — Section card, country choice card, DOB inputs, child
 * row, add-child form — live under apps/mobile/components/* so onboarding
 * can share them without duplication.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/useChildren';
import { Section } from '@/components/Section';
import { CountryChoice } from '@/components/forms/CountryChoice';
import { ChildRow } from '@/components/children/ChildRow';
import { ChildAddForm } from '@/components/children/ChildAddForm';
import { UseLocationButton, type UseLocationResult } from '@/components/forms/UseLocationButton';
import { geocode, MapboxNotConfiguredError, type GeocodeResult } from '@/lib/mapbox';
import type { Child, CountryCode } from '@/types/domain';

const OFF_ISLAND_TITLE = 'We only cover Ireland for now';
const OFF_ISLAND_BODY =
  "Activity Finder is currently set up for Northern Ireland and the Republic of Ireland. We're hoping to expand later — for now you can still enter a postcode or Eircode manually if you'd like to browse activities in those areas.";

export default function ProfileScreen() {
  const { user, profile } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.greeting}>{profile?.displayName ?? user?.email ?? 'You'}</Text>
            {user?.email ? <Text style={styles.subtle}>{user.email}</Text> : null}
          </View>

          <AboutYouSection />
          <WhereYouAreSection />
          <YourKidsSection />
          <AccountSection />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- About you -------------------------------------------------------------

function AboutYouSection() {
  const { user, profile, updateProfile } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditName() {
    setDraftName(profile?.displayName ?? '');
    setError(null);
    setEditingName(true);
  }

  async function saveName() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    setSavingName(true);
    const { error: err } = await updateProfile({ display_name: trimmed });
    setSavingName(false);
    if (err) {
      setError(err);
      return;
    }
    setEditingName(false);
    setError(null);
  }

  async function toggleMarketing(next: boolean) {
    setSavingMarketing(true);
    const { error: err } = await updateProfile({ marketing_opt_in: next });
    setSavingMarketing(false);
    if (err) Alert.alert('Could not save', err);
  }

  return (
    <Section title="About you">
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Name</Text>
          {editingName ? (
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!savingName}
              style={styles.input}
            />
          ) : (
            <Text style={styles.fieldValue}>{profile?.displayName ?? '—'}</Text>
          )}
        </View>
        {editingName ? (
          <View style={styles.rowButtons}>
            <Pressable
              onPress={saveName}
              disabled={savingName}
              style={[styles.linkButton, savingName && { opacity: 0.5 }]}
            >
              {savingName ? <ActivityIndicator /> : <Text style={styles.linkButtonText}>Save</Text>}
            </Pressable>
            <Pressable onPress={() => setEditingName(false)} disabled={savingName}>
              <Text style={[styles.linkButtonMuted, savingName && { opacity: 0.5 }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={startEditName} hitSlop={8}>
            <Text style={styles.linkButtonText}>Edit</Text>
          </Pressable>
        )}
      </View>
      {error && editingName ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.row, styles.rowDivider]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.fieldValue}>{user?.email ?? '—'}</Text>
          <Text style={styles.comingSoon}>Change email — coming soon</Text>
        </View>
      </View>

      <View style={[styles.row, styles.rowDivider]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.fieldLabel}>Occasional emails</Text>
          <Text style={styles.fieldValue}>
            New features and seasonal ideas. You can change this any time.
          </Text>
        </View>
        {savingMarketing ? (
          <ActivityIndicator />
        ) : (
          <Switch value={profile?.marketingOptIn ?? false} onValueChange={toggleMarketing} />
        )}
      </View>
    </Section>
  );
}

// ---- Where you are ---------------------------------------------------------

function WhereYouAreSection() {
  const { profile, updateProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [draftCountry, setDraftCountry] = useState<CountryCode | null>(null);
  const [draftPostcode, setDraftPostcode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraftCountry(profile?.countryCode ?? null);
    setDraftPostcode(profile?.homePostcode ?? '');
    setResult(null);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function checkPostcode() {
    if (!draftCountry) {
      setError('Pick a country first.');
      return;
    }
    if (!draftPostcode.trim()) {
      setError('Enter a postcode or Eircode.');
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const r = await geocode(draftPostcode, draftCountry);
      if (!r) {
        setError('We couldn’t find that postcode. Double-check the spelling?');
        setResult(null);
      } else {
        setResult(r);
      }
    } catch (e) {
      if (e instanceof MapboxNotConfiguredError) {
        setError('Mapbox token is missing. Check apps/mobile/.env.');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
      setResult(null);
    } finally {
      setChecking(false);
    }
  }

  async function save() {
    if (!draftCountry || !result) return;
    setSaving(true);
    const { error: err } = await updateProfile({
      country_code: draftCountry,
      home_postcode: draftPostcode.trim(),
      preferred_currency: draftCountry === 'GB-NIR' ? 'GBP' : 'EUR',
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setEditing(false);
    setError(null);
    setResult(null);
  }

  const countryLabel =
    profile?.countryCode === 'GB-NIR'
      ? 'Northern Ireland'
      : profile?.countryCode === 'IE'
        ? 'Republic of Ireland'
        : '—';

  return (
    <Section title="Where you are">
      {!editing ? (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Country</Text>
            <Text style={styles.fieldValue}>{countryLabel}</Text>
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Postcode</Text>
            <Text style={styles.fieldValue}>{profile?.homePostcode ?? '—'}</Text>
          </View>
          <Pressable onPress={startEdit} hitSlop={8}>
            <Text style={styles.linkButtonText}>Edit</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingVertical: 8 }}>
          <UseLocationButton
            onResult={(r: UseLocationResult) => {
              setDraftCountry(r.country);
              setDraftPostcode(r.postcode);
              setResult({
                lng: r.lng,
                lat: r.lat,
                placeName: r.placeName,
                featureType: 'postcode',
              });
              setError(null);
            }}
            onOffIsland={() => Alert.alert(OFF_ISLAND_TITLE, OFF_ISLAND_BODY, [{ text: 'OK' }])}
            onError={(msg) => setError(msg)}
          />
          <Text style={styles.dividerLabel}>Or enter manually</Text>

          <Text style={styles.fieldLabel}>Country</Text>
          <CountryChoice
            label="Northern Ireland"
            sub="Postcodes like BT1 1AA · prices in £"
            selected={draftCountry === 'GB-NIR'}
            onPress={() => {
              setDraftCountry('GB-NIR');
              setResult(null);
            }}
          />
          <CountryChoice
            label="Republic of Ireland"
            sub="Eircodes like D02 X285 · prices in €"
            selected={draftCountry === 'IE'}
            onPress={() => {
              setDraftCountry('IE');
              setResult(null);
            }}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            {draftCountry === 'IE' ? 'Eircode' : 'Postcode'}
          </Text>
          <TextInput
            value={draftPostcode}
            onChangeText={(v) => {
              setDraftPostcode(v);
              if (result) setResult(null);
            }}
            placeholder={draftCountry === 'IE' ? 'D02 X285' : 'BT1 1AA'}
            placeholderTextColor="#9aa0a6"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!checking && !saving}
            style={styles.input}
          />

          {result ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Got it</Text>
              <Text style={styles.confirmBody}>{result.placeName}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.editButtons}>
            {!result ? (
              <Pressable
                onPress={checkPostcode}
                disabled={checking || !draftPostcode.trim() || !draftCountry}
                style={({ pressed }) => [
                  styles.primary,
                  (checking || !draftPostcode.trim() || !draftCountry) && styles.primaryDisabled,
                  pressed && styles.primaryPressed,
                ]}
              >
                {checking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Check</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={save}
                disabled={saving}
                style={({ pressed }) => [
                  styles.primary,
                  saving && styles.primaryDisabled,
                  pressed && styles.primaryPressed,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Save</Text>
                )}
              </Pressable>
            )}
            <Pressable onPress={cancelEdit} disabled={checking || saving} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Section>
  );
}

// ---- Your kids -------------------------------------------------------------

function YourKidsSection() {
  const { children, loading, error, addChild, updateChild, removeChild } = useChildren();
  const [adding, setAdding] = useState(false);

  function confirmRemove(child: Child) {
    Alert.alert(
      'Remove child',
      `Remove ${child.nickname}? You can add them back later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removeChild(child.id);
          },
        },
      ],
    );
  }

  return (
    <Section title="Your kids">
      {loading && !children ? (
        <ActivityIndicator style={{ marginTop: 8 }} />
      ) : (
        <View>
          {(children ?? []).map((c) => (
            <ChildRow
              key={c.id}
              child={c}
              onSave={(patch) => updateChild(c.id, patch)}
              onRemove={() => confirmRemove(c)}
            />
          ))}
          {(children ?? []).length === 0 && !adding ? (
            <Text style={styles.emptyHint}>
              No kids added yet — that&rsquo;s fine, add them whenever.
            </Text>
          ) : null}

          {adding ? (
            <ChildAddForm
              onSave={async (input) => {
                const result = await addChild(input);
                if (result) setAdding(false);
                return result;
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Pressable
              onPress={() => setAdding(true)}
              style={({ pressed }) => [styles.addChildButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.addChildText}>
                + Add {children && children.length > 0 ? 'another' : 'a child'}
              </Text>
            </Pressable>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
    </Section>
  );
}

// ---- Account ---------------------------------------------------------------

function AccountSection() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Could not sign out', e instanceof Error ? e.message : 'Try again.');
      setSigningOut(false);
    }
    // On success the auth state change will whip us out of this screen, so
    // we don't reset signingOut here — leaving the button disabled until
    // navigation happens prevents a double-tap from racing.
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account — coming soon',
      "This isn't wired up yet. When it is, you'll be asked to confirm and your account plus all your data will be permanently deleted.",
      [{ text: 'OK' }],
    );
  }

  return (
    <Section title="Account">
      <Pressable
        onPress={handleSignOut}
        disabled={signingOut}
        style={({ pressed }) => [
          styles.primary,
          { marginTop: 4, alignSelf: 'stretch' },
          signingOut && styles.primaryDisabled,
          pressed && styles.primaryPressed,
        ]}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Sign out</Text>
        )}
      </Pressable>

      <Pressable
        onPress={handleDeleteAccount}
        style={({ pressed }) => [styles.destructive, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.destructiveText}>Delete account</Text>
      </Pressable>
      <Text style={styles.comingSoon}>Coming soon — placeholder for now</Text>
    </Section>
  );
}

// ---- styles ----------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f8fa' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  header: { paddingHorizontal: 8, paddingBottom: 16 },
  greeting: { fontSize: 26, fontWeight: '700', color: '#111' },
  subtle: { fontSize: 14, color: '#666', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e5e9',
  },
  rowButtons: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  fieldValue: { fontSize: 15, color: '#111' },
  comingSoon: { fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderColor: '#d0d4d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafbfc',
  },
  error: { color: '#b00020', fontSize: 13, marginTop: 6 },
  linkButton: { paddingVertical: 4 },
  linkButtonText: { color: '#1a73e8', fontSize: 14, fontWeight: '600' },
  linkButtonMuted: { color: '#666', fontSize: 14, fontWeight: '600' },
  editButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primary: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { backgroundColor: '#9aa0a6' },
  primaryPressed: { opacity: 0.85 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#333', fontSize: 15, fontWeight: '600' },
  confirmBox: {
    backgroundColor: '#eef6ee',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  confirmTitle: { fontSize: 12, fontWeight: '700', color: '#1f7a1f' },
  confirmBody: { fontSize: 14, color: '#1f7a1f', marginTop: 2 },
  emptyHint: {
    fontSize: 14,
    color: '#666',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  addChildButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1a73e8',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addChildText: { color: '#1a73e8', fontSize: 14, fontWeight: '600' },
  destructive: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#b00020',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  destructiveText: { color: '#b00020', fontSize: 15, fontWeight: '600' },
  dividerLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginVertical: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
