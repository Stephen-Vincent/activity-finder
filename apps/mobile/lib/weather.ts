/**
 * Weather helper.
 *
 * Default provider: Open-Meteo (free, no key, EU-friendly).
 * Cached per-location for 30 minutes.
 *
 * Returns: { tempC, conditions, isWet, isCold, suitableForOutdoor }
 *
 * Used by Home to bias picks toward indoor when wet/cold and outdoor
 * when dry/mild. Threshold for "suitable for outdoor" is configurable.
 */

export {};
