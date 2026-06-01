# 📜 Rickey AI Agent — Change Log

All notable changes to this project are recorded here, newest first.
Each release lists the **date & time**, a **description** of what changed, and the
**source file name** for that version (a versioned snapshot is kept in `/versions`).

The live app always runs from `index.html`. The version number and build stamp are
shown in small text under the title in the app header.

---

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
