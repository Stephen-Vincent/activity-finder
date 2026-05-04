/**
 * School term + holiday helpers.
 *
 * NI and ROI calendars are seeded into the `school_terms` table on the
 * backend (see supabase/seed/school_terms.sql). This module fetches them
 * once per session and exposes:
 *   - isSchoolHoliday(date, region): boolean
 *   - nextHoliday(region): { name, startsOn, endsOn } | null
 *   - daysUntilNextHoliday(region): number
 *
 * Region is derived from the user's home country (NI -> 'NI', ROI -> 'ROI'),
 * with optional finer-grained regions later (e.g. ROI-Dublin).
 */

export {};
