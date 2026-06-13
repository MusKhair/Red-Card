/**
 * Scoring (90-minute result, stated in the UI):
 *  - Exact score: 5 pts (e.g. predicted 2-1, actual 2-1; or predicted 1-1, actual 1-1)
 *  - Correct goal difference: 3 pts (e.g. predicted 3-2, actual 2-1; or predicted 1-1, actual 2-2)
 *  - Correct winner only: 1 pt (e.g. predicted 1-0 home win, actual 3-1 home win)
 *  - Otherwise: 0
 *
 * Draws are scored the same way — same goal difference (0) hits +3, exact draw hits +5.
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
