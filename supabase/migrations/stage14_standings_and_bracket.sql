-- Stage 14: group standings table and knockout bracket support.
--
-- team_groups is a derived table (TRUNCATED and rebuilt on every sync by
-- populate_team_groups()). It maps each team name to a letter A–L using
-- two-pass connected-component clustering over GROUP_STAGE match pairings.
--
-- group_standings is a view that aggregates finished GROUP_STAGE results
-- per team, joined to team_groups for group assignment.
--
-- populate_team_groups() is called from syncMatchesAndScore() at the end of
-- every successful sync. It is a no-op when no GROUP_STAGE matches exist yet.

-- ============ TEAM GROUPS ============
create table public.team_groups (
  team_name    text primary key,
  group_letter text not null check (group_letter ~ '^[A-L]$'),
  country_code text   -- reserved; not currently populated
);

alter table public.team_groups enable row level security;
create policy "team_groups: read all (authed)" on public.team_groups
  for select to authenticated using (true);

-- ============ GROUP STANDINGS VIEW ============
-- security_invoker: queries run with the caller's permissions.
-- team_groups and matches both carry "read all authed" policies so any
-- signed-in user can query this view.
create or replace view public.group_standings
with (security_invoker = true) as
with
  -- Finished GROUP_STAGE matches with confirmed scores
  gs_finished as (
    select home_team, away_team, home_score, away_score
    from public.matches
    where stage = 'GROUP_STAGE'
      and status = 'FINISHED'
      and home_score is not null
      and away_score is not null
  ),
  -- One row per participating team per finished match
  per_team as (
    select home_team as team_name, home_score as gf, away_score as ga from gs_finished
    union all
    select away_team,              away_score,        home_score        from gs_finished
  ),
  -- Aggregate wins / draws / losses / goals
  aggregated as (
    select
      team_name,
      count(*)::int                                          as matches_played,
      count(*) filter (where gf > ga)::int                   as wins,
      count(*) filter (where gf = ga)::int                   as draws,
      count(*) filter (where gf < ga)::int                   as losses,
      coalesce(sum(gf), 0)::int                             as goals_for,
      coalesce(sum(ga), 0)::int                             as goals_against,
      coalesce(sum(gf - ga), 0)::int                        as goal_difference,
      (count(*) filter (where gf > ga) * 3
       + count(*) filter (where gf = ga))::int               as points
    from per_team
    group by team_name
  ),
  -- One crest per team (either home or away, whichever is non-null)
  team_crests as (
    select team_name, max(crest) as team_crest
    from (
      select home_team as team_name, home_crest as crest
        from public.matches where stage = 'GROUP_STAGE' and home_crest is not null
      union all
      select away_team, away_crest
        from public.matches where stage = 'GROUP_STAGE' and away_crest is not null
    ) c
    group by team_name
  )
select
  tg.group_letter,
  tg.team_name,
  tc.team_crest,
  coalesce(a.matches_played,  0) as matches_played,
  coalesce(a.wins,            0) as wins,
  coalesce(a.draws,           0) as draws,
  coalesce(a.losses,          0) as losses,
  coalesce(a.goals_for,       0) as goals_for,
  coalesce(a.goals_against,   0) as goals_against,
  coalesce(a.goal_difference, 0) as goal_difference,
  coalesce(a.points,          0) as points
from public.team_groups tg
left join aggregated  a  on a.team_name  = tg.team_name
left join team_crests tc on tc.team_name = tg.team_name
order by
  tg.group_letter,
  coalesce(a.points,         0) desc,
  coalesce(a.goal_difference,0) desc,
  coalesce(a.goals_for,      0) desc,
  tg.team_name;

-- ============ POPULATE TEAM GROUPS ============
-- Two-pass label propagation over the GROUP_STAGE match graph.
--
-- Why two passes? Each WC group is a K4 (4 teams, each pair plays once = 6 edges).
-- When the football-data API returns ALL scheduled GROUP_STAGE matches (which it does
-- from the day the draw is held, even before a single ball is kicked), one pass is
-- enough: every team's root = MIN(self, all opponents) collapses all four teams to
-- the same root.  Two passes handle the edge case where only partial scheduling data
-- exists (e.g., a newly-created test environment).
--
-- TRUNCATE + rebuild on every call keeps letter assignments stable and consistent
-- across syncs — no drift from incremental inserts into a partially-filled table.
create or replace function public.populate_team_groups()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from matches where stage = 'GROUP_STAGE' limit 1) then
    return;
  end if;

  truncate team_groups;

  with
  -- Undirected edges: home_team ↔ away_team means "same group"
  edges as (
    select home_team as a, away_team as b from matches where stage = 'GROUP_STAGE'
    union all
    select away_team, home_team             from matches where stage = 'GROUP_STAGE'
  ),
  all_teams as (
    select distinct a as team_name from edges
  ),
  -- Pass 1: each team's root = MIN(self, all direct opponents)
  pass1 as (
    select t.team_name,
           least(t.team_name, min(e.b)) as root
    from all_teams t
    left join edges e on e.a = t.team_name
    group by t.team_name
  ),
  -- Pass 2: each team adopts MIN(pass1_root, MIN(all neighbours' pass1_roots))
  pass2 as (
    select p.team_name,
           least(p.root, coalesce(min(p2.root), p.root)) as root
    from pass1 p
    left join edges  e  on e.a          = p.team_name
    left join pass1  p2 on p2.team_name = e.b
    group by p.team_name, p.root
  ),
  -- Assign letters 'A', 'B', ... to distinct roots, sorted alphabetically
  root_rank as (
    select root,
           (row_number() over (order by root) - 1)::int as idx
    from (select distinct root from pass2) r
  )
  insert into team_groups (team_name, group_letter)
  select p.team_name,
         chr(65 + rr.idx)        -- 65 = ASCII 'A'
  from pass2 p
  join root_rank rr on rr.root = p.root
  where rr.idx < 12;             -- safety: A–L only
end;
$$;
