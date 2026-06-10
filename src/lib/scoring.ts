/**
 * Scoring (90-minute result, stated in the UI):
 *  - Exact score: 5 pts
 *  - Correct winner + correct goal difference: 3 pts
 *  - Correct winner (or correctly predicted a draw, wrong score): 1 pt
 *  - Otherwise: 0
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  if (predHome === actualHome && predAway === actualAway) return 5;
  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;
  const sameOutcome = Math.sign(predDiff) === Math.sign(actualDiff);
  if (sameOutcome && predDiff === actualDiff) return 3;
  if (sameOutcome) return 1;
  return 0;
}
