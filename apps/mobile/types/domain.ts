/**
 * App-side domain types — derived from the generated `Database` types but
 * shaped for UI consumption (camelCase, computed fields, narrower unions).
 *
 * Anything that crosses the UI/data boundary should pass through here so
 * screens never need to know about snake_case column names.
 */

import type { Database } from './database';

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

/**
 * Profile — UI-facing view of a public.users row.
 *
 * `home_postcode` is the "have they finished onboarding?" signal — null means
 * we haven't asked them where they live yet, so the AuthGate will route them
 * to /onboarding.
 */
type UsersRow = Database['public']['Tables']['users']['Row'];
export type Profile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  homePostcode: string | null;
  countryCode: CountryCode | null;
  preferredCurrency: Currency | null;
  marketingOptIn: boolean;
};

export function profileFromRow(row: UsersRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    homePostcode: row.home_postcode,
    // The DB column is the more permissive `country_code` enum; we narrow
    // to our app-side union. The DB shouldn't carry anything outside the
    // union, but the type system doesn't know that.
    countryCode: (row.country_code as CountryCode | null) ?? null,
    preferredCurrency: (row.preferred_currency as Currency | null) ?? null,
    marketingOptIn: row.marketing_opt_in,
  };
}

/**
 * Child — UI-facing view of a public.children row, with computed age in years.
 *
 * `ageYears` is recomputed every read because birthdays move; storing it
 * would just mean a daily cron job to refresh stale rows.
 */
type ChildrenRow = Database['public']['Tables']['children']['Row'];
export type Child = {
  id: string;
  userId: string;
  nickname: string;
  dob: string; // ISO date 'YYYY-MM-DD'
  notes: string | null;
  ageYears: number;
};

export function childFromRow(row: ChildrenRow): Child {
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    dob: row.dob,
    notes: row.notes,
    ageYears: computeAgeYears(row.dob),
  };
}

/**
 * Compute a child's age in whole years, the way humans say it
 * ("she's 4" until her 5th birthday). Floors at 0 in case of typos.
 */
export function computeAgeYears(dob: string, today: Date = new Date()): number {
  const [yearStr, monthStr, dayStr] = dob.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return 0;

  let age = today.getFullYear() - year;
  // If the birthday hasn't happened yet this year, subtract one.
  const beforeBirthday =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}
