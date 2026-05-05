/**
 * First-run onboarding.
 *
 * Steps (a single-screen state machine, no navigator pushes):
 *   1. welcome       — hello + "Get started"
 *   2. country       — Northern Ireland or Republic of Ireland
 *   3. postcode      — postcode/Eircode, validated via Mapbox geocode
 *   4. display_name  — what should we call you?
 *   5. marketing     — single opt-in checkbox; saves the whole profile
 *   6. children_list — list of added children, "add" or "done"
 *   7. children_add  — nickname + DOB form
 *   8. done          — brief "all set" screen, then refreshProfile()
 *
 * On step 5 ("marketing") we do the single UPDATE to public.users with
 * country, postcode, display_name and marketing_opt_in. children are
 * INSERTed one at a time as the user adds them — that way if the app is
 * closed mid-flow, progress is preserved on the server.
 *
 * AuthGate watches profile.homePostcode. The moment we save it, AuthGate
 * will start trying to bounce us to /(tabs)/home — so we only let it do
 * that *after* the children step, by treating /onboarding as a valid
 * destination until refreshProfile is called from the 'done' step. The
 * gate logic in _layout.tsx already allows /onboarding while signed in.
 */

import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { supabase } from '@/lib/supabase';
import { geocode, MapboxNotConfiguredError, type GeocodeResult } from '@/lib/mapbox';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/useChildren';
import type { CountryCode } from '@/types/domain';

