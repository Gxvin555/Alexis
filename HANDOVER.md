# Alexis handover

Last updated 20 November 2026. Keep this file current: it is the first thing
the next person or agent should read after `CLAUDE.md`.

## Current state

- **Repository / branch:** `Gxvin555/Alexis`, branch `claude/tender-cerf-iz7rw5`.
- **Base for this round:** `d5dc28aed0004178590c07aaf745de5f66a413ea` (the SHA
  reviewed in the 19 November 2026 Lucerna audit). No newer commits existed on
  the remote when work started.
- **What Alexis is:** an offline business cash-record app in one HTML file plus
  an `assets` folder. Records live in browser storage under the original
  `amethyst-money-*` keys; documents in IndexedDB `amethyst-money-documents`.
- **Not released.** This round produces a reviewable branch and a packaged
  preview only. No deployment, release or repository visibility change was made.

## Changes in this round (audit findings AL-01 to AL-04)

### AL-01 · honest persistence

- `save()` now rolls the in-memory records back to the last saved copy when
  storage refuses a write, and returns false. All 26 callers stop on false: no
  "saved" message, and the dialog stays open with the person's entries.
- Errors raised while a dialog is open appear inside the dialog, above its
  buttons, as an alert (`.form-error`). They no longer appear as a toast that
  could cover the actions on a phone. The storage warning banner sits below
  dialogs.
- `restore()` validates the file (`readBackup`), writes the replacement, and
  switches records only if storage accepted it. A failed restore keeps the
  confirmation open and the current records unchanged.
- Mavis confirmation and undo check the save and offer "Try again".
- Backup downloads still work when storage is full; the "last backup" date is
  only kept if it could be saved.
- Preference changes that cannot be stored say "Applied for this session only".

### AL-02 · document transactions

- `docRequest` resolves on `transaction.oncomplete` with the request's result,
  rejects on abort or error, and closes the database on every path.
- Upload, download, delete and erase handle failure without a false success,
  and the upload and delete buttons show a busy state, then recover for a retry.

### AL-03 · unreadable storage is not a first run

- `load()` records `vaultStatus`: absent, ok, corrupt or blocked. `readPin()`
  does the same for the PIN, including bad salt or hash shapes.
- New recovery screen (`#recovery`, cleared by `lock()`):
  - **Records unreadable** (shown after the PIN): download the raw text,
    restore a backup, or start empty. Each replacement asks for confirmation
    first and keeps a copy under `amethyst-money-v1-unreadable-<time>`.
  - **PIN unreadable**: records untouched; download the damaged record, then
    set a new PIN. The copy says plainly that the PIN only locks the screen.
  - **Storage blocked** and **browser cryptography missing**: explanation and
    reload only; nothing changes.
- PIN entry is busy-guarded, and hashing errors are reported instead of thrown.
  Change PIN uses the same safe reader.
- Fixed during testing: the PIN field's handlers are now wired before any
  recovery check, so "Set a new PIN" can return to a working PIN field.

### AL-04 · tests, packaging and documents

- `tests/alexis.test.js`: 15 regression tests using Node's built-in runner and
  Playwright Chromium, against the real app with synthetic records (details
  below). `package.json` exists only for the tests; the app needs no install.
- `tools/package.py`: builds `dist/alexis/` and `dist/alexis.zip` with exactly
  the 10 files the app needs, and fails if any asset hash differs from the
  manifest or an original differs from its canonical hash.
- CSV import now rejects dates that are not real calendar days (for example
  `2026-13-45`). Stored records are not re-validated, so existing data keeps
  its meaning.
- README and CLAUDE.md now describe the actual package (HTML plus assets), the
  storage failure behaviour and the tests. "Private" is explained as describing
  the records, not the repository.

### Brand provenance

- `assets/img/lucerna.png` was a resampled 2000×673 copy taken from the
  aperture demo. It has been replaced with the canonical 2750×925 original.
  Its SHA-256 `a0c2e415…216a` matches the kit's `brand-originals/SHA256.json`.
  `lucerna-light.png` was regenerated from it: lettering `#bec4d0`, alpha
  identical (checked).
- `alexis-wordmark.png` already matched the canonical hash (`86a4ec6b…40b7`).
  Its light display variant and the favicon regenerate with unchanged hashes.
- `tools/make_wordmark_variants.py` gained `--lucerna`. The favicon is recorded
  as a **placeholder**, not approved icon artwork.
- `assets/ASSET_MANIFEST.json` records `canonical_sha256` for originals;
  packaging enforces it.

## Commands and actual results

All run in this cloud container (Linux, Node 22.23.4, Playwright 1.63.0,
headless Chromium), 20 November 2026.

