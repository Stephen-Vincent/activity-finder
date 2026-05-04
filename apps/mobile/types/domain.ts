/**
 * App-side domain types — derived from the generated `Database` types but
 * shaped for UI consumption (camelCase, computed fields, narrower unions).
 *
 * Examples:
 *   - Venue       (a UI-friendly view of public.venues)
 *   - Child       (with computed ageYears)
 *   - VenueFilters
 *   - PriceBand   = 'free' | 'low' | 'mid' | 'high'
 */

export type PriceBand = 'free' | 'low' | 'mid' | 'high';
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both';
export type CountryCode = 'GB-NIR' | 'IE';
export type Currency = 'GBP' | 'EUR';

export type VenueFilters = {
  childAges?: number[];
  distanceKm?: number;
  categories?: string[];
  indoorOutdoor?: IndoorOutdoor | null;
  priceBand?: PriceBand[];
  openNow?: boolean;
  accessibility?: string[];
  onSchoolHoliday?: boolean;
};

// TODO: add Venue, Child, Plan, Review etc once the database types exist.
