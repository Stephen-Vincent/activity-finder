/**
 * Sign-in screen — 6-digit OTP code.
 *
 * The user types an email, Supabase emails them a 6-digit code, they type it
 * back into the app. No magic link, no deep linking — just a code.
 *
 * Why not a magic link? They're a pain to test in dev (the email link points
 * at the local Supabase host, which a phone can't reach without LAN setup),
 * and the email-app → mobile-app deep-link round trip is fragile across
 * iOS / Android / Expo Go / dev build. OTP codes work the same way in every
 * environment. We can revisit magic links later if we want them as an option.
 *
 * UI states:
 *   - 'email-idle'    show email input + "Send code"
 *   - 'email-sending' button shows spinner; input disabled
 *   - 'code-idle'     "we sent a code to <email>" + 6-digit input + "Verify"
 *   - 'code-verifying' button shows spinner; code input disabled
 *   - errors are surfaced inline above the active button
 *
 * On success, Supabase fires `onAuthStateChange`, AuthProvider updates, and
 * the root index route redirects to /(tabs)/home. We don't navigate from here.
 */

import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

type Step = 'email' | 'code';

// Crude but fine for client-side: catches obvious typos before we hit the API.
// Real validation is Supabase's job.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;

export default function SignInScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const codeInputRef = useRef<TextInput | null>(null);
  // Synchronous lock against double-taps. React's setState is asynchronous,
  // so a fast finger can fire the handler twice before `busy` flips. The ref
  // closes that window — we set it the instant a tap is accepted, and any
  // further taps see it true and bail immediately.
  const inFlight = useRef(false);

  const trimmedEmail = email.trim();
  const isEmailValid = EMAIL_RE.test(trimmedEmail);
  const isCodeComplete = code.length === OTP_LENGTH;

  async function sendCode() {
    if (!isEmailValid || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      // shouldCreateUser: true means a brand-new email creates a user row.
      // Flip to false once we add a separate sign-up flow.
      options: { shouldCreateUser: true },
    });

    setBusy(false);
    inFlight.current = false;
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setCode('');
    setStep('code');
    // Tiny delay so the input mounts before we focus it.
    setTimeout(() => codeInputRef.current?.focus(), 100);
  }

  async function verifyCode() {
    if (!isCodeComplete || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: code,
      // 'email' is the type for the OTP-by-email flow (vs 'sms', 'magiclink',
      // etc). Don't be fooled by 'magiclink' — that's for the link form.
      type: 'email',
    });

    setBusy(false);
    inFlight.current = false;
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    // Success — AuthProvider's onAuthStateChange will fire and the index
    // route will redirect us to (tabs)/home. Nothing more to do here.
  }

  function backToEmail() {
    setStep('email');
    setCode('');
    setErrorMessage(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? "Pop your email below and we'll send you a 6-digit code."
                : `We sent a 6-digit code to ${trimmedEmail}.`}
            </Text>
          </View>

          {step === 'email' ? (
            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9aa0a6"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!busy}
                returnKeyType="send"
                onSubmitEditing={sendCode}
                style={styles.input}
              />

              {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

              <Pressable
                onPress={sendCode}
                disabled={!isEmailValid || busy}
                style={({ pressed }) => [
                  styles.button,
                  (!isEmailValid || busy) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send sign-in code</Text>
                )}
              </Pressable>

              <Text style={styles.fineprint}>
                By signing in you agree to our terms and privacy policy.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>6-digit code</Text>
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(next) => {
                  // Strip anything non-numeric and clamp length.
                  const cleaned = next.replace(/\D/g, '').slice(0, OTP_LENGTH);
                  setCode(cleaned);
                }}
                placeholder="123456"
                placeholderTextColor="#9aa0a6"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                editable={!busy}
                maxLength={OTP_LENGTH}
                returnKeyType="done"
                onSubmitEditing={verifyCode}
                style={[styles.input, styles.codeInput]}
              />

              {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

              <Pressable
                onPress={verifyCode}
                disabled={!isCodeComplete || busy}
                style={({ pressed }) => [
                  styles.button,
                  (!isCodeComplete || busy) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify and sign in</Text>
                )}
              </Pressable>

              <Pressable onPress={backToEmail} style={styles.linkButton} disabled={busy}>
                <Text style={styles.linkButtonText}>Use a different email</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'flex-start',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: '#b00020',
    fontSize: 13,
    marginTop: 8,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  fineprint: {
    fontSize: 12,
    color: '#777',
    marginTop: 16,
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
  },
});
