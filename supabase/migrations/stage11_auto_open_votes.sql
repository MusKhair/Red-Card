-- Stage 11: auto-open forfeit votes from the cron sync.
--
-- The open_forfeit_vote RPC stores auth.uid() in opened_by. When called from the
-- admin/service-role client (football.ts cron), auth.uid() is NULL. Make opened_by
-- nullable so NULL can represent "auto-opened by the cron".

alter table public.forfeit_vote_sessions alter column opened_by drop not null;
