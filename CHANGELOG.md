# 📜 Rickey AI Agent — Change Log

All notable changes to this project are recorded here, newest first.
Each release lists the **date & time**, a **description** of what changed, and the
**source file name** for that version (a versioned snapshot is kept in `/versions`).

The live app always runs from `index.html`. The version number and build stamp are
shown in small text under the title in the app header.

---

## v3.0.1 — 2026-06-02 01:30 IST
**Source file:** `versions/rickey-ai-agent-v3.0.1.html`

Easy in-app updates that never lose your data.

- **"Update available" banner.** When you replace the files on GitHub, the app
  detects the new version and shows a banner at the top with an **Update now**
  button (and a Later option). No more clearing cache by hand.
- **Auto-backup before updating.** Tapping Update first backs up all your data
  to **Google Drive** (if Google is connected); if it isn't, it downloads a
  local JSON backup as a safety net. Then it activates the new version and
  reloads. Your photos/todos/notes/etc. in localStorage are never touched.
- Service worker reworked to wait for your tap (no surprise reloads) and to
  report its version; checks for updates on open and every 30 minutes.
- Cache bumped to `rickey-ai-v17`.

> Note: a static GitHub Pages app still can't rewrite its own code on GitHub —
> you upload the new file once, and from then on every device updates with one
> tap via the banner. Data always lives separately in the browser and survives.

## v3.0.0 — 2026-06-02 00:30 IST
**Source file:** `versions/rickey-ai-agent-v3.0.0.html`

Four workflow upgrades.

1. **Photo gallery is now search-only & list form.** Photos no longer show by
   default. Pick a category or type a tag and matching photos appear as a list
   (thumbnail + category + tags + date). Keeps the page light and private.
2. **Notes are search-only too.** Notes don't show until you search by category,
   tag, or word — then matching notes appear.
3. **Reminder category is a searchable dropdown.** Start typing: it suggests
   existing categories; if you type a new one it's saved automatically and
   offered next time.
4. **Scheduled WhatsApp = timer buttons on the front page.** Because phones block
   auto-send, each scheduled message is a button with a live countdown on the
   Tasks page — 2 soonest on top, next 4 below (6 max). Tap to open WhatsApp and
   send manually; ✏️ to edit; ✓ to mark done (removes it). A 7th+ message waits
   in the queue inside the WhatsApp tab and is promoted to the front as slots free.

- Bumped PWA cache to `rickey-ai-v16`.

## v2.9.2 — 2026-06-01 23:00 IST
**Source file:** `versions/rickey-ai-agent-v2.9.2.html`

Layout restructure — fixes the overlap and makes everything bolder & clearer.

- **Fixed the tab/content overlap.** Tabs used an old "folder tab" style (flat
  bottom) and `main` had zero top padding, so the first panel overlapped the
  tabs. Tabs are now clean rounded **pills** with a clear separating border, and
  content has proper top spacing.
- **Active tab is now a solid purple pill** (white text) — obvious at a glance.
- **Rate card + Shree/MetalMandi buttons** are wrapped in one centered `rates-bar`
  that lines up with the tabs and content (no more full-width mismatch).
- **Bolder panels:** fully rounded corners, thicker borders, larger/darker
  titles (sentence case, weight 800).
- Mobile spacing tightened to match.
- Bumped PWA cache to `rickey-ai-v15`.

## v2.9.1 — 2026-06-01 22:10 IST
**Source file:** `versions/rickey-ai-agent-v2.9.1.html`

- **Service worker rewrite (fixes stale updates):** the old worker was
  cache-first for everything, so a new index.html could keep serving the old
  cached copy, and live rate calls got cached too. Now it's **network-first for
  the app shell** (you always get the latest app when online, cache only as
  offline fallback) and **never caches** live calls (workers.dev, Apps Script,
  NALCO, Google APIs). Cache bumped to `rickey-ai-v14`.

## v2.9.0 — 2026-06-01 21:40 IST
**Source file:** `versions/rickey-ai-agent-v2.9.0.html`

- **Added two always-visible quick-link buttons** above the tabs:
  **📍 Delhi rates (Shree)** → shreemetalprices.com, and **📊 MetalMandi** →
  metalmandi.in. Tapping opens the real site in a new tab with today's live
  Delhi rates — accurate and never breaks, since the page is viewed directly
  (no scraping). The buttons stay visible even if the NALCO auto-rate is hidden.
- NALCO auto-rate strip unchanged (official source, still works).
- Bumped PWA cache to `rickey-ai-v13`.

> Note: automatic on-app screenshots of those sites aren't feasible (would need
> a server-side headless browser — not free, overkill). The link buttons give
> the same result with one tap and zero maintenance.

## v2.8.1 — 2026-06-01 21:00 IST
**Source file:** `versions/rickey-ai-agent-v2.8.1.html`

- **Dropped the Delhi (Shree) rate; the strip now shows NALCO only.** Shree and
  MetalMandi both block automated reads (Shree serves a bot-challenge page;
  MetalMandi loads prices via JavaScript from a private API), so neither could
  be read reliably from a worker. NALCO is the official source and works, so the
  rate strip is now just the NALCO aluminium ingot price (₹/MT + ≈₹/kg + date).
