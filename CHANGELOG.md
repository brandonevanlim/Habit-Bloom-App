# Changelog

All notable changes to Habit Bloom (Sprout) are documented here.

---

## [1.0.1] — 2026-04-30

### Bug Fixes

- **Sync Failed toast on habit completion** — The "Sync failed" notification would fire every time a habit was checked off. Root cause: `pushProfile` was calling Supabase's `.upsert()` with `{ onConflict: "user_id" }`, which requires a `UNIQUE` constraint on the `user_id` column that was not guaranteed to exist. Fixed by switching to `.update().eq("user_id", ...)`, which is unconditionally safe because a profile row always exists by the time any sync fires.

---

### New Features

#### Streak — Cross-Habit Daily Streak
- Streak now counts consecutive days the user completed **at least one habit**, rather than the longest single-habit streak.
- New `getDailyStreak(habits, freezes)` function in `src/lib/habits.ts` walks backwards day by day, skips days with nothing scheduled, and breaks on the first missed past day (today is never penalised if nothing is done yet).
- Streak display updated across Home, Analytics, and the public profile sync.

#### Navigation Redesign
- **New tab order:** Home · Calendar · Friends · Shop · AI · Profile
- Removed the separate **Stats** tab.
- Renamed the **Character** tab to **Shop** (same page, clearer label).
- Stats are now fully embedded on the Home page — no page navigation required.

#### Home Page — Full Stats Section
Stats section added inline below the habit list, containing:
- 4-stat summary grid: 7-day rate, 30-day rate, streak, total completions.
- **Weekly trend bar chart** — SVG chart showing completion % for each of the last 8 calendar weeks.
- **Activity heatmap** — 365-day contribution-style grid.
- **Per-habit streaks** — current and best streak for every habit.
- **Insight card** — identifies your most consistent day of the week and your weakest.

#### Home Page — Friends Widget
- Shows your invite code in large monospace text for easy sharing.
- One-tap copy button writes the code to the clipboard.
- "View league →" link goes to the Friends page.

#### Home Page — Shop Widget
- Shows up to 3 items you haven't unlocked yet.
- Items you can afford are tappable and purchase immediately.
- Items you can't afford show a lock icon and are greyed out.
- "View all →" link goes to the full Shop/Character page.

#### Engagement — Weekly Recap Modal
- Every **Saturday**, a recap card appears on the Home page.
- Shows: week label, total completions, completion rate for the current week vs the prior week (↑ / ↓ indicator), and current streak.
- Dismissed with a "Let's keep going" button; won't show again until next Saturday.
- State stored in `localStorage` — no new database columns needed.

#### Engagement — Streak-at-Risk Browser Notification
- After **8 PM**, if any scheduled habit for today is still incomplete, a browser notification fires.
- The message is randomly selected from 10 unique, funny/urgent messages (e.g. *"Your streak called. It's scared. Help."*, *"One habit. That's all. Don't be that person."*).
- Fires at most **once per day** — tracked in `localStorage`.
- Requires the user to have granted notification permission.

#### Upgrade Page — "Your Streak Would Be X Days with Pro" Card
- For non-Pro users, the Upgrade page now calculates what your streak *would* be if Pro's auto-freeze had protected every missed day since your first habit.
- Displays your actual streak vs your potential Pro streak side by side.
- Only shown when there is at least 1 lost day — never shown when streaks are equal.
- Tapping "Start free trial" navigates to the AI page after upgrading.

#### AI Page — Chat Suggestion Chips
- On a fresh conversation (or after clearing chat), four suggestion chips appear above the input bar:
  - 📊 How am I doing overall?
  - 😤 Why do I keep missing habits?
  - 🗓 Help me plan this week
  - 💡 Suggest a new habit for me
- Tapping a chip sends it as a message immediately.
- Chips disappear once the conversation has more than one message.

#### AI Coach — Complete Redesign (`CoachPanel`)
Previous coach sent minimal habit data and received generic, unhelpful responses. New coach:

1. **Computes real pattern data locally first** (no API call for this part):
   - Today's snapshot: habits done / total scheduled, current streak, week-over-week trend %.
   - Per-habit 14-day completion rates with visual progress bars.
   - Best and worst performing habits by name and exact percentage.
   - Best and worst day of the week (28-day window) by name and exact percentage.
   - Week-over-week trend: this week's rate vs last week's rate.

2. **Pattern insights section** — Plain-English cards describing your star habit, your struggling habit, your power day, your weakest day, and whether you're trending up or down.

3. **AI coaching plan** — Injects the computed pattern data (exact habit names, exact percentages, exact day names) into the prompt alongside the user's personal goal. Instructs the model to return exactly 3 specific, data-referenced points (not generic advice).

The `CoachPanel` component is shared between the **AI page Coach tab** and the standalone **Coach page**, so both are identical.

---

### Code Changes Summary

| File | Change |
|---|---|
| `src/lib/habits.ts` | Added `getDailyStreak()` |
| `src/lib/shopItems.ts` | New — exported `SHOP_ITEMS` array (shared between CharacterPage and Index) |
| `src/components/CoachPanel.tsx` | New — shared coach UI used by AIPage and CoachPage |
| `src/components/AppLayout.tsx` | Updated nav tabs (6 tabs, Shop replaces Stats) |
| `src/hooks/useAppState.tsx` | Fixed `pushProfile` (update not upsert), added `weeklyRecap` state + weekly recap effect + streak warning effect, updated public stats to use `getDailyStreak` |
| `src/pages/Index.tsx` | Added full stats section, Friends widget, Shop widget, weekly recap modal |
| `src/pages/AIPage.tsx` | Added suggestion chips to ChatTab, replaced old CoachTab with `CoachPanel` |
| `src/pages/CoachPage.tsx` | Rewritten — Pro gate + `CoachPanel`, removed duplicate coach logic |
| `src/pages/UpgradePage.tsx` | Added loss-aversion streak card, navigate to `/ai` after upgrade |
| `src/pages/CharacterPage.tsx` | Imports `SHOP_ITEMS` from `src/lib/shopItems` instead of defining inline |
| `src/pages/AnalyticsPage.tsx` | Uses `getDailyStreak` for the top-level streak stat |
| `CODEBASE_GUIDE.md` | New — full codebase documentation (35 sections) for developers |
| `package.json` | Version bumped to `1.0.1` |

---

## [1.0.0] — Initial release

- Habit tracking with daily/weekly scheduling
- Streak system with freeze coins
- Character & shop (cosmetic unlocks)
- Calendar view
- Friends & leaderboard (invite codes)
- Supabase cloud sync with offline-first localStorage cache
- Onboarding flow
- Badge system
- AI chat coach (Supabase Edge Function)
- Streak recovery (watch ad / pay coins)
- Login streak bonus
- Light / dark theme
- Pro subscription gate (local, Stripe-ready)
