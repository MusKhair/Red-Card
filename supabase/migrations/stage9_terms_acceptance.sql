-- Stage 9: one-time Terms & Conditions acceptance gate.
--
-- profiles.terms_accepted_at is NULL until the user ticks the box and taps
-- "I agree" on the TermsModal (shown on first login after this ships).
-- Existing users are NULL too, so they're prompted once on their next login.
--
-- RLS: no new policy needed. "profiles: update own"
-- (for update to authenticated using (id = auth.uid())) already covers
-- updating terms_accepted_at on the caller's own row — Postgres reuses the
-- USING expression as the WITH CHECK expression for UPDATE policies when
-- WITH CHECK is omitted.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz default null;
