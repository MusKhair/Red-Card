-- RedCard schema. Run in Supabase SQL editor, then run seed.sql.

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Player',
  avatar_url text,
  dob date,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Player'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ GROUPS ============
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_id uuid not null references public.profiles(id),
  max_tier int not null default 1 check (max_tier between 1 and 3),
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier3_opt_in boolean not null default false,
  veto_used boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ============ MATCHES (synced from football-data.org) ============
create table public.matches (
  id bigint primary key,            -- football-data match id
  stage text not null,              -- GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL ...
  home_team text,
  away_team text,
  home_crest text,
  away_crest text,
  kickoff timestamptz not null,
  status text not null default 'TIMED',
  home_score int,
  away_score int,
  scored boolean not null default false,  -- points already awarded
  goalscorers jsonb,                      -- [{type, scorer:{name}}, ...] — host-entered (Free tier has no goal data)
  winner text check (winner in ('HOME_TEAM','AWAY_TEAM','DRAW'))
);

create table public.sync_state (
  id int primary key default 1 check (id = 1),
  last_sync timestamptz
);
insert into public.sync_state (id, last_sync) values (1, null);

-- ============ PREDICTIONS (one per user per match, global) ============
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id bigint not null references public.matches(id) on delete cascade,
  pred_home int not null check (pred_home between 0 and 20),
  pred_away int not null check (pred_away between 0 and 20),
  points int,
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

-- ============ FORFEITS ============
create table public.forfeit_library (
  id serial primary key,
  tier int not null check (tier between 1 and 3),
  title text not null,
  description text not null,
  proof text not null default 'Photo or video in the group chat'
);

create table public.forfeits (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  library_id int references public.forfeit_library(id),  -- null when custom_forfeit_id is set
  stage text not null,
  status text not null default 'assigned' check (status in ('assigned','vetoed','completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============ FORFEIT VOTING + CUSTOM FORFEITS ============
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

-- forfeits: link to custom forfeits / vote sessions, flag the tournament "boss" forfeit
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

-- ============ LEADERBOARD VIEW ============
-- Pre-aggregate each point source before joining to avoid row fan-out
-- double-counting across predictions / player_predictions / tournament_predictions.
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

-- ============ JOIN-BY-CODE (security definer dodges RLS chicken-and-egg) ============
create or replace function public.get_group_by_code(code text)
returns table (id uuid, name text, max_tier int, host_name text, member_count bigint)
language sql security definer set search_path = public as $$
  select g.id, g.name, g.max_tier, p.display_name,
         (select count(*) from group_members gm where gm.group_id = g.id)
  from groups g join profiles p on p.id = g.host_id
  where g.invite_code = upper(code);
$$;

create or replace function public.join_group(code text, accept_tier3 boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare g record; user_dob date; age int;
begin
  select * into g from groups where invite_code = upper(code);
  if g.id is null then raise exception 'INVALID_CODE'; end if;

  select dob into user_dob from profiles where id = auth.uid();
  if user_dob is null then raise exception 'DOB_REQUIRED'; end if;
  age := date_part('year', age(user_dob));

  if g.max_tier > 1 and age < 18 then raise exception 'UNDER_18_TIER_CAP'; end if;
  if g.max_tier = 3 and not accept_tier3 then raise exception 'TIER3_CONSENT_REQUIRED'; end if;

  insert into group_members (group_id, user_id, tier3_opt_in)
  values (g.id, auth.uid(), accept_tier3)
  on conflict (group_id, user_id) do nothing;
  return g.id;
end; $$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.forfeit_library enable row level security;
alter table public.forfeits enable row level security;
alter table public.sync_state enable row level security;
alter table public.custom_forfeits enable row level security;
alter table public.custom_forfeit_approval_votes enable row level security;
alter table public.forfeit_vote_sessions enable row level security;
alter table public.forfeit_vote_options enable row level security;
alter table public.forfeit_votes enable row level security;
alter table public.player_predictions enable row level security;
alter table public.tournament_predictions enable row level security;
alter table public.tournament_award_resolutions enable row level security;
alter table public.squads enable row level security;

-- helper: is the current user in a group?
create or replace function public.is_member(gid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create policy "profiles: read all (authed)" on public.profiles
  for select to authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid());

create policy "groups: members read" on public.groups
  for select to authenticated using (public.is_member(id) or host_id = auth.uid());
create policy "groups: create as host" on public.groups
  for insert to authenticated with check (host_id = auth.uid());

create policy "members: read own groups" on public.group_members
  for select to authenticated using (public.is_member(group_id));
create policy "members: update self" on public.group_members
  for update to authenticated using (user_id = auth.uid());

create policy "matches: read all (authed)" on public.matches
  for select to authenticated using (true);

create policy "predictions: read own, or others after kickoff in shared group" on public.predictions
  for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from group_members a join group_members b on a.group_id = b.group_id
        where a.user_id = auth.uid() and b.user_id = predictions.user_id
      )
      and exists (select 1 from matches m where m.id = predictions.match_id and m.kickoff <= now())
    )
  );
create policy "predictions: insert own before kickoff" on public.predictions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from matches m where m.id = match_id and m.kickoff > now())
  );
