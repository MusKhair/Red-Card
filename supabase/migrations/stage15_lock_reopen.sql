-- Stage 15: reopen tournament predictions for 1 day.
--
-- New lock cutoff: 2026-07-02 23:59:59 UTC (was 2026-06-24 23:59:59 UTC).

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
      and now() > '2026-07-02 23:59:59+00'
    )
  );

create policy "tournament_predictions: insert own before lock" on public.tournament_predictions
  for insert to authenticated with check (
    user_id = auth.uid() and now() < '2026-07-02 23:59:59+00'
  );

create policy "tournament_predictions: update own before lock" on public.tournament_predictions
  for update to authenticated using (user_id = auth.uid())
  with check (now() < '2026-07-02 23:59:59+00');
