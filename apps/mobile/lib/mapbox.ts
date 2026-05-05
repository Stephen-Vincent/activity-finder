/**
 * Mapbox helpers.
 *
 * - geocode(query, country)            forward: postcode / Eircode → place + lat/lng.
 * - reverseGeocode(lng, lat)           reverse: GPS → postcode + country.
 * - classifyLocation(country, postcode) NI / ROI / off-island.
 *
 * Public token lives in EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN and is safe to ship
 * in the mobile bundle. Free tier covers 100k requests/month, plenty for us.
 */

import type { CountryCode } from '@/types/domain';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN;

export type GeocodeResult = {
  /** Lon/lat as Mapbox returns them — note the order. */
  lng: number;
  lat: number;
  /** A human-friendly version of the matched place. */
  placeName: string;
  /** Whatever Mapbox decided was the matched feature type ('postcode', etc). */
  featureType: string;
};

export class MapboxNotConfiguredError extends Error {
  constructor() {
    super(
      '[mapbox] EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN is missing or unset. Add a Mapbox public token to apps/mobile/.env and restart Metro.',
    );
    this.name = 'MapboxNotConfiguredError';
  }
}

/**
 * Forward-geocode a free-text query (we mostly use postcodes / Eircodes).
 *
 * `country` biases results to one of our two markets — Mapbox returns
 * country-suffixed results otherwise, e.g. "BT1 1AA, Belfast, Northern
 * Ireland, United Kingdom" looks fine for NI but the same code somewhere
 * else in the UK would also match. Country biasing avoids the wrong-region
 * trap.
 *
 * Returns `null` on no match. Throws on network or API errors so callers
 * can decide whether to retry.
 */
export async function geocode(
  query: string,
  country: CountryCode,
): Promise<GeocodeResult | null> {
  if (!TOKEN || TOKEN.startsWith('pk.your_')) {
    throw new MapboxNotConfiguredError();
  }

  const trimmed = query.trim();
  if (!trimmed) return null;

  // Mapbox uses ISO 3166-1 alpha-2 country codes; map our app codes onto those.
  // 'GB-NIR' covers Northern Ireland, which is part of the UK from Mapbox's
  // perspective, hence 'GB'.
  const mapboxCountry = country === 'GB-NIR' ? 'GB' : 'IE';

  // The endpoint encodes the query in the path, so we have to encodeURIComponent.
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json` +
    `?country=${mapboxCountry}` +
    `&types=postcode,address,place` +
    `&limit=1` +
    `&access_token=${TOKEN}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[mapbox] geocode failed: ${response.status} ${response.statusText}`);
  }

  const data: {
    features: Array<{
      center: [number, number];
      place_name: string;
      place_type: string[];
    }>;
  } = await response.json();

  const top = data.features[0];
  if (!top) return null;

  const [lng, lat] = top.center;
  return {
    lng,
    lat,
    placeName: top.place_name,
    featureType: top.place_type[0] ?? 'unknown',
  };
}

// ---------------------------------------------------------------------------
// Reverse geocoding — used by "Use my current location" in onboarding/profile.
// ---------------------------------------------------------------------------

export type ReverseGeocodeResult = {
  /** ISO postcode-ish string ("BT1 1AA", "D02 X285") if Mapbox has one. */
  postcode: string | null;
  /** Mapbox's country `short_code`, lowercased (e.g. 'gb', 'ie'). */
  countryShortCode: string | null;
  /** Mapbox's region text — e.g. "Northern Ireland", "England", "County Dublin". */
  region: string | null;
  /** Friendly full-form ("BT1 1AA, Belfast, Northern Ireland, United Kingdom"). */
  placeName: string;
};

/**
 * Reverse-geocode a (lng, lat) to a postcode + country.
 *
 * We ask Mapbox specifically for `postcode` features so the top result is the
 * postcode that contains the GPS coord, not the building. If the area has no
 * postcode (rare in NI/ROI but possible at sea), `postcode` will be null and
 * the caller should fall back to manual entry.
 */
export async function reverseGeocode(lng: number, lat: number): Promise<ReverseGeocodeResult | null> {
  if (!TOKEN || TOKEN.startsWith('pk.your_')) {
    throw new MapboxNotConfiguredError();
  }

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?types=postcode` +
    `&limit=1` +
    `&access_token=${TOKEN}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[mapbox] reverseGeocode failed: ${response.status} ${response.statusText}`);
  }

  const data: {
    features: Array<{
      text: string;
      place_name: string;
      place_type: string[];
      context?: Array<{ id: string; text: string; short_code?: string }>;
    }>;
  } = await response.json();

  const top = data.features[0];
  if (!top) return null;

  // The top feature itself is the postcode (because we asked for types=postcode).
  const postcode = top.place_type[0] === 'postcode' ? top.text : null;

  // Country and region come from the context array. Country has a short_code,
  // region usually doesn't.
  const country = top.context?.find((c) => c.id.startsWith('country.'));
  const region = top.context?.find((c) => c.id.startsWith('region.'));

  return {
    postcode,
    countryShortCode: country?.short_code?.toLowerCase() ?? null,
    region: region?.text ?? null,
    placeName: top.place_name,
  };
}

/**
 * Decide whether a reverse-geocode result is in NI, ROI, or off-island.
 *
 * NI postcodes start with 'BT' inside the UK (`gb` country code). The ROI
 * country code is `ie`. Anything else — mainland UK, anywhere outside these
 * two — counts as off-island. We support showing a polite "we only cover the
 * island of Ireland for now" message in that case.
 */
export type LocationClassification =
  | { kind: 'on-island'; country: CountryCode }
  | { kind: 'off-island' };

export function classifyLocation(
  countryShortCode: string | null,
  postcode: string | null,
): LocationClassification {
  if (countryShortCode === 'ie') {
    return { kind: 'on-island', country: 'IE' };
  }
  if (countryShortCode === 'gb' && postcode?.toUpperCase().startsWith('BT')) {
    return { kind: 'on-island', country: 'GB-NIR' };
  }
  return { kind: 'off-island' };
}
