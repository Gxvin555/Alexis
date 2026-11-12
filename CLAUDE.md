# Working notes for Alexis

Durable rules for anyone, person or assistant, changing this repository. Read it
before you touch anything.

## What this project is

Alexis is Lucerna's private, offline business finance app. It is a single
self-contained HTML file, `alexis.html`, that runs offline and saves to the
browser's local storage. The `assets` folder must sit next to it; the HTML
references the brand images by relative path. Fonts are embedded in the file.

`amethyst-money.html` is only a redirect for old bookmarks. Do not build on it.

## Honest scope

Alexis records cash movements. It is not accounting software.

- Call the balance the **recorded balance**, never a bank balance. Call monthly
  income less expenditure **net cash flow**, never profit.
- Do not claim VAT, corporation tax, payroll, invoicing, bank feeds,
  reconciliation, double-entry or compliance features. They do not exist.
- Lending records are loans, not invoices. Contacts are contacts, not customers
  or suppliers.
- No cloud sync, sharing or multi-user language. It is one device.
- Personal pay and tax and personal money tools are kept for existing users
  under Settings, "Earlier personal tools". Keep them out of the main menu and
  labelled as personal.

## Design system

- Alexis uses the **Lucerna house design system**. The only per-app values are
  the accent tokens at the top of the stylesheet: amber `--brand:#D99A32`,
  `--brand-dark:#B27E29`, `--brand-tint`, `--accent-glow`, `--on-brand:#15202b`.
- Amber as text on light surfaces uses `--brand-text`, and focus outlines use
  `--focus`, because plain amber on white fails contrast.
- Neutrals, status colours, radii and shadows are shared across Lucerna apps.
  Do not recolour them, and never hard-code a hex in a component.
- There is **one** stylesheet. Light tokens are on `:root`, dark tokens on
  `body.dark`. Responsive rules are grouped at the end, wide to narrow. Do not
  add override layers; change the rule where it is defined.
- Status amber means a warning and always comes with an icon and words. Brand
  amber means "interactive". Do not use one for the other.
- Icons are inline line icons from `icon(name)`. No emoji or glyph icons.
- Use the supplied wordmark files exactly. Never redraw or re-letter them. The
  Lucerna logo appears once, at the foot of Settings.

## Rules for the single file

- **One writer at a time.** Make one focused change, test it, commit it.
- **Storage must never throw.** All writes go through `storageSet` and
  `storageRemove`. Never call `localStorage.setItem` directly.
- **Trust nothing that comes out of storage.** `load` rebuilds every array
  through `sanitiseVault`.
- **Migrate data, never reset it.** Storage keys (`amethyst-money-*`) and the
  IndexedDB name are kept for compatibility. Do not rename them.
- **Categories:** new entries use the business list in `cats`. Legacy personal
  categories in `legacyCats` stay valid on existing records and imports;
  `catOptions` keeps a record's own category when it is edited.
- **No secrets in the browser.**

## Language and tone

- **Plain UK English.** No em-dashes or en-dashes in anything a person reads.
- Short, plain and professional. State the thing. No exclamation marks, no
  chatty lines, no emoji. Write "Ctrl J", not platform symbols.

## Readability

- **Nothing smaller than 11px.** Labels 11.5 to 12px, body 13.5 to 14.5px.
- Weights 500, 600, 700 and 800 only.
- Tap targets 32px or more for small row controls.
- The Mavis launcher is pinned bottom right, so toasts sit above it, and move
  to the top while the Mavis panel is open.

## Narrow screens

Below 900px the sidebar becomes an off-canvas menu opened from the top bar. Its
behaviour, including focus handling, lives in a small standalone script at the
end of the file so a failure there cannot stop the app. Check it opens,
navigates, closes and returns focus at phone width after any sidebar change.

## Locking

`lock()` clears every overlay (`#modalRoot`, `#onboardingRoot`, the Mavis panel
and the mobile menu), and the assistant is gated on `unlocked`. Auto-lock runs
on idle. Any new panel outside `#app` must be cleared in `lock()` too.

## Dates

Use `localDay()` / `iso()` for anything filed by day or month. Never
`toISOString().slice(0,10)`. Bill timing uses `daysUntilDue()`.

## Restoring

`restore()` validates the replacement vault first, confirms before overwriting,
and only then commits. Never assign to `state` before `sanitiseVault`.

## The assistant is called Mavis

Mavis answers only from the data in the current records and keeps everything on
this device. In code it keeps its older `jack` identifiers (`jackPanel`,
`prefs.jack`) so saved preferences stay compatible.

## Git

- Work in small, tested, committed increments. Do not claim something works
  until it has actually been run and checked.
