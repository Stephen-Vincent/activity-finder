/**
 * ChildAddForm — the inline form for entering a new child: name + DOB.
 *
 * Same form is used by onboarding's children-add step and the Profile tab's
 * "+ Add a child" affordance. The component owns its own field state, busy
 * state and inline error message; the parent just supplies what to do with
 * the input on save (typically calling the `addChild` mutation from
 * `useChildren`) and what to do on cancel (close the form).
 *
 * `onSave` returns the saved Child or null on failure. The form shows a
 * generic "could not save" message on null. The parent unmounts the form
 * on success by changing its own state — the form doesn't navigate.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DobInputs } from '@/components/forms/DobInputs';
import { validateDob } from '@/lib/dob';
import type { Child } from '@/types/domain';

export function ChildAddForm(props: {
  onSave: (input: { nickname: string; dob: string }) => Promise<Child | null>;
  onCancel: () => void;
}) {
  const [nickname, setNickname] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    const v = validateDob(day, month, year);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await props.onSave({ nickname: trimmed, dob: v.dob });
    setSaving(false);
    if (!result) setError('Could not save just now.');
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Name or nickname</Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="Eg. Ava"
        placeholderTextColor="#9aa0a6"
        autoCapitalize="words"
        autoCorrect={false}
        editable={!saving}
        style={styles.input}
      />

      <Text style={[styles.label, { marginTop: 8 }]}>Date of birth</Text>
      <DobInputs
        day={day}
        month={month}
        year={year}
        setDay={setDay}
        setMonth={setMonth}
        setYear={setYear}
        disabled={saving}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttons}>
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
        <Pressable onPress={props.onCancel} disabled={saving} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
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
  buttons: { flexDirection: 'row', gap: 8, marginTop: 12 },
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
  cancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#eef0f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#333', fontSize: 15, fontWeight: '600' },
});
