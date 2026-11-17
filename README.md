# Alexis

Alexis is Lucerna's private, offline business finance app for one device. It
records business income and expenditure, budgets, recurring bills, money the
business has lent or borrowed, and business documents. Everything is stored in
this browser and never leaves the machine. Mavis, the built-in assistant,
answers set questions from those records using built-in rules. It is not an AI
model and connects to no service.

It is a single HTML file with no backend and no build step.

## Running it

Keep `alexis.html` and the `assets` folder together, then open `alexis.html` in
a modern browser. Create a four-digit PIN and complete the short setup.

Any static file server also works:

```
python3 -m http.server 8080
```

then open `http://localhost:8080/alexis.html`.

`amethyst-money.html` is kept only as a redirect to `alexis.html` for old
bookmarks.

## What it does

- **Overview**: recorded balance, six-month cash flow, this month's income,
  expenditure and net cash flow, recent activity, budgets, and shortcuts to the
  next bill, money owed to you and the last backup.
- **Transactions**: business income and expenditure.
- **Budgets**: monthly limits for business spending categories.
- **Bills and reminders**: recurring business bills. A paid bill is marked for
  the month so it cannot be recorded twice.
- **Owed to you** and **You owe**: money the business has lent or borrowed,
  with contacts, partial repayments, overdue flags and a projected repayment
  date based on each contact's history.
- **Documents**: business documents stored in a separate browser store.
- **Reports and exports**: Excel workbook, CSV import, JSON backup and restore.
  CSV columns are Date, Type, Description, Category, Amount, Notes, with dates
  as YYYY-MM-DD.
- **Calculator**: quick sums and a loan or credit repayment estimate.
- **Mavis**: answers set questions about the records with built-in rules, and
  opens pages and forms. Not an AI model.

The recorded balance is all recorded income less all recorded expenditure. It
is not a verified bank balance, and net cash flow is not accounting profit.

### Earlier personal tools

Alexis began as a personal money planner. Two personal features are kept, with
their saved data, but are not in the main menu: **Personal pay and tax** (a PAYE
estimate on an employee salary) and **Personal money tools** (savings goal, debt
payoff, bill splitter and a 50/30/20 guide). Open them from Settings, under
"Earlier personal tools". They are not business tools.

## What it does not do

Alexis does not calculate VAT or corporation tax, run payroll, create invoices,
connect to bank feeds, reconcile accounts, keep double-entry ledgers, or make
any compliance claim. It does not sync between devices, share records or
support multiple users.

## Backups and data

Download regular backups from Settings or Reports. Stored documents live in the
browser document store and are **not** included in JSON backups. Backups from
the earlier Amethyst Money version restore into Alexis unchanged.

For compatibility with existing records, browser storage keys keep their
original `amethyst-money` names. Opening Alexis from the same site, or the same
folder, as before finds the existing records, PIN and preferences.

The PIN is stored as a salted PBKDF2 hash. It locks the screen; it does not
encrypt the records.

## Design system

Alexis uses the Lucerna house design system shared with aperture, aether and
avenir. Tokens, components and responsive rules live in one stylesheet in
`alexis.html`. See `CLAUDE.md` for the rules.

**Accent exception.** The house token table lists peach (`#F2AA84`, the
wordmark dot) for Alexis. Alexis deliberately keeps a warm amber interface
(`--brand:#D99A32`) as an app-specific decision, while the wordmark keeps its
original peach dot untouched. Contrast is split the house way: `--brand` for
non-text accents and button fills with near-black text, `--brand-strong`
(`#9d6d1d`) for any fill that carries white text, and `--brand-ink` for amber
text and links (`#8a5c12` light, `#dea74c` dark). Switching to the peach row is
a change to the accent block only.

## Brand assets

`assets/img/` holds the brand artwork; `assets/ASSET_MANIFEST.json` records the
source, role and SHA-256 of each file.

- `alexis-wordmark.png`: the supplied `alexis.png`, byte-for-byte.
- `alexis-wordmark-light.png`: recolour-only copy for dark surfaces. Lettering
  `#595959` becomes `#e9edf4`; the dot pixels and alpha are unchanged.
- `favicon.png`: the dot, cropped from the original.
- `lucerna.png`, `lucerna-light.png`: the Lucerna sub-brand and its
  recolour-only light copy, shown once at the foot of Settings.

Logos always sit directly on the surface, never inside a box or plaque. Dark
surfaces use the light-ink copy. To regenerate the light copy and favicon from
new artwork:

```
python3 tools/make_wordmark_variants.py path/to/alexis.png
```

## Fonts

Fonts are bundled in `alexis.html`; there are no font CDN requests.

- **UI:** Poppins 500, 600 and 700 (SIL Open Font License,
  `assets/fonts/Poppins-OFL.txt`). Weight ceiling is 700.
- **Branding (`--font-brand`):** reserved for Biome, the Lucerna branding face
  by Carl Crossgrove, published by Monotype. Biome is commercial and is **not
  bundled**: it needs a paid Monotype licence that covers embedding the font in
  a distributed app (an application or web licence, depending on how Alexis is
  shipped). The copy Microsoft supplies with Office is licensed for Office use
  only and may not be self-hosted or bundled. Until a licence is bought, page
  titles and the greeting fall back to the UI font. Purchase:
  https://www.myfonts.com/collections/biome-font-crossgrove-studio/

## Not done yet

A public internet deployment would need secure server-backed authentication, a
database, encrypted file storage and a privacy and backup policy before real
financial data is entered.
