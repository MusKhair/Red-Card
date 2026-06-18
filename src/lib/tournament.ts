/**
 * Hardcoded lock cutoff for tournament-long predictions (Winner + Golden Boot).
 * Must match the cutoff baked into the tournament_predictions RLS policies
 * (supabase/migrations/stage6_tournament_predictions.sql).
 */
export const TOURNAMENT_PREDICTIONS_LOCK = "2026-06-24T23:59:59Z";
