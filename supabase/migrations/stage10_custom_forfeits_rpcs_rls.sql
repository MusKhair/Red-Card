-- Stage 10: custom forfeit proposals — group approval voting (UI + API).
--
-- custom_forfeits / custom_forfeit_approval_votes already exist (Stage 1), and
-- open_forfeit_vote already pulls status = 'approved' rows into the random pool
-- (Stage 3a) — no changes needed there. This stage adds:
--   1. custom_forfeits.proof (mirrors forfeit_library.proof)
--   2. swap the unused 'rejected_vote' status for 'rejected' (host-manual reject)
--   3. cast_custom_approval_vote RPC (strict-majority approval, vote-changing allowed)
--   4. RLS: proposer/host delete, host-manual-reject update

alter table public.custom_forfeits
  add column proof text not null default 'Photo or video in the group chat';

alter table public.custom_forfeits drop constraint custom_forfeits_status_check;
alter table public.custom_forfeits add constraint custom_forfeits_status_check
  check (status in ('pending_approval','approved','rejected'));

-- cast_custom_approval_vote: security definer, single transaction. `for update` on the
-- custom_forfeits row serializes concurrent votes so the threshold check is race-free.
-- Approval = strict majority of group_members (yes_count > floor(member_count / 2)).
-- No auto-rejection — a proposal sits at 'pending_approval' forever until either this
-- threshold is hit, or the host/proposer removes it (see RLS below).
create or replace function public.cast_custom_approval_vote(p_custom_forfeit_id uuid, p_vote boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cf record;
  v_member_count int;
  v_yes_count int;
  v_no_count int;
  v_threshold int;
  v_approved boolean := false;
begin
  select * into v_cf from custom_forfeits where id = p_custom_forfeit_id for update;
  if v_cf.id is null then raise exception 'NOT_FOUND'; end if;
  if v_cf.status <> 'pending_approval' then raise exception 'NOT_PENDING'; end if;
  if not public.is_member(v_cf.group_id) then raise exception 'NOT_A_MEMBER'; end if;

  insert into custom_forfeit_approval_votes (custom_forfeit_id, user_id, approve)
  values (p_custom_forfeit_id, auth.uid(), p_vote)
  on conflict (custom_forfeit_id, user_id) do update set approve = excluded.approve, voted_at = now();

  select count(*) into v_member_count from group_members where group_id = v_cf.group_id;
  select count(*) into v_yes_count from custom_forfeit_approval_votes where custom_forfeit_id = p_custom_forfeit_id and approve;
  select count(*) into v_no_count from custom_forfeit_approval_votes where custom_forfeit_id = p_custom_forfeit_id and not approve;
  v_threshold := v_member_count / 2; -- integer division = floor

  if v_yes_count > v_threshold then
    update custom_forfeits set status = 'approved', resolved_at = now() where id = p_custom_forfeit_id;
    v_approved := true;
  end if;

  return jsonb_build_object(
    'yes_count', v_yes_count,
    'no_count', v_no_count,
    'member_count', v_member_count,
    'threshold', v_threshold,
    'approved', v_approved
  );
end; $$;

-- custom_forfeits: proposer (while still pending) or the group host can delete a
-- proposal. Host can also delete resolved (approved/rejected) proposals to clean house.
create policy "custom_forfeits: proposer or host deletes" on public.custom_forfeits
  for delete to authenticated using (
    (proposer_id = auth.uid() and status = 'pending_approval')
    or exists (select 1 from groups g where g.id = group_id and g.host_id = auth.uid())
  );

-- custom_forfeits: host can manually reject a pending proposal without deleting it.
-- (The app route additionally checks status = 'pending_approval' before issuing this update.)
create policy "custom_forfeits: host rejects" on public.custom_forfeits
  for update to authenticated using (
    exists (select 1 from groups g where g.id = group_id and g.host_id = auth.uid())
  )
  with check (status = 'rejected');
