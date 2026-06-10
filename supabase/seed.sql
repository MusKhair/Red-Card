-- Forfeit library. Tiers and wording per product spec.
-- NOTE: the original "cinnamon teaspoon challenge" was replaced with a wasabi spoon
-- (cinnamon dry-swallow is an aspiration/choking risk and breaks the app's own Hard Bans).

insert into public.forfeit_library (tier, title, description, proof) values
-- ============ TIER 1 — MILD ============
(1, 'Rival jersey day', 'Wear the rival team''s jersey to work/school/uni for a full day.', 'Photo'),
(1, 'Logo lockdown', 'Profile pic across WhatsApp + IG + LinkedIn = rival team logo for 7 days.', 'Screenshots, day 1 and day 7'),
(1, 'Status of shame', 'WhatsApp status: "I lost the sweepstakes, [winner] is better than me at football." Stays up 48 hours.', 'Screenshot'),
(1, 'Breakfast tax', 'Buy the group breakfast, coffee, or bubble tea — winner picks the order.', 'Receipt + photo'),
(1, 'Anthem karaoke', 'Voice-note the opposing team''s anthem in the group chat, full verse, with feeling.', 'Voice note'),
(1, 'Hype reel humiliation', '30-second hype reel for the rival team posted to your IG story — group writes the script.', 'Story screenshot'),
(1, 'The Belittler', 'Every message you send in the group chat for 3 days must start with "as the loser…"', 'Group chat enforcement'),
(1, 'Fake accent order', 'Walk into a café and order entirely in a fake accent the group picks.', 'Video'),
(1, 'The bow speech', 'Read a 200-word "I bow to [winner]" speech to camera, posted in group.', 'Video'),
(1, 'Nickname clause', 'Winner picks your nickname for 2 weeks — must be used in every group message.', 'Group chat enforcement'),

-- ============ TIER 2 — SPICY ============
(2, 'The hundred', '100 pushups, single video, no cuts.', 'Video, no cuts'),
(2, 'Cringe TikTok', 'Cringe TikTok dance posted to your actual TikTok, stays up 48 hours, group picks the song.', 'Link + screenshot at 48h'),
(2, 'Wasabi spoon', 'A full teaspoon of wasabi paste in one go, on camera. Water allowed after swallowing.', 'Video'),
(2, 'Raw garlic', 'Eat a raw garlic clove whole.', 'Video'),
(2, 'Cold shower', 'Cold shower, 3 minutes minimum, timer visible.', 'Video with timer in frame'),
(2, 'Phone hostage', 'Chosen group member has your phone for 90 minutes and can post on your IG story. App safety rules still apply: no nudity, no harassment, no doxxing, no impersonation messages to others.', 'Story screenshots'),
(2, 'Letterbox round', 'Blindfolded — group feeds you 5 mystery foods, you guess each one.', 'Video'),
(2, 'Public karaoke', 'Sing a full song chosen by the group, in a public place.', 'Video'),
(2, 'Costume day', 'Group picks the outfit, you wear it in public for 2 hours.', 'Photos, start and end'),
(2, 'Truth tax', 'Answer 5 honest questions from each group member, voice note, no skips.', 'Voice notes'),
(2, 'Throwback dump', 'Group picks 3 photos from your camera roll — all go to your IG story for 24 hours.', 'Story screenshots'),
(2, 'The strip', 'Wax one forearm strip, on camera.', 'Video'),

-- ============ TIER 3 — EXTREME (opt-in only, 18+) ============
(3, 'The buzz cut', 'Clippers, grade 2 or shorter, full head, on camera. No full shave, no eyebrows.', 'Video'),
(3, 'Eyebrow slit', 'One slit, one eyebrow. Razor on camera, group picks the side.', 'Video + close-up photo'),
(3, 'Ice bath', 'Ice bath, 5 minutes minimum, timer in frame, no early exit.', 'Video with timer'),
(3, 'Mystery smoothie', 'Group blends 6 ingredients from your own kitchen — all must be edible, no chemicals, no allergens you have. Drink the full glass.', 'Video'),
(3, 'Hot sauce ladder', '5 sauces, ascending heat, one tortilla chip each. No milk for 2 minutes after the last. Highest sauce is "Da Bomb" tier, not Reaper.', 'Video'),
(3, 'TikTok of shame', 'Full cringe dance + caption "I lost a World Cup sweepstakes and this is my punishment." Posted from your real account, stays up 7 days.', 'Link + screenshot at day 7'),
(3, 'Public serenade', 'Sing a full love song to a stranger in public — with their consent on camera before you start.', 'Video'),
(3, '24-hour dictatorship', 'One chosen group member dictates your meals, outfit, and one social media post for a full day.', 'Photo log through the day'),
(3, 'Mustache only', 'Shave everything except a mustache, keep it 72 hours, daily photo proof. Beard-havers only — skip if you can''t grow one.', 'Daily photos x3'),
(3, 'Sumo hold', 'Sumo squat hold, 5 minutes, on video, no breaks longer than 3 seconds.', 'Video with timer'),
(3, 'Whole lemon', 'Eat a whole lemon, skin and all, in under 2 minutes.', 'Video with timer'),
(3, 'Receipt drop', 'Group picks one embarrassing screenshot from your phone (you choose which app they browse: Notes, camera roll, or DMs with one specific person) — posted to your close friends story.', 'Story screenshot');
