/**
 * scripts/update-school-terms.ts
 *
 * Refreshes the school_terms table for NI and ROI for the next academic year.
 * Sources are not machine-readable, so this script accepts a JSON input file
 * shaped like:
 *
 *   [
 *     { region: "NI",  termName: "Halloween Half-Term 2026", startsOn: "2026-10-26", endsOn: "2026-10-30", isHoliday: true },
 *     ...
 *   ]
 *
 * Usage:
 *   npx tsx scripts/update-school-terms.ts --file ./data/school-terms-2026-27.json
 *
 * Run annually around July when official calendars publish.
 */

// TODO: implement.
export {};
