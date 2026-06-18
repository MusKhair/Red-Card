-- Stage 12: Golden Ball award (+5 pts, best player) + extend prediction lock to 2026-06-24.
--
-- Changes:
--   1. Add golden_ball_player / golden_ball_points columns to tournament_predictions
--   2. Expand tournament_award_resolutions check constraint to include 'golden_ball'
--   3. Drop and recreate the three tournament_predictions RLS policies with new cutoff
--   4. Rewrite group_leaderboard view to include golden_ball_points in the sum
--   5. New enter_golden_ball_winner RPC (+5 pts, fuzzy_name_match, first-writer-wins)
--   6. Update resolve_tournament_awards to handle golden_ball

-- 1. New columns
alter table public.tournament_predictions
  add column if not exists golden_ball_player text,
  add column if not exists golden_ball_points int;

-- 2. Expand check constraint
alter table public.tournament_award_resolutions
  drop constraint tournament_award_resolutions_award_check;
alter table public.tournament_award_resolutions
  add constraint tournament_award_resolutions_award_check
  check (award in ('tournament_winner', 'golden_boot', 'golden_ball'));

-- 3. Swap RLS policies to the new lock cutoff (2026-06-24 23:59:59 UTC)
drop policy "tournament_predictions: read own, or others after lock" on public.tournament_predictions;
drop policy "tournament_predictions: insert own before lock" on public.tournament_predictions;
drop policy "tournament_predictions: update own before lock" on public.tournament_predictions;

create policy "tournament_predictions: read own, or others after lock" on public.tournament_predictions
  for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from group_members a join group_members b on a.group_id = b.group_id
        where a.user_id = auth.uid() and b.user_id = tournament_predictions.user_id
      )
      and now() > '2026-06-24 23:59:59+00'
    )
  );
create policy "tournament_predictions: insert own before lock" on public.tournament_predictions
  for insert to authenticated with check (
    user_id = auth.uid() and now() < '2026-06-24 23:59:59+00'
  );
create policy "tournament_predictions: update own before lock" on public.tournament_predictions
  for update to authenticated using (user_id = auth.uid())
  with check (now() < '2026-06-24 23:59:59+00');

-- 4. Rewrite group_leaderboard view (adds golden_ball_points to the lateral join + sum)
create or replace view public.group_leaderboard
with (security_invoker = true) as
select
  gm.group_id,
  gm.user_id,
  p.display_name,
  p.avatar_url,
  (
    coalesce(pr.total, 0)
    + coalesce(pp.total, 0)
    + coalesce(tp.winner_points, 0)
    + coalesce(tp.golden_boot_points, 0)
    + coalesce(tp.golden_ball_points, 0)
  )::int as points,
  coalesce(pr.exact_hits, 0)::int as exact_hits
from public.group_members gm
join public.groups g on g.id = gm.group_id
join public.profiles p on p.id = gm.user_id
left join lateral (
  select
    sum(pr2.points) as total,
    count(*) filter (where pr2.points = 5) as exact_hits
  from public.predictions pr2
  join public.matches m on m.id = pr2.match_id
  where pr2.user_id = gm.user_id
    and pr2.points is not null
    and (g.point_cutoff is null or m.kickoff >= g.point_cutoff)
) pr on true
left join lateral (
  select sum(pp2.points) as total
  from public.player_predictions pp2
  join public.matches m on m.id = pp2.match_id
  where pp2.user_id = gm.user_id
    and pp2.points is not null
    and (g.point_cutoff is null or m.kickoff >= g.point_cutoff)
) pp on true
left join lateral (
  select
    case when g.point_cutoff is null or tpr.created_at >= g.point_cutoff
      then tpr.winner_points else 0 end as winner_points,
    case when g.point_cutoff is null or tpr.created_at >= g.point_cutoff
      then tpr.golden_boot_points else 0 end as golden_boot_points,
    case when g.point_cutoff is null or tpr.created_at >= g.point_cutoff
      then tpr.golden_ball_points else 0 end as golden_ball_points
  from public.tournament_predictions tpr
  where tpr.user_id = gm.user_id
) tp on true;

-- 5. enter_golden_ball_winner: security definer, first-writer-wins, +5 pts on match
create or replace function public.enter_golden_ball_winner(p_player_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_rows int;
  v_existing text;
begin
  v_name := trim(coalesce(p_player_name, ''));
  if v_name = '' then
    raise exception 'PLAYER_NAME_REQUIRED';
  end if;

  if not exists (select 1 from matches where stage = 'FINAL' and status = 'FINISHED') then
    raise exception 'FINAL_NOT_FINISHED';
  end if;

  insert into tournament_award_resolutions (award, winning_value)
  values ('golden_ball', v_name)
  on conflict (award) do nothing;
  get diagnostics v_rows = row_count;

  select winning_value into v_existing from tournament_award_resolutions where award = 'golden_ball';

  if v_rows > 0 then
    update tournament_predictions
    set golden_ball_points = case
      when golden_ball_player is not null and public.fuzzy_name_match(golden_ball_player, v_existing) then 5
      else 0
    end;
  end if;

  return jsonb_build_object('winning_value', v_existing, 'newly_resolved', v_rows > 0);
end; $$;

-- 6. Update resolve_tournament_awards to handle golden_ball
create or replace function public.resolve_tournament_awards()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_final record;
  v_winning_team text;
  v_winner_resolved boolean;
  v_golden_boot_value text;
  v_golden_boot_resolved boolean;
  v_golden_ball_value text;
  v_golden_ball_resolved boolean;
begin
  select exists(select 1 from tournament_award_resolutions where award = 'tournament_winner') into v_winner_resolved;

  if not v_winner_resolved then
    select * into v_final from matches
    where stage = 'FINAL' and status = 'FINISHED' and winner is not null
    limit 1;

    if v_final.id is not null then
      v_winning_team := case v_final.winner
        when 'HOME_TEAM' then v_final.home_team
        when 'AWAY_TEAM' then v_final.away_team
        else null
      end;

      if v_winning_team is not null then
        insert into tournament_award_resolutions (award, winning_value, details)
        values ('tournament_winner', v_winning_team, jsonb_build_object('match_id', v_final.id))
        on conflict (award) do nothing;

        update tournament_predictions
        set winner_points = case
          when winner_team is not null and lower(trim(winner_team)) = lower(trim(v_winning_team)) then 15
          else 0
        end;

        v_winner_resolved := true;
      end if;
    end if;
  end if;

  select winning_value into v_golden_boot_value from tournament_award_resolutions where award = 'golden_boot';
  v_golden_boot_resolved := v_golden_boot_value is not null;

  if v_golden_boot_resolved then
    update tournament_predictions
    set golden_boot_points = case
      when golden_boot_player is not null and public.fuzzy_name_match(golden_boot_player, v_golden_boot_value) then 10
      else 0
    end;
  end if;

  select winning_value into v_golden_ball_value from tournament_award_resolutions where award = 'golden_ball';
  v_golden_ball_resolved := v_golden_ball_value is not null;

  if v_golden_ball_resolved then
    update tournament_predictions
    set golden_ball_points = case
      when golden_ball_player is not null and public.fuzzy_name_match(golden_ball_player, v_golden_ball_value) then 5
      else 0
    end;
  end if;

  return jsonb_build_object(
    'winner_resolved', v_winner_resolved,
    'golden_boot_resolved', v_golden_boot_resolved,
    'golden_ball_resolved', v_golden_ball_resolved
  );
end; $$;
