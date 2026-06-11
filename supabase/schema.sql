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
  scored boolean not null default false   -- points already awarded
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
  library_id int not null references public.forfeit_library(id),
  stage text not null,
  status text not null default 'assigned' check (status in ('assigned','vetoed','completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============ LEADERBOARD VIEW ============
create or replace view public.group_leaderboard
with (security_invoker = true) as
select gm.group_id,
       gm.user_id,
       p.display_name,
       p.avatar_url,
       coalesce(sum(pr.points), 0)::int as points,
       count(pr.id) filter (where pr.points = 5)::int as exact_hits
from public.group_members gm
join public.profiles p on p.id = gm.user_id
left join public.predictions pr on pr.user_id = gm.user_id and pr.points is not null
group by gm.group_id, gm.user_id, p.display_name, p.avatar_url;

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