| Command | Result |
|---|---|
| `node --test tests/alexis.test.js` on the final code | **15 passed, 0 failed** (two consecutive clean runs after the last change, ~15 s each) |
| Same suite against the pre-fix build (`ALEXIS_DIR=<copy of d5dc28a>`) | **7 passed, 8 failed**: 3 × AL-01, CSV invalid date, AL-02 abort, 3 × AL-03. Confirms the tests catch the audited defects. (The packaging test always packages the current repository, so it is not evidence about the old build.) |
| `python3 tools/package.py <dir>` | 10 files packaged; all hashes match the manifest and the canonical originals |
| Syntax parse of all three inline scripts | OK |
| Earlier compatibility script: records made in the **original Amethyst** app, then opened in Alexis on the same origin | Same PIN unlocks; balance £1,105.68 correct; legacy `Groceries` category kept through an edit; part-repaid loan, paid bill, stored document and saved salary intact; storage not rewritten on open |
| Earlier workflow script (setup, large values, KPI links, budgets, bills, lending, borrowing, CSV, backup/restore, Excel, Mavis, auto-lock, theme, legacy tools, calculator) | Pass; no missing assets; no page errors |
| Visual matrix: 12 screens × 6 sizes (1440×1000, 1280×800, 1024×768, 768×1024, 390×844, 320×640) × dark and light = 144 captures | No page-level horizontal overflow, no text under 11px, no page errors |
| Rendered contrast of buttons, links, chips, segments and keys in both themes | All ≥ 4.5:1; lowest 4.64:1 (primary button on hover) |
| Mobile menu and dialog focus checks | Opens to the current item, Tab wraps, Escape closes and returns focus, scrim and selection close it; dialog focus returns to its opener |

### What the 15 tests cover

1. First run, keyboard PIN, integer pennies (0.10 + 0.20 = £0.30) across reload.
2. AL-01: failed add keeps the dialog, entries and stored data; retry works;
   failed delete keeps the record after reload.
3. AL-01: Mavis confirm and retry; preference failure says session only.
4. AL-01: malformed, wrong-shape and legacy Amethyst backups; cancel; failed
   write keeps records; successful restore sanitises and keeps legacy
   categories and repayments.
5. Backup round trip into a fresh profile: totals, counts, repayment amounts
   and repayment-to-income links match exactly; documents not in the JSON.
6. Bills: paying twice in a month records once; 00:30 on 1 March files under
   the local day and month.
7. Lending: partial repayment, rename updates linked descriptions, removing a
   repayment removes its income; balance exact in pennies.
8. CSV: quoted commas, newlines in quotes, duplicates, invalid and wrong-format
   dates, fractional pennies, formula-like text kept as text, malformed quote,
   cancelled picker.
9. AL-02: documents persist across reload; an aborted upload and an aborted
   delete report failure, leave no busy state, and can be retried.
10. AL-03: unreadable records: nothing overwritten, exact raw download, cancel
    changes nothing, restore from recovery keeps the unreadable copy.
11. AL-03: damaged PIN: records untouched, new PIN works, records unchanged.
12. AL-03: blocked storage and missing `crypto.subtle` screens.
13. A valid existing vault and PIN open byte-for-byte unchanged.
14. Auto-lock clears Mavis, dialogs, onboarding and the mobile menu.
15. Packaged folder from `file://` and HTTP: works, images load, no failed
    requests, no page errors.

## Screenshots

In `docs/screenshots/` (synthetic data only):

- `overview-dark-1440.png`, `overview-light-1440.png`
- `transactions-dark-320.png`, `settings-light-768.png`
- `failed-save-dark-1280.png`, `failed-save-light-390.png`: error inside the
  dialog, actions clear.
- `recovery-records-light-1280.png`, `recovery-pin-dark-390.png`,
  `recovery-blocked-dark-1280.png`
- `before-false-saved-1280.png`: pre-fix build after a refused write. It said
  "Transaction saved" and showed −£149.99, and the record was gone after
  reload (£0.00).
- `after-honest-failure-1280.png`: same action now. The dialog stays open with
  the error, and the screen and storage agree (£0.00).

The full 144-capture matrix was reviewed in the session and not committed.

## Data compatibility

- No storage key, IndexedDB name or record field was renamed, and no migration
  ran. New keys appear only on request: `amethyst-money-v1-unreadable-<time>`
  and `amethyst-money-pin-v1-unreadable-<time>`, holding copies of unreadable
  text kept during recovery.
- Backups remain version 5; old Amethyst exports still restore.
- Removed behaviour: there is no longer a "keep working from memory" mode when
  storage refuses writes. That mode showed changes a reload would lose, which
  was the AL-01 defect. Changes are now refused honestly instead.

## Remaining issues and unverified boundaries

- **Biome** is not bundled: it needs a paid Monotype licence covering
  distribution in an app. Page titles fall back to Poppins. See README, Fonts.
- **Favicon** is a placeholder cropped from the dot; it needs approved icon
  artwork.
- **Recovery confirmations** use the browser's native `confirm()` dialog,
  which is accessible but not styled like the house dialogs.
- **Not tested here:** real browsers other than headless Chromium (Firefox,
  Safari, Edge); a real quota-exhausted device (failures were injected by
  replacing `Storage.prototype.setItem`); a real IndexedDB abort (injected by
  aborting after request success); screen readers; 200% browser zoom (only the
  in-app large-text setting was checked); installed or packaged desktop use;
  a genuinely disconnected machine. `file://` was exercised in headless
  Chromium only.
- **Firefox `file://`:** whether records saved under the old
  `amethyst-money.html` filename are visible from `alexis.html` when both are
  opened straight from disk is unverified (origin rules differ by browser).
- **Old visual QA scripts** live outside the repository; only
  `tests/alexis.test.js` is maintained here.
- `unlock()` adds activity listeners on every unlock. This is pre-existing,
  harmless and not changed in this round.
- Tax rates in the legacy personal pay tool were not touched or re-verified.
