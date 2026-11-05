/** Metres in one mile. */
export const METRES_PER_MILE = 1609.344;

/** Distance in miles to the nearest hundredth, e.g. `0.25 mi`. */
export function formatMiles(metres: number): string {
  return `${(metres / METRES_PER_MILE).toFixed(2)} mi`;
}