- Worker simplified to NALCO-only (removed Shree fetch/parse + debug route).
- App strip simplified: removed the Delhi table, toggle, and related code.
- Same silent-fail behaviour; bumped PWA cache to `rickey-ai-v12`.

## v2.8.0 — 2026-06-01 20:00 IST
**Source file:** `versions/rickey-ai-agent-v2.8.0.html`

- **Delhi (Shree) aluminium rates now show as a proper table** on the top strip:
  NALCO ingot stays as the headline figure, and a tappable “📍 Delhi rates”
  button expands a clean table (Company Ingot, Local Rod, Company Rod, Wire
  Scrap, Purja Local, Bartan — all ₹/kg) with the date.
- **Worker fix (Shree):** the page's keyword/meta text ("aluminium scrap prices
  today…") was being matched first; now parsing is anchored at the real "Delhi
  Metal Market Rates" table, so all six aluminium rows are read correctly.
  (NALCO already worked — live ₹414,063/MT.)
- Bumped PWA cache to `rickey-ai-v11`.

## v2.7.1 — 2026-06-01 19:30 IST
**Source file:** `versions/rickey-ai-agent-v2.7.1.html`

Added a **Google Apps Script** option for the rates helper, because the
Cloudflare `workers.dev` address failed with an SSL error on the user's laptop
and phone (a `workers.dev` provisioning/connection issue, not the app or the
worker code).

- App now accepts **either** a Google Apps Script web-app URL (ends in `/exec`,
  runs on `script.google.com`) **or** a Cloudflare Worker URL. It automatically
  uses `?path=rates` for Apps Script and `/rates` for the Worker.
- New files: `worker/rates-apps-script.gs` and `worker/APPS-SCRIPT-DEPLOY.md`.
- Also fixed real bugs in the Cloudflare worker (NALCO PDF Flate decompression;
  Shree rupee-entity + label escaping) — kept for anyone who prefers Cloudflare.
- Same silent-fail behaviour; bumped PWA cache to `rickey-ai-v10`.

> Why Apps Script: it runs on Google's domain, which already works on the user's
> network, sidestepping the `workers.dev` SSL error entirely.

## v2.7.0 — 2026-06-01 18:30 IST
**Source file:** `versions/rickey-ai-agent-v2.7.0.html`

Real, today's aluminium rates on the top strip — both sources.

- **Dual rate strip:** NALCO aluminium ingot (₹/MT + ≈₹/kg) **and** Delhi (Shree)
  aluminium rates (Company Ingot, Local Rod, Company Rod, Wire — ₹/kg).
- **Reliable now via a free Cloudflare Worker.** Browsers can't read NALCO/Shree
  directly (no CORS) and public proxies were unreliable, so a tiny free Worker
  fetches both and returns clean JSON. New files: `worker/rates-worker.js` and
  `worker/DEPLOY.md` (5-minute one-time setup).
- New **Memory DB → "Live Rates Source"** box to paste your Worker URL (with Save
  + Test). Leave blank and the strip simply stays hidden.
- Caches the last good rates so the strip appears instantly next open.
- **Still fails silently:** no Worker, unreachable, or offline → strip hidden,
  no error, no broken layout.
- Bumped PWA cache to `rickey-ai-v9`.

## v2.6.1 — 2026-06-01 17:40 IST
**Source file:** `versions/rickey-ai-agent-v2.6.1.html`

- **Moved the NALCO aluminium rate above the tabs**, just under the title, so it
  shows on every tab (not only the Tasks page). Made it a compact one-line strip.
- Same silent-fail behaviour: hidden when offline / source unavailable.
- Bumped PWA cache to `rickey-ai-v8`.

## v2.6.0 — 2026-06-01 17:00 IST
**Source file:** `versions/rickey-ai-agent-v2.6.0.html`

- **Live NALCO aluminium rate on the front page.** A card at the top of the
  Tasks page shows the official NALCO aluminium ingot price (grade IE07) in
  ₹/MT, with an approximate ₹/kg and the circular date.
- It reads NALCO's daily price circular (the dated `Ingot-DD-MM-YYYY.pdf`).
  Since the circular only changes every few days, the app tries today and walks
  back up to 10 days to find the most recent published rate.
- **Fails silently, by design:** if there's no internet, the source/proxy is
  unavailable, or no circular is found, the card simply stays hidden — no error
  and no broken layout. The last good rate is cached and shown instantly on the
  next open.
- A ↻ Refresh button on the card forces a re-check.

> Technical note: browsers can't read the NALCO PDF directly (no CORS), so the
> app fetches it via a public CORS proxy. Proxies can be unreliable; that's why
> the card is built to disappear quietly rather than ever show an error.
> (The Shree Metal Prices Delhi page was considered but isn't used on the front
> page — it has no official dated source and is even less reliable to fetch.)

## v2.5.0 — 2026-06-01 16:00 IST
**Source file:** `versions/rickey-ai-agent-v2.5.0.html`

Data stays local on each phone, but now you can back it up to your own Google
Drive and restore it on any of your phones — free and private.

