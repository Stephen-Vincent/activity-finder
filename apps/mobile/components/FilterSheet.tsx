/**
 * FilterSheet
 *
 * Bottom sheet that lets the user edit filters used by Discover and Home.
 *
 * Filter shape:
 *   - childAges: number[] (derived from selected child profiles by default)
 *   - distanceKm: number
 *   - categories: string[]
 *   - indoorOutdoor: 'indoor' | 'outdoor' | 'both' | null
 *   - priceBand: ('free' | 'low' | 'mid' | 'high')[]
 *   - openNow: boolean
 *   - accessibility: string[]   // wheelchair, sensory-friendly, breastfeeding, etc.
 *   - onSchoolHoliday: boolean  // matches NI/ROI calendars
 *
 * Persists last-used filter set to AsyncStorage.
 */

export default function FilterSheet() {
  // TODO: implement with @gorhom/bottom-sheet or react-native-bottom-sheet.
  return null;
}