create policy "predictions: update own before kickoff" on public.predictions
  for update to authenticated using (user_id = auth.uid())
  with check (exists (select 1 from matches m where m.id = match_id and m.kickoff > now()));

create policy "library: read all (authed)" on public.forfeit_library
  for select to authenticated using (true);

create policy "forfeits: members read" on public.forfeits
  for select to authenticated using (public.is_member(group_id));
create policy "forfeits: host assigns" on public.forfeits
  for insert to authenticated with check (
    exists (select 1 from groups g where g.id = group_id and g.host_id = auth.uid())
  );
create policy "forfeits: host updates" on public.forfeits
  for update to authenticated using (
    exists (select 1 from groups g where g.id = group_id and g.host_id = auth.uid())
  );

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

-- ============ VETO (security definer: loser can't hand-pick the replacement) ============
create or replace function public.veto_forfeit(fid uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare f record; gmax int; replacement_lib int; new_id uuid;
begin
  select * into f from forfeits where id = fid;
  if f.id is null then raise exception 'NOT_FOUND'; end if;
  if f.user_id <> auth.uid() then raise exception 'NOT_YOUR_FORFEIT'; end if;
  if f.status <> 'assigned' then raise exception 'ALREADY_RESOLVED'; end if;
  if exists (select 1 from group_members where group_id = f.group_id and user_id = auth.uid() and veto_used) then
    raise exception 'VETO_ALREADY_USED';
  end if;

  select max_tier into gmax from groups where id = f.group_id;

  select id into replacement_lib from forfeit_library
  where tier <= gmax and id <> f.library_id
  order by random() limit 1;
  if replacement_lib is null then raise exception 'NO_REPLACEMENT'; end if;

  update forfeits set status = 'vetoed' where id = f.id;
  update group_members set veto_used = true where group_id = f.group_id and user_id = auth.uid();

  insert into forfeits (group_id, user_id, library_id, stage)
  values (f.group_id, f.user_id, replacement_lib, f.stage)
  returning id into new_id;
  return new_id;
end; $$;

-- ============ FORFEIT VOTING RPCs ============
-- open_forfeit_vote: security definer so the caller can't preview/influence which 3 options get drawn.
create or replace function public.open_forfeit_vote(
  p_group_id uuid,
  p_loser_id uuid,
  p_stage text,
  p_is_boss boolean,
  p_veto_origin uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_max_tier int;
  v_pool_count int;
  v_session_id uuid;
begin
  if exists (select 1 from forfeit_vote_sessions where group_id = p_group_id and status = 'open') then
    raise exception 'VOTE_ALREADY_OPEN';
  end if;

  select max_tier into v_max_tier from groups where id = p_group_id;

  select count(*) into v_pool_count from (
    select 1 from forfeit_library where tier <= v_max_tier
    union all
    select 1 from custom_forfeits where group_id = p_group_id and status = 'approved' and tier <= v_max_tier
  ) pool;

  if v_pool_count < 3 then
    raise exception 'INSUFFICIENT_POOL';
  end if;

  insert into forfeit_vote_sessions (group_id, loser_id, stage, is_boss, opened_by, veto_origin_session_id)
  values (p_group_id, p_loser_id, p_stage, p_is_boss, auth.uid(), p_veto_origin)
  returning id into v_session_id;

  insert into forfeit_vote_options (session_id, library_id, custom_forfeit_id)
  select v_session_id, library_id, custom_forfeit_id
  from (
    select id as library_id, null::uuid as custom_forfeit_id
    from forfeit_library where tier <= v_max_tier
    union all
    select null::int as library_id, id as custom_forfeit_id
    from custom_forfeits where group_id = p_group_id and status = 'approved' and tier <= v_max_tier
  ) pool
  order by random()
  limit 3;

  return v_session_id;
end; $$;

-- cast_forfeit_vote: security definer, single transaction. `for update` on the session row
-- serializes concurrent votes so the close-on-threshold check below is race-free.
create or replace function public.cast_forfeit_vote(p_session_id uuid, p_option_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session record;
  v_eligible int;
  v_cast_count int;
  v_closed boolean := false;
begin
  select * into v_session from forfeit_vote_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception 'NOT_FOUND'; end if;
  if v_session.status <> 'open' then raise exception 'VOTE_CLOSED'; end if;
  if not public.is_member(v_session.group_id) then raise exception 'NOT_A_MEMBER'; end if;
  if auth.uid() = v_session.loser_id then raise exception 'LOSER_CANNOT_VOTE'; end if;
  if not exists (select 1 from forfeit_vote_options where id = p_option_id and session_id = p_session_id) then
    raise exception 'INVALID_OPTION';
  end if;

  insert into forfeit_votes (session_id, user_id, option_id)
  values (p_session_id, auth.uid(), p_option_id)
  on conflict (session_id, user_id) do update set option_id = excluded.option_id, voted_at = now();

  select count(*) into v_eligible from group_members
  where group_id = v_session.group_id and user_id <> v_session.loser_id;

  select count(*) into v_cast_count from forfeit_votes where session_id = p_session_id;

  if v_cast_count >= v_eligible then
    perform public.close_forfeit_vote_session(p_session_id);
    v_closed := true;
  end if;

  return jsonb_build_object('closed', v_closed);
end; $$;

-- close_forfeit_vote_session: security definer, internal helper. Called from cast_forfeit_vote
-- (threshold reached) and the 24h cron sweep. Idempotent: re-checks the close conditions itself
-- so a stray direct call can't force an early close with a near-empty tally.
create or replace function public.close_forfeit_vote_session(p_session_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_session record;
  v_eligible int;
  v_cast_count int;
  v_winning_option_id uuid;
  v_library_id int;
  v_custom_forfeit_id uuid;
  v_resulting_forfeit_id uuid;
begin
  select * into v_session from forfeit_vote_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception 'NOT_FOUND'; end if;
  if v_session.status <> 'open' then
    return v_session.resulting_forfeit_id;
  end if;

  select count(*) into v_eligible from group_members
  where group_id = v_session.group_id and user_id <> v_session.loser_id;
  select count(*) into v_cast_count from forfeit_votes where session_id = p_session_id;

  if v_cast_count < v_eligible and v_session.closes_at > now() then
    return null;
  end if;

  -- Tally votes per option; ties (including the all-zero case) resolve randomly.
  with tallies as (
    select o.id as option_id, count(v.user_id) as votes
    from forfeit_vote_options o
    left join forfeit_votes v on v.option_id = o.id
    where o.session_id = p_session_id
    group by o.id
  ), maxv as (
    select max(votes) as m from tallies
  )
  select option_id into v_winning_option_id
  from tallies, maxv
  where tallies.votes = maxv.m
  order by random()
  limit 1;

  select library_id, custom_forfeit_id into v_library_id, v_custom_forfeit_id
  from forfeit_vote_options where id = v_winning_option_id;

  insert into forfeits (group_id, user_id, library_id, custom_forfeit_id, stage, status, is_boss, vote_session_id)
  values (v_session.group_id, v_session.loser_id, v_library_id, v_custom_forfeit_id, v_session.stage, 'assigned', v_session.is_boss, p_session_id)
  returning id into v_resulting_forfeit_id;

  update forfeit_vote_sessions
  set status = 'closed', closed_at = now(), winning_option_id = v_winning_option_id, resulting_forfeit_id = v_resulting_forfeit_id
  where id = p_session_id;

  return v_resulting_forfeit_id;
end; $$;
