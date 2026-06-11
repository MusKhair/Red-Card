-- Stage 1: Forfeit voting + custom forfeits + side bets + tournament awards
-- Schema migrations + RLS only. Run this in the Supabase SQL editor against the
-- existing production database (the one matching the pre-Stage-1 supabase/schema.sql).
--
-- Locked decisions baked into this migration:
--  - is_boss = (stage === 'FINAL'), set at vote-open time in Stage 2 — no separate trigger/column logic here
--    beyond the plain `is_boss boolean` columns.
--  - Free tier football-data: `squads` is a hand-seeded table (not synced), `matches.goalscorers`
--    is populated via host-entry (not from football-data `match.goals`).
--  - `forfeit_votes` / `custom_forfeit_approval_votes` use `on conflict ... do update` at the RPC
--    layer (Stage 2/3) — no schema impact, just noted here for context.
--  - "forfeits: host assigns" policy is INTENTIONALLY KEPT — dropping it is deferred to Stage 3
--    when the vote-based assign flow replaces /api/forfeit/assign.

-- ============ CUSTOM FORFEITS ============
create table public.custom_forfeits (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  tier int not null check (tier between 1 and 3),
  status text not null default 'pending_approval'
    check (status in ('pending_approval','approved','rejected_vote')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index custom_forfeits_group_status_idx on public.custom_forfeits(group_id, status);

create table public.custom_forfeit_approval_votes (
  custom_forfeit_id uuid not null references public.custom_forfeits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  approve boolean not null,
  voted_at timestamptz not null default now(),
  primary key (custom_forfeit_id, user_id)
);

-- ============ FORFEIT VOTE SESSIONS / OPTIONS / VOTES ============
create table public.forfeit_vote_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  loser_id uuid not null references public.profiles(id) on delete cascade,
  stage text not null,
  is_boss boolean not null default false,
  status text not null default 'open' check (status in ('open','closed','voided')),
  opened_by uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  closes_at timestamptz not null default (now() + interval '24 hours'),
  closed_at timestamptz,
  winning_option_id uuid,
  resulting_forfeit_id uuid,
  veto_origin_session_id uuid references public.forfeit_vote_sessions(id)
);
create unique index one_open_vote_per_group
  on public.forfeit_vote_sessions(group_id) where status = 'open';
create index forfeit_vote_sessions_group_idx on public.forfeit_vote_sessions(group_id);

create table public.forfeit_vote_options (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.forfeit_vote_sessions(id) on delete cascade,
  library_id int references public.forfeit_library(id),
  custom_forfeit_id uuid references public.custom_forfeits(id),
  check (
    (library_id is not null and custom_forfeit_id is null) or
    (library_id is null and custom_forfeit_id is not null)
  )
);
create index forfeit_vote_options_session_idx on public.forfeit_vote_options(session_id);

alter table public.forfeit_vote_sessions
  add constraint forfeit_vote_sessions_winning_option_fk
  foreign key (winning_option_id) references public.forfeit_vote_options(id);

create table public.forfeit_votes (
  session_id uuid not null references public.forfeit_vote_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_id uuid not null references public.forfeit_vote_options(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- ============ FORFEITS: link to custom forfeits / vote sessions, boss flag ============
alter table public.forfeits
  alter column library_id drop not null;

alter table public.forfeits
  add column custom_forfeit_id uuid references public.custom_forfeits(id),
  add column is_boss boolean not null default false,
  add column vote_session_id uuid references public.forfeit_vote_sessions(id),
  add constraint forfeits_source_check check (
    (library_id is not null and custom_forfeit_id is null) or
    (library_id is null and custom_forfeit_id is not null)
  );

alter table public.forfeit_vote_sessions
  add constraint forfeit_vote_sessions_resulting_forfeit_fk
  foreign key (resulting_forfeit_id) references public.forfeits(id);

-- ============ PLAYER PREDICTIONS (per-match goal scorer side bet) ============
create table public.player_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id bigint not null references public.matches(id) on delete cascade,
  player_name text not null,
  points int,
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- ============ TOURNAMENT-LONG AWARDS ============
create table public.tournament_predictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  winner_team text,
  golden_boot_player text,
  winner_points int,
  golden_boot_points int,
  updated_at timestamptz not null default now()
);

create table public.tournament_award_resolutions (
  award text primary key check (award in ('tournament_winner','golden_boot')),
  resolved_at timestamptz not null default now(),
  winning_value text not null,
  details jsonb
);

-- ============ SQUADS (hand-seeded fallback for player autocomplete) ============
create table public.squads (
  team_name text not null,
  player_name text not null,
  position text,
  primary key (team_name, player_name)
);

-- ============ MATCHES: goalscorers + winner ============
alter table public.matches
  add column goalscorers jsonb,
  add column winner text check (winner in ('HOME_TEAM','AWAY_TEAM','DRAW'));

-- ============ LEADERBOARD VIEW: pre-aggregate each point source to avoid fan-out ============
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
join public.profiles p on p.id = gm.user_id
left join (
  select user_id, sum(points) as total, count(*) filter (where points = 5) as exact_hits
  from public.predictions where points is not null group by user_id
) pr on pr.user_id = gm.user_id
left join (
  select user_id, sum(points) as total
  from public.player_predictions where points is not null group by user_id
) pp on pp.user_id = gm.user_id
left join public.tournament_predictions tp on tp.user_id = gm.user_id;

-- ============ RLS: enable on all new tables ============
alter table public.custom_forfeits enable row level security;
alter table public.custom_forfeit_approval_votes enable row level security;
alter table public.forfeit_vote_sessions enable row level security;
alter table public.forfeit_vote_options enable row level security;
alter table public.forfeit_votes enable row level security;
alter table public.player_predictions enable row level security;
alter table public.tournament_predictions enable row level security;
alter table public.tournament_award_resolutions enable row level security;
alter table public.squads enable row level security;

-- ============ RLS: policies ============
create policy "custom_forfeits: members read" on public.custom_forfeits
  for select to authenticated using (public.is_member(group_id));
create policy "custom_forfeits: member proposes" on public.custom_forfeits
  for insert to authenticated with check (
    proposer_id = auth.uid()
    and public.is_member(group_id)
    and tier <= (select max_tier from groups where id = group_id)
    and status = 'pending_approval'
  );

create policy "approval_votes: members read" on public.custom_forfeit_approval_votes
  for select to authenticated using (
    exists (select 1 from custom_forfeits cf where cf.id = custom_forfeit_id and public.is_member(cf.group_id))
  );

create policy "vote_sessions: members read" on public.forfeit_vote_sessions
  for select to authenticated using (public.is_member(group_id));
create policy "vote_options: members read" on public.forfeit_vote_options
  for select to authenticated using (
    exists (select 1 from forfeit_vote_sessions s where s.id = session_id and public.is_member(s.group_id))
  );
create policy "votes: members read" on public.forfeit_votes
  for select to authenticated using (
    exists (select 1 from forfeit_vote_sessions s where s.id = session_id and public.is_member(s.group_id))
  );

create policy "player_predictions: read own, or others after kickoff in shared group" on public.player_predictions
  for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from group_members a join group_members b on a.group_id = b.group_id
        where a.user_id = auth.uid() and b.user_id = player_predictions.user_id
      )
      and exists (select 1 from matches m where m.id = player_predictions.match_id and m.kickoff <= now())
    )
  );
create policy "player_predictions: insert own before kickoff" on public.player_predictions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from matches m where m.id = match_id and m.kickoff > now())
  );
create policy "player_predictions: update own before kickoff" on public.player_predictions
  for update to authenticated using (user_id = auth.uid())
  with check (exists (select 1 from matches m where m.id = match_id and m.kickoff > now()));

create policy "tournament_predictions: read own, or others after first kickoff in shared group" on public.tournament_predictions
  for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from group_members a join group_members b on a.group_id = b.group_id
        where a.user_id = auth.uid() and b.user_id = tournament_predictions.user_id
      )
      and now() > (select min(kickoff) from matches)
    )
  );
create policy "tournament_predictions: insert own before first kickoff" on public.tournament_predictions
  for insert to authenticated with check (
    user_id = auth.uid() and now() < (select min(kickoff) from matches)
  );
create policy "tournament_predictions: update own before first kickoff" on public.tournament_predictions
  for update to authenticated using (user_id = auth.uid())
  with check (now() < (select min(kickoff) from matches));

create policy "award_resolutions: read all (authed)" on public.tournament_award_resolutions
  for select to authenticated using (true);

create policy "squads: read all (authed)" on public.squads
  for select to authenticated using (true);
