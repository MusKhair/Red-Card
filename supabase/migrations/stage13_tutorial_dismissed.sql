-- Stage 13: add tutorial_dismissed_at to profiles
-- Once set, the one-time welcome card never shows again.

alter table public.profiles
  add column if not exists tutorial_dismissed_at timestamptz default null;
