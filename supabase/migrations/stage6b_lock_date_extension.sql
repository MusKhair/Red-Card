-- Stage 6b: extend the tournament predictions lock cutoff.
-- Run this in the Supabase SQL editor against the live database (after stage6).
--
-- New lock cutoff: 2026-06-20 23:59:59 UTC (was 2026-06-14 23:59:59 UTC). Gives players
-- ~8 days into the tournament (about 2 matchdays per team) to commit picks.

drop policy if exists "tournament_predictions: read own, or others after lock" on public.tournament_predictions;
drop policy if exists "tournament_predictions: insert own before lock" on public.tournament_predictions;
drop policy if exists "tournament_predictions: update own before lock" on public.tournament_predictions;

create policy "tournament_predictions: read own, or others after lock" on public.tournament_predictions
  for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from group_members a join group_members b on a.group_id = b.group_id
        where a.user_id = auth.uid() and b.user_id = tournament_predictions.user_id
      )
      and now() > '2026-06-20 23:59:59+00'
    )
  );

create policy "tournament_predictions: insert own before lock" on public.tournament_predictions
  for insert to authenticated with check (
    user_id = auth.uid() and now() < '2026-06-20 23:59:59+00'
  );

create policy "tournament_predictions: update own before lock" on public.tournament_predictions
  for update to authenticated using (user_id = auth.uid())
  with check (now() < '2026-06-20 23:59:59+00');
