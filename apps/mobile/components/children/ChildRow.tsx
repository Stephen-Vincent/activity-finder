/**
 * ChildRow — a single child in the Profile "Your kids" list.
 *
 * Two modes:
 *   display — name + computed age + Edit / Remove buttons.
 *   editing — nickname input + DOB inputs + Save / Cancel.
 *
 * The parent supplies `onSave(patch)` (which should call the `updateChild`
 * mutation) and `onRemove()` (which should typically show a confirmation
 * Alert before deleting). The row owns its own edit state.
 *
 * Used only in Profile right now, but kept separate because the editing
 * mode is around 80 lines that don't benefit from being inlined.
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

export function ChildRow(props: {
  child: Child;
  onSave: (patch: { nickname?: string; dob?: string }) => Promise<Child | null>;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setNickname(props.child.nickname);
    const [y, m, d] = props.child.dob.split('-');
    setDay(d ?? '');
    setMonth(m ?? '');
    setYear(y ?? '');
    setError(null);
    setEditing(true);
  }

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
    if (!result) {
      setError('Could not save changes.');
      return;
    }
    setEditing(false);
  }

  if (!editing) {
    return (
      <View style={styles.displayRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{props.child.nickname}</Text>
          <Text style={styles.age}>
            {props.child.ageYears} {props.child.ageYears === 1 ? 'year' : 'years'} old
          </Text>
        </View>
        <Pressable onPress={startEdit} hitSlop={8}>
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
        <Pressable onPress={props.onRemove} hitSlop={8} style={{ marginLeft: 16 }}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.editBox}>
      <Text style={styles.label}>Name or nickname</Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
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
        <Pressable onPress={() => setEditing(false)} disabled={saving} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e5e9',
  },
  name: { fontSize: 15, fontWeight: '600', color: '#111' },
  age: { fontSize: 13, color: '#666', marginTop: 2 },
  edit: { color: '#1a73e8', fontSize: 14, fontWeight: '600' },
  remove: { fontSize: 13, color: '#b00020', fontWeight: '600' },
  editBox: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e5e9',
  },
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
