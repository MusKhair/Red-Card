-- Stage 8: per-group point cutoff ("start fresh" vs "continue tournament points").
-- Run this in the Supabase SQL editor against the live database (after Stage 7).
--
-- Host chooses at group-creation time:
--   - point_cutoff = NULL                  -> "continue" (count every prediction, current behavior)
--   - point_cutoff = now() at create time  -> "start fresh" (only matches kicking off
--     on/after that moment count toward this group's leaderboard)
--
-- Existing groups are unaffected: point_cutoff defaults to NULL, and the rewritten view
-- below is functionally identical to the previous version whenever point_cutoff IS NULL.

-- ============ groups.point_cutoff ============
alter table public.groups
  add column if not exists point_cutoff timestamptz default null;

-- ============ tournament_predictions.created_at ============
-- Needed to gate tournament-award points (Winner/Golden Boot) by the group's cutoff: a
-- pick made before a "start fresh" group's cutoff doesn't count for that group. The
-- upsert in TournamentPredictionsForm only sets updated_at, so created_at stays fixed
-- at the row's first-insert time across later edits.
alter table public.tournament_predictions
  add column if not exists created_at timestamptz not null default now();

-- ============ group_leaderboard: cutoff-aware rewrite ============
-- predictions / player_predictions / tournament_predictions are global (one row per
-- user, not per-group), so per-group cutoff filtering can no longer be pre-aggregated
-- once globally. Each (group, member) pair now gets its own lateral aggregate, filtered
-- by that group's point_cutoff. When point_cutoff IS NULL every filter below is a no-op,
-- so this is functionally identical to the previous view for every existing group.
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
      then tpr.golden_boot_points else 0 end as golden_boot_points
  from public.tournament_predictions tpr
  where tpr.user_id = gm.user_id
) tp on true;
