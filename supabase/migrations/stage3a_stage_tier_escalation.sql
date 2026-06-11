-- Stage 3a: Stage-based tier escalation for open_forfeit_vote.
-- Run this in the Supabase SQL editor against the live database (after Stage 3).
--
-- Tier rules:
--   - Each forfeit-vote stage maps to a "stage tier" reflecting its stakes:
--       GROUP_STAGE    -> 1
--       LAST_32        -> 1
--       LAST_16        -> 2
--       QUARTER_FINALS -> 2
--       SEMI_FINALS    -> 3
--       FINAL          -> 3
--   - group.max_tier remains a hard CAP: effective_tier = LEAST(stage_tier, max_tier).
--     A tier-1 group never draws tier-2/3 forfeits, regardless of stage.
--   - The pool is now an EXACT match on effective_tier (tier = effective_tier), not
--     tier <= effective_tier — low-stakes stages can't pull high-tier forfeits and
--     vice versa. Each stage draws only from its own effective tier.

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
  v_stage_tier int;
  v_effective_tier int;
  v_pool_count int;
  v_session_id uuid;
begin
  if exists (select 1 from forfeit_vote_sessions where group_id = p_group_id and status = 'open') then
    raise exception 'VOTE_ALREADY_OPEN';
  end if;

  select max_tier into v_max_tier from groups where id = p_group_id;

  v_stage_tier := case p_stage
    when 'GROUP_STAGE' then 1
    when 'LAST_32' then 1
    when 'LAST_16' then 2
    when 'QUARTER_FINALS' then 2
    when 'SEMI_FINALS' then 3
    when 'FINAL' then 3
    else null
  end;

  if v_stage_tier is null then
    raise exception 'INVALID_STAGE';
  end if;

  v_effective_tier := least(v_stage_tier, v_max_tier);

  select count(*) into v_pool_count from (
    select 1 from forfeit_library where tier = v_effective_tier
    union all
    select 1 from custom_forfeits where group_id = p_group_id and status = 'approved' and tier = v_effective_tier
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
    from forfeit_library where tier = v_effective_tier
    union all
    select null::int as library_id, id as custom_forfeit_id
    from custom_forfeits where group_id = p_group_id and status = 'approved' and tier = v_effective_tier
  ) pool
  order by random()
  limit 3;

  return v_session_id;
end; $$;
