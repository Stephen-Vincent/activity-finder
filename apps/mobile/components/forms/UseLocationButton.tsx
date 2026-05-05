/**
 * UseLocationButton
 *
 * "Use my current location" — asks for permission, gets a coordinate,
 * reverse-geocodes it, classifies it (NI / ROI / off-island), and emits
 * the result back to the parent via callbacks. The parent decides what to
 * do with the data (fill in form fields, advance step, etc.).
 *
 * Three callbacks because the three outcomes deserve different treatments:
 *   onResult     — happy path, we know the country and postcode.
 *   onOffIsland  — Mapbox understood our coords but they're not on the
 *                  island of Ireland. Parent typically shows a polite alert
 *                  saying we only cover NI/ROI for now.
 *   onError      — permission denied / GPS unavailable / no postcode in
 *                  Mapbox / network error. Parent typically shows the message
 *                  inline and falls back to manual entry.
 *
 * The button manages its own busy state (spinner + disabled). Parent doesn't
 * have to gate it.
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { getCurrentLocation } from '@/lib/location';
import {
  classifyLocation,
  MapboxNotConfiguredError,
  reverseGeocode,
} from '@/lib/mapbox';
import type { CountryCode } from '@/types/domain';

export type UseLocationResult = {
  country: CountryCode;
  postcode: string;
  placeName: string;
  lng: number;
  lat: number;
};

export function UseLocationButton(props: {
  onResult: (r: UseLocationResult) => void;
  onOffIsland: () => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function detect() {
    if (busy) return;
    setBusy(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc.ok) {
        props.onError(
          loc.reason === 'denied'
            ? 'Location permission was denied. You can enter your postcode manually below.'
            : (loc.message ?? 'Could not get your location.'),
        );
        return;
      }

      const reverse = await reverseGeocode(loc.lng, loc.lat);
      if (!reverse) {
        props.onError("We couldn't work out where that is. Please enter your postcode manually.");
        return;
      }

      const verdict = classifyLocation(reverse.countryShortCode, reverse.postcode);
      if (verdict.kind === 'off-island') {
        props.onOffIsland();
        return;
      }

      if (!reverse.postcode) {
        // Belt-and-braces; classify already gates on the postcode for NI.
        props.onError("We found your area but no postcode nearby. Please enter manually.");
        return;
      }

      props.onResult({
        country: verdict.country,
        postcode: reverse.postcode,
        placeName: reverse.placeName,
        lng: loc.lng,
        lat: loc.lat,
      });
    } catch (e) {
      if (e instanceof MapboxNotConfiguredError) {
        props.onError('Mapbox token is missing. Check apps/mobile/.env.');
      } else {
        props.onError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={detect}
      disabled={busy}
      style={({ pressed }) => [
        styles.button,
        busy && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#1a73e8" />
      ) : (
        <Text style={styles.buttonText}>📍 Use my current location</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: '#1a73e8',
    backgroundColor: '#eaf2ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
});
