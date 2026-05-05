/**
 * CountryChoice — a tappable card showing a country option (e.g. "Northern
 * Ireland — Postcodes like BT1 1AA · prices in £").
 *
 * Used in two places: onboarding's country step (no `selected` state, the
 * tap immediately moves to the next step) and the profile WhereYouAre edit
 * mode (one of the two cards is highlighted as the user's current choice).
 *
 * Pass `selected` only when you want a highlighted state.
 */

import { Pressable, StyleSheet, Text } from 'react-native';

export function CountryChoice(props: {
  label: string;
  sub: string;
  /** Highlight this card. Omit if the screen doesn't track selection. */
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.card,
        props.selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <Text style={styles.title}>{props.label}</Text>
      <Text style={styles.sub}>{props.sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#d0d4d9',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    backgroundColor: '#fafbfc',
  },
  cardSelected: {
    borderColor: '#1a73e8',
    backgroundColor: '#eaf2ff',
  },
  cardPressed: { opacity: 0.85 },
  title: { fontSize: 16, fontWeight: '600', color: '#111' },
  sub: { fontSize: 13, color: '#666', marginTop: 4 },
});