- **☁️ Backup to Google Drive / Restore from Google Drive** (Memory DB tab).
  Saves one file (`rickey-ai-agent-backup.json`) to your Drive containing tasks,
  reminders, notes, contacts, templates, photos and WhatsApp schedules. Restore
  pulls it back onto another phone. Re-backing-up overwrites the same file.
- Uses the `drive.file` permission, so the app can only see the backup file it
  creates — it cannot read the rest of your Drive.
- **File Export/Import now also includes contacts and templates** (previously
  missed), via a shared backup builder used by both file and Drive backup.
- **Fixed a crash for returning users:** the Google scopes list was being used
  before it was defined when a saved login existed, which could break "Connect
  Google" on reload. Scopes are now defined before init runs.
- Setup steps updated to enable the **Google Drive API**.
- Bumped PWA cache to `rickey-ai-v6`.

> Note on photos: photos still live in the phone's browser storage, which most
> browsers cap at about 5 MB total. The Memory DB tab shows a storage meter —
> if it nears full, back up and clear old photos. A larger on-phone photo store
> (IndexedDB) or a shared cloud gallery can be added later if needed.

## v2.4.2 — 2026-06-01 15:10 IST
**Source file:** `versions/rickey-ai-agent-v2.4.2.html`

- **Synced tasks now go into a dedicated Google Tasks list named "Rickey AI
  Agent"** (created automatically the first time), instead of mixing into your
  default personal list. Re-syncing reuses the same list.
- Bumped PWA cache to `rickey-ai-v5`.

## v2.4.1 — 2026-06-01 14:30 IST
**Source file:** `versions/rickey-ai-agent-v2.4.1.html`

Google Tasks sync reliability + clearer errors.

- **"Sync to Google Tasks" now shows the real result** as a toast on the Tasks
  page (it previously wrote errors to a hidden element on the Google tab, so a
  failed sync looked like nothing happened).
- **Detects the two common failures** and tells you exactly what to do:
  - *Tasks access not granted* → sign out and reconnect, allow Tasks.
  - *Tasks API not enabled* → enable "Google Tasks API" in Google Cloud Console.
- **No duplicates** — tasks already pushed are skipped on the next sync.
- Bumped PWA cache to `rickey-ai-v4`.

## v2.4.0 — 2026-06-01 12:00 IST
**Source file:** `versions/rickey-ai-agent-v2.4.0.html`

Big layout simplification and reminder upgrade based on user feedback.

- **Fixed double navigation** — removed the separate mobile bottom-bar that was
  overlapping the top tabs. There is now a single navigation bar that scrolls
  sideways on small screens, so the duplicate icons are gone.
- **Merged To-Do and Reminders into one page** (the "Tasks" tab).
- **Removed all AI from tasks** — no more "AI Task Generator" / "Generate with AI".
  Adding a task is now a simple text box + **Add** button.
- **One-tap "Sync to Google Tasks"** on the Tasks page.
- **Reminders now have 5 categories:**
  1. 📞 Call (date & time)
  2. 💰 Payment received call
  3. 💸 Make payment call
  4. 🧾 Bill last-date reminder
  5. 🔄 Follow-up call for order (date & time)
- **Google Calendar = one-time events only.** Adding a dated reminder opens a
  pre-filled Google Calendar event; "Add All to Google Calendar" pushes every
  dated reminder as a single (non-repeating) event.
- WhatsApp reminder message text now matches each reminder category.
- Added app **version + build date/time** under the title in the header.
- Bumped PWA service-worker cache to `rickey-ai-v3` so the update installs on phones.

## v2.3.0 — 2026-06-01 (earlier build)
**Source file:** `versions/rickey-ai-agent-v2.3.0.html`

Feature additions on top of the bug-fix build.

- **Google Tasks** sync added (push pending to-dos to Google Tasks).
- **Photos: category + tags + searchable dropdown.** Save a photo with a category
  (e.g. "payment slip") and tags. Search by category dropdown and/or tag text —
  category-only shows everything in that category; together they narrow (AND).
- **WhatsApp scheduled send reworked** — at the set time you now get a reminder
  with a "Send Now" button (instead of an auto-open the browser blocks); also
  catches messages that came due while the app was closed.
- Confirmed Google Calendar reminder push (date + time) is working.
- Fixed stray "AI is thinking…" text that always showed on two tabs.

## v2.2.0 — initial public build
**Source file:** `index.html` (original upload)

First version with: To-Do, Call Reminders, Smart Notes, Photo Gallery (tags only),
WhatsApp messaging + scheduling, Google (Contacts/Calendar/Gmail), Memory DB,
and PWA install support.

> Note: this build had a fatal JavaScript error (an `await` used outside an
> `async` function) that stopped the whole app from running, plus a missing
> API-key modal, a missing toast element, and a few undefined variables. All of
> these were repaired in v2.3.0.

---

### How versioning works here
- The number shown in the app header (e.g. `v2.4.0`) matches the top entry above.
- When a new version ships, add a new section at the top with the date & time,
  a short description, and save a copy of the source as
  `versions/rickey-ai-agent-vX.Y.Z.html`.
