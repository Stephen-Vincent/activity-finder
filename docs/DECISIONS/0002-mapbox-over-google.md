# ADR 0002: Mapbox over Google Maps

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Stephen

## Context

We need a map SDK for the React Native app and geocoding for postcode/Eircode lookups across NI and ROI.

## Options

1. **Google Maps** — broadest coverage, familiar to users, but: pricier at scale, weaker RN SDK story (react-native-maps community-maintained), and stricter TOS around caching.
2. **Mapbox** — strong native RN SDK (@rnmapbox/maps), competitive pricing, generous free tier, customisable map styles, and explicit support for offline-friendly tile caching.
3. **Apple Maps / OpenStreetMap (Leaflet/MapLibre)** — viable later but rougher DX for what we want at MVP.

## Decision

Use **Mapbox** for both the map UI (@rnmapbox/maps) and forward/reverse geocoding. Treat Eircode lookup as a separate problem (Mapbox handles formatted addresses but Eircode-specific search may need a paid licence — track in DESIGN.md §12).

## Consequences

- Two tokens: a public token (`EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`) used in the app, and a secret download token (`RNMAPBOX_MAPS_DOWNLOAD_TOKEN`) read from the environment by the @rnmapbox/maps Expo plugin at prebuild time.
- Custom map style can be designed in Mapbox Studio later for brand consistency.
- If costs balloon, MapLibre is a credible exit — it's a fork of Mapbox GL pre-licence change.
