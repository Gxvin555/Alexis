# Working notes for Amethyst Money

Durable rules for anyone, person or assistant, changing this repository. Read it
before you touch anything.

## What this project is

Amethyst Money is a private, offline personal money planner for Telecom
Networks. It is a single self-contained HTML file, `amethyst-money.html`, that
runs offline and saves to the browser's local storage. The two `amethyst-logo`
SVG files must sit next to it; the HTML references them by relative path.

## Design system

- Amethyst uses the **Telecom Networks design system**, the same system as
  Aurora and Alien HR, recoloured to amethyst.
- The palette and scales are defined **once**, in the block near the end of the
  stylesheet headed "Telecom Networks design system, amethyst edition". That
  block is the single source of truth for colour. It is defined last on purpose,
  so its tokens win the cascade and flow through every view.
- The brand colour is amethyst (`--brand`). Neutrals, status colours, the radius
  scale and the shadow scale are shared with the rest of the design system and
  should not be recoloured per app.
- Do not add new competing `:root` palettes. If a colour looks wrong, fix the
  token, do not paint over it with another hardcoded hex.
- Light and dark themes read from the same tokens. Dark mode is the `body.dark`
  class, toggled from Settings.

## Rules for the single file

- **One writer at a time.** It is a single large file. Make one focused change,
  test it, commit it, then move on. Do not batch several unrelated changes into
  one giant edit.
- **Storage must never throw.** All writes go through `storageSet` and
  `storageRemove`, which catch and return a result rather than throwing. Never
  call `localStorage.setItem` directly. When a write fails the app keeps working
  from memory and shows the storage banner, so a person is never told their
  records are safe when they are not.
- **Trust nothing that comes out of storage.** `load` rebuilds every array with
  `Array.isArray`. Saved data can be truncated, hand edited or from another
  version, and one wrong type used to render a blank page.
- **Migrate data, never reset it.** On a version bump, back up the old saved
  data and fill in new fields. Do not wipe people's saved entries because the
  seed version changed.
- **No secrets in the browser.** This is a local demo. Real integrations, keys
  and access control belong on a server, never in this file.

## Language and tone

- **Plain UK English.** No em-dashes or en-dashes in anything a person reads;
  use commas, full stops, or "to". No developer jargon in the interface.
- Keep it well spoken, polite and clear. No slang in the visible interface.

## Readability

- **Nothing smaller than 11px.** The type scale has a floor: roughly 11.5px for
  micro labels, 12 to 12.5px for secondary text, 13px and up for anything a
  person reads properly. Money is hard enough to read without squinting. Do not
  reintroduce 8, 9 or 10px text.
- Keep tap targets at 32px or more for the small row controls.
- The Ask Jack launcher is pinned to the bottom right, so notices sit above it.
  Do not move a fixed element into that corner without checking it does not
  cover the launcher or the toast.

## Narrow screens

Below 580px the sidebar becomes an off canvas panel opened by the menu button in
the top bar. Its behaviour lives in a small standalone script at the end of the
file, deliberately separate from the main app so a failure there cannot stop the
rest of the page working. If you change the sidebar, check the menu still opens,
navigates and closes on a phone width.

## Locking

Locking is not just hiding the workspace. `lock()` clears every overlay
(`#modalRoot`, `#onboardingRoot`) and the assistant is gated on `unlocked`,
because those panels are siblings of `#app` and used to stay usable, and
answering, over the lock screen. Auto-lock runs on idle, not only when the tab
is hidden. Any new panel outside `#app` must be cleared in `lock()` too.

## Dates

Use `localDay()` / `iso()` for anything a person sees or that is filed by day
or month. Never `toISOString().slice(0,10)`: in British Summer Time that files
anything entered after midnight to the previous day, which put bill payments in
the wrong month. Bill timing uses `daysUntilDue()`, which walks the real
calendar, not a 31 day modulo.

## Restoring

`restore()` builds and validates the replacement vault first, confirms before
overwriting anything, and only then commits. Never assign to `state` from file
content before it has been through `sanitiseVault`.

## The assistant is called Jack

Jack lives in the code as the money assistant. It answers only from the data in
the current vault. Keep its answers private to this device.

## Git

- Work in small, tested, committed increments. Do not claim something works
  until it has actually been run and checked.