type Step =
  | 'welcome'
  | 'country'
  | 'postcode'
  | 'display_name'
  | 'marketing'
  | 'children_list'
  | 'children_add'
  | 'done';

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const childrenHook = useChildren();

  const [step, setStep] = useState<Step>('welcome');

  // Pending profile values — saved together at the end of step 5.
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [postcode, setPostcode] = useState('');
  const [postcodeResult, setPostcodeResult] = useState<GeocodeResult | null>(null);
  const [postcodeChecking, setPostcodeChecking] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  // Add-child form state
  const [childNickname, setChildNickname] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // ---- step handlers ---------------------------------------------------------

  function goWelcomeToCountry() {
    setErrorMessage(null);
    setStep('country');
  }

  function pickCountry(value: CountryCode) {
    setCountry(value);
    // Clear any previously geocoded postcode if the user changes country.
    setPostcodeResult(null);
    setStep('postcode');
  }

  async function checkPostcode() {
    if (!country) return;
    const trimmed = postcode.trim();
    if (!trimmed) return;
    setPostcodeChecking(true);
    setErrorMessage(null);
    try {
      const result = await geocode(trimmed, country);
      if (!result) {
        setErrorMessage(
          country === 'GB-NIR'
            ? "We couldn't find that postcode in Northern Ireland. Double-check the spelling?"
            : "We couldn't find that Eircode. Double-check the spelling?",
        );
        setPostcodeResult(null);
      } else {
        setPostcodeResult(result);
      }
    } catch (e) {
      if (e instanceof MapboxNotConfiguredError) {
        setErrorMessage(
          'Mapbox token is missing. Add EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN to apps/mobile/.env and restart Metro.',
        );
      } else {
        setErrorMessage(e instanceof Error ? e.message : 'Something went wrong.');
      }
      setPostcodeResult(null);
    } finally {
      setPostcodeChecking(false);
    }
  }

  function postcodeContinue() {
    if (!postcodeResult) return;
    setStep('display_name');
  }

  function displayNameContinue() {
    if (!displayName.trim()) return;
    setStep('marketing');
  }

  async function saveProfile() {
    if (inFlight.current) return;
    if (!user || !country || !postcodeResult) {
      setErrorMessage('Missing information — please go back and try again.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from('users')
      .update({
        country_code: country,
        home_postcode: postcode.trim(),
        display_name: displayName.trim(),
        marketing_opt_in: marketingOptIn,
        // Default the currency from the country — the user can change this
        // later in Profile if they want to see distances in miles or prices
        // in the other currency.
        preferred_currency: country === 'GB-NIR' ? 'GBP' : 'EUR',
      })
      .eq('id', user.id);

    setBusy(false);
    inFlight.current = false;

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    // We don't refreshProfile here — that would trigger AuthGate to redirect
    // away from /onboarding. We refresh on the very last step instead.
    setStep('children_list');
  }

  function startAddChild() {
    setChildNickname('');
    setDobDay('');
    setDobMonth('');
    setDobYear('');
    setErrorMessage(null);
    setStep('children_add');
  }

  async function saveChild() {
    if (inFlight.current) return;
    const nickname = childNickname.trim();
    if (!nickname) {
      setErrorMessage('Please add a name or nickname.');
      return;
    }
    const day = Number(dobDay);
    const month = Number(dobMonth);
    const year = Number(dobYear);
    if (!day || !month || !year) {
      setErrorMessage('Please fill in the day, month and year of birth.');
      return;
    }
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      setErrorMessage('That date doesn’t look right.');
      return;
    }
    const thisYear = new Date().getFullYear();
    if (year < thisYear - 21 || year > thisYear) {
      setErrorMessage('Year of birth seems off — please check.');
      return;
    }
    const dob = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`;

    inFlight.current = true;
    setBusy(true);
    setErrorMessage(null);

    const child = await childrenHook.addChild({ nickname, dob });

    setBusy(false);
    inFlight.current = false;

    if (!child) {
      setErrorMessage(childrenHook.error ?? 'Could not save that just now.');
      return;
    }
    setStep('children_list');
  }

  async function finishOnboarding() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setStep('done');
    // Tiny celebratory delay before the gate yanks us to home.
    await new Promise((resolve) => setTimeout(resolve, 600));
    await refreshProfile();
    // AuthGate will now see homePostcode is set and we're on /onboarding,
    // and it will router.replace us to /(tabs)/home. Nothing more to do.
    setBusy(false);
    inFlight.current = false;
  }

  // ---- render ----------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'welcome' && <WelcomeStep onContinue={goWelcomeToCountry} />}

          {step === 'country' && <CountryStep onPick={pickCountry} />}

          {step === 'postcode' && country && (
            <PostcodeStep
              country={country}
              postcode={postcode}
              setPostcode={(v) => {
                setPostcode(v);
                if (postcodeResult) setPostcodeResult(null);
              }}
              checking={postcodeChecking}
              result={postcodeResult}
              error={errorMessage}
              onCheck={checkPostcode}
              onContinue={postcodeContinue}
              onBack={() => {
                setErrorMessage(null);
                setStep('country');
              }}
            />
          )}

          {step === 'display_name' && (
            <DisplayNameStep
              displayName={displayName}
              setDisplayName={setDisplayName}
              onContinue={displayNameContinue}
              onBack={() => setStep('postcode')}
            />
          )}

          {step === 'marketing' && (
            <MarketingStep
              optIn={marketingOptIn}
              setOptIn={setMarketingOptIn}
              busy={busy}
              error={errorMessage}
              onContinue={saveProfile}
              onBack={() => setStep('display_name')}
            />
          )}

          {step === 'children_list' && (
            <ChildrenListStep
              children={childrenHook.children ?? []}
              loading={childrenHook.loading && !childrenHook.children}
              onAdd={startAddChild}
              onRemove={(id) => {
                void childrenHook.removeChild(id);
              }}
              onContinue={finishOnboarding}
            />
          )}

          {step === 'children_add' && (
            <ChildrenAddStep
              nickname={childNickname}
              setNickname={setChildNickname}
              dobDay={dobDay}
              dobMonth={dobMonth}
              dobYear={dobYear}
              setDobDay={setDobDay}
              setDobMonth={setDobMonth}
              setDobYear={setDobYear}
              busy={busy}
              error={errorMessage}
              onSave={saveChild}
              onCancel={() => {
                setErrorMessage(null);
                setStep('children_list');
              }}
            />
          )}

          {step === 'done' && <DoneStep />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Step components — kept inline because they're all small and only used here.
// ---------------------------------------------------------------------------

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <View>
      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.subtitle}>
        Activity Finder helps you find good things to do with kids — across Northern Ireland and the
        Republic of Ireland.
      </Text>
      <Text style={styles.subtitle}>
        We&rsquo;ll ask you a few quick things so we can show you the right places.
      </Text>
      <PrimaryButton label="Get started" onPress={onContinue} />
    </View>
  );
}

function CountryStep({ onPick }: { onPick: (c: CountryCode) => void }) {
  return (
    <View>
      <Text style={styles.title}>Where are you?</Text>
      <Text style={styles.subtitle}>
        We use this to set up the right currency and to suggest places near you.
      </Text>
      <Pressable
        onPress={() => onPick('GB-NIR')}
        style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
      >
        <Text style={styles.choiceTitle}>Northern Ireland</Text>
        <Text style={styles.choiceSub}>Postcodes like BT1 1AA · prices in £</Text>
      </Pressable>
      <Pressable
        onPress={() => onPick('IE')}
        style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
      >
        <Text style={styles.choiceTitle}>Republic of Ireland</Text>
        <Text style={styles.choiceSub}>Eircodes like D02 X285 · prices in €</Text>
      </Pressable>
    </View>
  );
}

function PostcodeStep(props: {
  country: CountryCode;
  postcode: string;
  setPostcode: (v: string) => void;
  checking: boolean;
  result: GeocodeResult | null;
  error: string | null;
  onCheck: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const isNI = props.country === 'GB-NIR';
  const placeholder = isNI ? 'BT1 1AA' : 'D02 X285';
  return (
    <View>
      <Text style={styles.title}>Your home {isNI ? 'postcode' : 'Eircode'}</Text>
      <Text style={styles.subtitle}>
        We&rsquo;ll use this to sort places by how far they are from you. We never share it.
      </Text>
      <Text style={styles.label}>{isNI ? 'Postcode' : 'Eircode'}</Text>
      <TextInput
        value={props.postcode}
        onChangeText={props.setPostcode}
        placeholder={placeholder}
        placeholderTextColor="#9aa0a6"
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!props.checking}
        returnKeyType="search"
        onSubmitEditing={props.onCheck}
        style={styles.input}
      />

      {props.result ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Got it</Text>
          <Text style={styles.confirmBody}>{props.result.placeName}</Text>
        </View>
      ) : null}

      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}

      {props.result ? (
        <PrimaryButton label="Continue" onPress={props.onContinue} />
      ) : (
        <PrimaryButton
          label={props.checking ? '' : 'Check'}
          onPress={props.onCheck}
          disabled={props.checking || !props.postcode.trim()}
          spinner={props.checking}
        />
      )}
      <SecondaryButton label="Back" onPress={props.onBack} />
    </View>
  );
}

function DisplayNameStep(props: {
  displayName: string;
  setDisplayName: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <View>
      <Text style={styles.title}>What should we call you?</Text>
      <Text style={styles.subtitle}>
        We&rsquo;ll use this to greet you on the home tab. You can change it later.
      </Text>
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={props.displayName}
        onChangeText={props.setDisplayName}
        placeholder="Stephen"
        placeholderTextColor="#9aa0a6"
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={props.onContinue}
        style={styles.input}
      />
      <PrimaryButton
        label="Continue"
        onPress={props.onContinue}
        disabled={!props.displayName.trim()}
      />
      <SecondaryButton label="Back" onPress={props.onBack} />
    </View>
  );
}

function MarketingStep(props: {
  optIn: boolean;
  setOptIn: (v: boolean) => void;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <View>
      <Text style={styles.title}>One quick thing</Text>
      <Text style={styles.subtitle}>
        We sometimes send a short email about new features and seasonal ideas (school holidays,
        Christmas markets, that sort of thing). Always opt-out at any time.
      </Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Send me the occasional email</Text>
        <Switch value={props.optIn} onValueChange={props.setOptIn} disabled={props.busy} />
      </View>
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
      <PrimaryButton
        label={props.busy ? '' : 'Save and continue'}
        onPress={props.onContinue}
        disabled={props.busy}
        spinner={props.busy}
      />
      <SecondaryButton label="Back" onPress={props.onBack} disabled={props.busy} />
    </View>
  );
}

function ChildrenListStep(props: {
  children: { id: string; nickname: string; ageYears: number }[];
  loading: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <View>
      <Text style={styles.title}>Tell us about the kids</Text>
      <Text style={styles.subtitle}>
        Add a quick profile for each child. We use their ages to highlight the right activities —
        their info stays private and is never shared with venues.
      </Text>

      {props.loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : (
        props.children.map((c) => (
          <View key={c.id} style={styles.childRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{c.nickname}</Text>
              <Text style={styles.childAge}>
                {c.ageYears} {c.ageYears === 1 ? 'year' : 'years'} old
              </Text>
            </View>
            <Pressable onPress={() => props.onRemove(c.id)} hitSlop={8}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <Pressable
        onPress={props.onAdd}
        style={({ pressed }) => [styles.addChildButton, pressed && styles.choicePressed]}
      >
        <Text style={styles.addChildText}>+ Add {props.children.length ? 'another' : 'a child'}</Text>
      </Pressable>

      <PrimaryButton
        label={props.children.length ? 'All done' : 'Skip for now'}
        onPress={props.onContinue}
      />
    </View>
  );
}

function ChildrenAddStep(props: {
  nickname: string;
  setNickname: (v: string) => void;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  setDobDay: (v: string) => void;
  setDobMonth: (v: string) => void;
  setDobYear: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <View>
      <Text style={styles.title}>Add a child</Text>
      <Text style={styles.label}>Name or nickname</Text>
      <TextInput
        value={props.nickname}
        onChangeText={props.setNickname}
        placeholder="Eg. Ava"
        placeholderTextColor="#9aa0a6"
        autoCapitalize="words"
        autoCorrect={false}
        editable={!props.busy}
        style={styles.input}
      />
      <Text style={styles.label}>Date of birth</Text>
      <View style={styles.dobRow}>
        <TextInput
          value={props.dobDay}
          onChangeText={(v) => props.setDobDay(v.replace(/\D/g, '').slice(0, 2))}
          placeholder="DD"
          placeholderTextColor="#9aa0a6"
          keyboardType="number-pad"
          maxLength={2}
          editable={!props.busy}
          style={[styles.input, styles.dobInput]}
        />
        <TextInput
          value={props.dobMonth}
          onChangeText={(v) => props.setDobMonth(v.replace(/\D/g, '').slice(0, 2))}
          placeholder="MM"
          placeholderTextColor="#9aa0a6"
          keyboardType="number-pad"
          maxLength={2}
          editable={!props.busy}
          style={[styles.input, styles.dobInput]}
        />
        <TextInput
          value={props.dobYear}
          onChangeText={(v) => props.setDobYear(v.replace(/\D/g, '').slice(0, 4))}
          placeholder="YYYY"
          placeholderTextColor="#9aa0a6"
          keyboardType="number-pad"
          maxLength={4}
          editable={!props.busy}
          style={[styles.input, styles.dobInputYear]}
        />
      </View>
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
      <PrimaryButton
        label={props.busy ? '' : 'Save'}
        onPress={props.onSave}
        disabled={props.busy}
        spinner={props.busy}
      />
      <SecondaryButton label="Cancel" onPress={props.onCancel} disabled={props.busy} />
    </View>
  );
}

function DoneStep() {
  return (
    <View style={styles.doneCenter}>
      <Text style={styles.title}>You&rsquo;re all set 🎉</Text>
      <Text style={styles.subtitle}>Taking you to your home screen…</Text>
      <ActivityIndicator style={{ marginTop: 12 }} />
    </View>
  );
}

// ---- shared button components ----------------------------------------------

function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  spinner?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.primary,
        props.disabled && styles.primaryDisabled,
        pressed && styles.primaryPressed,
      ]}
    >
      {props.spinner ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryText}>{props.label}</Text>
      )}
    </Pressable>
  );
}

function SecondaryButton(props: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={props.onPress} disabled={props.disabled} style={styles.secondary}>
      <Text style={[styles.secondaryText, props.disabled && { opacity: 0.5 }]}>{props.label}</Text>
    </Pressable>
  );
}

// ---- styles ----------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#555', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d4d9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafbfc',
  },
  error: { color: '#b00020', fontSize: 13, marginTop: 8 },
  primary: {
    marginTop: 20,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryDisabled: { backgroundColor: '#9aa0a6' },
  primaryPressed: { opacity: 0.85 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  secondaryText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  choice: {
    borderWidth: 1,
    borderColor: '#d0d4d9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    backgroundColor: '#fafbfc',
  },
  choicePressed: { opacity: 0.85 },
  choiceTitle: { fontSize: 17, fontWeight: '600', color: '#111' },
  choiceSub: { fontSize: 13, color: '#666', marginTop: 4 },
  confirmBox: {
    backgroundColor: '#eef6ee',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  confirmTitle: { fontSize: 13, fontWeight: '700', color: '#1f7a1f' },
  confirmBody: { fontSize: 15, color: '#1f7a1f', marginTop: 4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, color: '#111', flex: 1, paddingRight: 12 },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e5e9',
  },
  childName: { fontSize: 16, fontWeight: '600', color: '#111' },
  childAge: { fontSize: 13, color: '#666', marginTop: 2 },
  removeText: { fontSize: 13, color: '#b00020', fontWeight: '600' },
  addChildButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1a73e8',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addChildText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  dobRow: { flexDirection: 'row', gap: 8 },
  dobInput: { flex: 1, textAlign: 'center' },
  dobInputYear: { flex: 1.5, textAlign: 'center' },
  doneCenter: { paddingTop: 80, alignItems: 'center' },
});
