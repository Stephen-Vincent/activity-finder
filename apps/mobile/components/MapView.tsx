/**
 * MapView
 *
 * Mapbox-backed map for the Discover tab. Clusters venue markers, recentres
 * on user location, exposes a callback when the user moves the camera so the
 * parent screen can refetch venues for the new viewport.
 *
 * Note: the @rnmapbox/maps native SDK download is authorised by the
 * RNMAPBOX_MAPS_DOWNLOAD_TOKEN env var at prebuild time. The runtime map
 * uses EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN.
 *
 * Props: { centre: [lng, lat], radiusMeters, venues: Venue[], onRegionChange }
 */

export default function MapView() {
  // TODO: implement Mapbox MapView with clustered point layer.
  return null;
}
