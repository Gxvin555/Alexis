# Amethyst Money

A private, offline personal money planner for one person on one device.
Everything lives in the browser: money records, bills, lending, documents and
settings are stored locally and never leave the machine.

Amethyst is built on the Telecom Networks design system, the same system used
by Aurora and Alien HR, recoloured to amethyst. It is a single self-contained
HTML file with no backend and no build step.

## Running it

Keep `amethyst-money.html` and both `amethyst-logo` SVG files together, then
open `amethyst-money.html` in a modern browser. Create your four digit PIN and
complete the getting started wizard.

Any static file server also works, for example:

```
python3 -m http.server 8080
```

then open `http://localhost:8080/amethyst-money.html`.

## What it does

- **Overview** with a life pulse for the next unpaid bill, money owed to you and
  the date of your last backup, plus a six month cash flow view.
- **Transactions**, **Budgets** and **Bills and reminders**. Paid bills stay
  marked for the month so they cannot be recorded twice.
- **Owed to you** and **You owe** for money lent to, and borrowed from, other
  people, with contacts, partial repayments, overdue flags and a projected
  payback date based on each contact's history.
- **Payday and tax** with estimated PAYE deductions and a take home breakdown.
- **Documents** stored in a separate browser vault.
- **Reports and exports** to Excel and CSV. CSV import columns are Date, Type,
  Description, Category, Amount, Notes, with dates in YYYY-MM-DD.
- **Money tools**: a savings goal planner, a debt payoff estimate with APR, a
  bill splitter with optional tip and a 50/30/20 take home guide. These are
  planning aids only and do not change saved records.
- **Ask Jack**, a private assistant that answers from the data in this vault.

## Backups and data

Download regular record backups from Settings. Document files live in the
browser document vault and are not included in JSON backups. Lending, debts,
contacts and timing estimates are included in JSON backups and in Excel exports.

## Design system

The palette, radius scale, shadow scale and component treatments are defined
once, near the end of the stylesheet, as a single source of truth. The brand
colour is amethyst; everything else (neutrals, status colours and the scales) is
shared with the rest of the Telecom Networks design system. Light and dark
themes are driven from the same tokens.

## Not done yet

This local release does not sync between devices. A public internet deployment
would need secure server backed authentication, a database, encrypted file
storage and a privacy and backup policy before real financial data is entered.
