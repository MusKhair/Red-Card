-- Stage 7: member management (leave group / delete group / kick member).
-- Run this in the Supabase SQL editor against the live database.
--
-- Adds the missing DELETE policies for `groups` and `group_members`. No FK/cascade
-- changes — verified against schema.sql that the full dependency graph already
-- cascades from groups.id:
--   group_members.group_id            -> groups.id            ON DELETE CASCADE
--   forfeits.group_id                 -> groups.id            ON DELETE CASCADE
--   custom_forfeits.group_id          -> groups.id            ON DELETE CASCADE
--   forfeit_vote_sessions.group_id    -> groups.id            ON DELETE CASCADE
--   forfeit_vote_options.session_id   -> forfeit_vote_sessions.id ON DELETE CASCADE
--   forfeit_votes.session_id          -> forfeit_vote_sessions.id ON DELETE CASCADE
--   custom_forfeit_approval_votes.custom_forfeit_id -> custom_forfeits.id ON DELETE CASCADE
-- The remaining cross-references (forfeits.vote_session_id, forfeit_vote_sessions.
-- resulting_forfeit_id/winning_option_id, forfeit_vote_options.custom_forfeit_id,
-- forfeits.custom_forfeit_id, etc.) are all "ON DELETE NO ACTION" by default, but
-- both sides of every such reference live inside the same groups.id cascade tree,
-- so they're deleted together within the single DELETE statement and the
-- (statement-end-checked) NO ACTION constraints never see a dangling row.
--
-- `predictions` and `player_predictions` are tied to (user_id, match_id), not
-- group_id — intentionally NOT cleaned up here. A user's predictions are shared
-- across every group they're in for the tournament, so they must survive both a
-- member leaving a group and a group being deleted. This matches the leave-group
-- confirm copy: "Your predictions stay for historical scoring but you'll be
-- removed from the leaderboard" (group_leaderboard joins through group_members,
-- so removing that row alone drops the user from this group's table).

-- groups: only the host can delete their own group.
create policy "groups: host deletes own group" on public.groups
  for delete to authenticated using (host_id = auth.uid());

-- group_members: a member can remove their own row (leave group).
create policy "members: leave own group" on public.group_members
  for delete to authenticated using (user_id = auth.uid());

-- group_members: the host can remove any member's row in a group they host (kick).
create policy "members: host removes member" on public.group_members
  for delete to authenticated using (
    exists (select 1 from groups g where g.id = group_id and g.host_id = auth.uid())
  );
