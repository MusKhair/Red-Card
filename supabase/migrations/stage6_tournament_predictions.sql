-- Stage 6: Tournament-long awards (Golden Boot + Tournament Winner).
-- Run this in the Supabase SQL editor against the live database (after Stage 3a).
--
-- Lock cutoff: hardcoded to 2026-06-14 23:59:59 UTC. After this moment, no inserts/
-- updates to tournament_predictions for anyone — replaces the old "before first
-- kickoff" condition.

-- ============ tournament_predictions RLS — switch to hardcoded lock cutoff ============
drop policy if exists "tournament_predictions: read own, or others after first kickoff in shared group" on public.tournament_predictions;
drop policy if exists "tournament_predictions: insert own before first kickoff" on public.tournament_predictions;
drop policy if exists "tournament_predictions: update own before first kickoff" on public.tournament_predictions;

create policy "tournament_predictions: read own, or others after lock" on public.tournament_predictions
  for select to authenticated using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from group_members a join group_members b on a.group_id = b.group_id
        where a.user_id = auth.uid() and b.user_id = tournament_predictions.user_id
      )
      and now() > '2026-06-14 23:59:59+00'
    )
  );

create policy "tournament_predictions: insert own before lock" on public.tournament_predictions
  for insert to authenticated with check (
    user_id = auth.uid() and now() < '2026-06-14 23:59:59+00'
  );

create policy "tournament_predictions: update own before lock" on public.tournament_predictions
  for update to authenticated using (user_id = auth.uid())
  with check (now() < '2026-06-14 23:59:59+00');

-- ============ FUZZY NAME MATCH (simplified — tournament-end resolution only) ============
-- Lowercases, strips non-alphanumeric chars (collapsing runs to single spaces), trims.
-- Diacritics are NOT stripped (no unaccent dependency) — acceptable for a one-time,
-- host-verified entry. Two names match if they're equal after normalization, or if
-- their last tokens (surnames) match (e.g. "Mbappe" ~ "Kylian Mbappe").
create or replace function public.normalize_player_name(p_name text)
returns text language sql immutable as $$
  select trim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.fuzzy_name_match(p_a text, p_b text)
returns boolean language sql immutable as $$
  select a <> '' and b <> '' and (
    a = b or (regexp_match(a, '[^ ]+$'))[1] = (regexp_match(b, '[^ ]+$'))[1]
  )
  from (select public.normalize_player_name(p_a) as a, public.normalize_player_name(p_b) as b) t;
$$;

-- ============ resolve_tournament_awards ============
-- Security definer, idempotent. Called from the daily sync cron (and a manual API
-- route). No-op per award if that award is already resolved.
--
-- Tournament Winner: resolved once the FINAL match is FINISHED with a winner. Sets
-- winner_points = 15 for every tournament_predictions row whose winner_team matches
-- (case-insensitive, trimmed), 0 otherwise.
--
-- Golden Boot: resolved via enter_golden_boot_winner (host-entry fallback — Football-
-- Data free tier has no reliable /scorers endpoint). Once resolved, recomputes
-- golden_boot_points = 10 for every row whose golden_boot_player fuzzy-matches the
-- entered name, 0 otherwise. Safe to re-run.
create or replace function public.resolve_tournament_awards()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_final record;
  v_winning_team text;
  v_winner_resolved boolean;
  v_golden_boot_value text;
  v_golden_boot_resolved boolean;
begin
  select exists(select 1 from tournament_award_resolutions where award = 'tournament_winner') into v_winner_resolved;

  if not v_winner_resolved then
    select * into v_final from matches
    where stage = 'FINAL' and status = 'FINISHED' and winner is not null
    limit 1;

    if v_final.id is not null then
      v_winning_team := case v_final.winner
        when 'HOME_TEAM' then v_final.home_team
        when 'AWAY_TEAM' then v_final.away_team
        else null
      end;

      if v_winning_team is not null then
        insert into tournament_award_resolutions (award, winning_value, details)
        values ('tournament_winner', v_winning_team, jsonb_build_object('match_id', v_final.id))
        on conflict (award) do nothing;

        update tournament_predictions
        set winner_points = case
          when winner_team is not null and lower(trim(winner_team)) = lower(trim(v_winning_team)) then 15
          else 0
        end;

        v_winner_resolved := true;
      end if;
    end if;
  end if;

  select winning_value into v_golden_boot_value from tournament_award_resolutions where award = 'golden_boot';
  v_golden_boot_resolved := v_golden_boot_value is not null;

  if v_golden_boot_resolved then
    update tournament_predictions
    set golden_boot_points = case
      when golden_boot_player is not null and public.fuzzy_name_match(golden_boot_player, v_golden_boot_value) then 10
      else 0
    end;
  end if;

  return jsonb_build_object('winner_resolved', v_winner_resolved, 'golden_boot_resolved', v_golden_boot_resolved);
end; $$;

-- ============ enter_golden_boot_winner ============
-- Security definer. Any authenticated user can submit once the FINAL has finished;
-- first writer wins (unique on tournament_award_resolutions.award). Immediately
-- recomputes golden_boot_points for everyone if this call is the one that resolved it.
create or replace function public.enter_golden_boot_winner(p_player_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_rows int;
  v_existing text;
begin
  v_name := trim(coalesce(p_player_name, ''));
  if v_name = '' then
    raise exception 'PLAYER_NAME_REQUIRED';
  end if;

  if not exists (select 1 from matches where stage = 'FINAL' and status = 'FINISHED') then
    raise exception 'FINAL_NOT_FINISHED';
  end if;

  insert into tournament_award_resolutions (award, winning_value)
  values ('golden_boot', v_name)
  on conflict (award) do nothing;
  get diagnostics v_rows = row_count;

  select winning_value into v_existing from tournament_award_resolutions where award = 'golden_boot';

  if v_rows > 0 then
    update tournament_predictions
    set golden_boot_points = case
      when golden_boot_player is not null and public.fuzzy_name_match(golden_boot_player, v_existing) then 10
      else 0
    end;
  end if;

  return jsonb_build_object('winning_value', v_existing, 'newly_resolved', v_rows > 0);
end; $$;
