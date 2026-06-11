-- Stage 2: Forfeit voting infrastructure — RPCs only, no app code changes.
-- Run this in the Supabase SQL editor against the live database (after Stage 1).

-- ============ open_forfeit_vote ============
-- Security definer: caller can't preview/influence which 3 options get drawn.
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

-- ============ cast_forfeit_vote ============
-- Security definer, single transaction. `for update` on the session row serializes
-- concurrent votes for the same session so the close-on-threshold check below is race-free.
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

-- ============ close_forfeit_vote_session ============
-- Security definer, internal helper. Called from cast_forfeit_vote (threshold reached)
-- and the 24h cron sweep. Idempotent: re-checks the close conditions itself so a stray
-- direct call can't force an early close with a near-empty tally.
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
