// Shared conversions between steps, distance and calories, so every screen
// derives the same number from the same input. Helpers return unrounded values:
// sum first, then round once for display, or per-walk rounding drifts.

/** Average walking stride length in metres (2.5 ft). */
export const AVG_STRIDE_M = 0.762;
/** Rough calorie burn rate for walking: ~50 kcal per km. */
export const CALORIES_PER_M = 0.05;

/** Estimate distance in metres from a step count. */
export function stepsToDistance(steps: number): number {
  return steps * AVG_STRIDE_M;
}

/** Estimate a step count from a distance in metres. */
export function distanceToSteps(metres: number): number {
  return metres / AVG_STRIDE_M;
}

/** Estimate calories burned from a distance in metres. */
export function distanceToCalories(metres: number): number {
  return metres * CALORIES_PER_M;
}
