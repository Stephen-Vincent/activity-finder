/**
 * DobInputs — three numeric fields (DD / MM / YYYY) for entering a child's
 * date of birth. Year box is wider because four digits don't fit comfortably
 * into the same width.
 *
 * Pure presentational — validation lives in `lib/dob.ts` and is called by the
 * parent on save. This component just owns the layout and per-field input
 * massaging (strip non-digits, clamp length).
 */

import { StyleSheet, TextInput, View } from 'react-native';

export function DobInputs(props: {
  day: string;
  month: string;
  year: string;
  setDay: (v: string) => void;
  setMonth: (v: string) => void;
  setYear: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <TextInput
        value={props.day}
        onChangeText={(v) => props.setDay(v.replace(/\D/g, '').slice(0, 2))}
        placeholder="DD"
        placeholderTextColor="#9aa0a6"
        keyboardType="number-pad"
        maxLength={2}
        editable={!props.disabled}
        style={[styles.input, styles.cell]}
      />
      <TextInput
        value={props.month}
        onChangeText={(v) => props.setMonth(v.replace(/\D/g, '').slice(0, 2))}
        placeholder="MM"
        placeholderTextColor="#9aa0a6"
        keyboardType="number-pad"
        maxLength={2}
        editable={!props.disabled}
        style={[styles.input, styles.cell]}
      />
      <TextInput
        value={props.year}
        onChangeText={(v) => props.setYear(v.replace(/\D/g, '').slice(0, 4))}
        placeholder="YYYY"
        placeholderTextColor="#9aa0a6"
        keyboardType="number-pad"
        maxLength={4}
        editable={!props.disabled}
        style={[styles.input, styles.cellWide]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d4d9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fafbfc',
    textAlign: 'center',
  },
  cell: { flex: 1 },
  cellWide: { flex: 1.5 },
});
