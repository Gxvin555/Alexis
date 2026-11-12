# Alexis

Alexis is Lucerna's private, offline business finance app for one device. It
records business income and expenditure, budgets, recurring bills, money the
business has lent or borrowed, and business documents. Everything is stored in
this browser and never leaves the machine. Mavis, the built-in assistant,
answers from those records only; there is no external AI service.

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
- **Mavis**: answers questions about the records and opens pages and forms.

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
avenir. The only per-app value is the accent: Alexis is amber (`#D99A32`).
Tokens, components and responsive rules live in one stylesheet in
`alexis.html`. See `CLAUDE.md` for the rules.

## Brand assets

`assets/img/` holds the brand artwork:

- `lucerna.png`, `lucerna-light.png`: the Lucerna sub-brand, shown once at the
  foot of Settings.
- `alexis-wordmark.png`, `alexis-wordmark-light.png`, `favicon.png`: the Alexis
  wordmark for light and dark surfaces, and its dot. Generate them from the
  supplied artwork with:

  ```
  python3 tools/make_wordmark_variants.py "Alexis - Finance.png"
  ```

  The tool copies the artwork unchanged, makes the dark-surface copy by
  recolouring the lettering only, and crops the dot for the favicon. Until the
  files exist, the app shows the plain name "Alexis" in their place.

Poppins (SIL Open Font License, `assets/fonts/Poppins-OFL.txt`) is embedded in
`alexis.html` so the app works offline.

## Not done yet

A public internet deployment would need secure server-backed authentication, a
database, encrypted file storage and a privacy and backup policy before real
financial data is entered.
