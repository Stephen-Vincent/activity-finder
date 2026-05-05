/**
 * Section — the iOS-Settings-style "label above a white rounded card" pattern.
 *
 * Use it whenever a screen has multiple titled groups of rows. Profile uses
 * it for About you / Where you are / Your kids / Account; future screens like
 * Settings will reuse the same shape.
 */

import { StyleSheet, Text, View } from 'react-native';

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  body: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
