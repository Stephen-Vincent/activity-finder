/**
 * Date-of-birth validation for the three-field DD/MM/YYYY input we use in
 * onboarding and the Profile tab.
 *
 * The inputs are strings (because that's what TextInput hands us); this
 * helper turns them into either a clean ISO date or a user-readable error
 * message. Keeping the logic here means the same rules apply everywhere a
 * child's birthday is entered, and a future tweak (different age range,
 * different message tone) is a single-file change.
 */

export type DobValidation =
  | { ok: true; dob: string }
  | { ok: false; error: string };

const MAX_AGE_YEARS = 21; // we ask "21" because parents sometimes onboard older teens

export function validateDob(day: string, month: string, year: string): DobValidation {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!d || !m || !y) {
    return { ok: false, error: 'Please fill in the day, month and year of birth.' };
  }
  if (d < 1 || d > 31 || m < 1 || m > 12) {
    return { ok: false, error: 'That date doesn’t look right.' };
  }
  const thisYear = new Date().getFullYear();
  if (y < thisYear - MAX_AGE_YEARS || y > thisYear) {
    return { ok: false, error: 'Year of birth seems off — please check.' };
  }
  return {
    ok: true,
    dob: `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d
      .toString()
      .padStart(2, '0')}`,
  };
}
