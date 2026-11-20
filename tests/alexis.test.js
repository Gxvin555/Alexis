/* Alexis regression tests.
   Run: node --test tests/          (needs Playwright with Chromium; see HANDOVER.md)
   Every test uses a fresh browser profile and synthetic records only. */
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const KEY = 'amethyst-money-v1', PINKEY = 'amethyst-money-pin-v1', PREF = 'amethyst-money-prefs-v1';
let server, base, browser;

function serve(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain' };
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
      const file = path.resolve(dir, rel || 'alexis.html');
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

/* ALEXIS_DIR can point at another copy of the app (for example an older build) to show which
   tests it fails. Defaults to this repository. */
const APP_DIR = process.env.ALEXIS_DIR ? path.resolve(process.env.ALEXIS_DIR) : ROOT;
before(async () => {
  server = await serve(APP_DIR);
  base = `http://127.0.0.1:${server.address().port}/alexis.html`;
  browser = await chromium.launch();
});
after(async () => { await browser.close(); server.close(); });

/* Storage switches the tests can flip from Node: block writes to the vault, or block all reads. */
const STORAGE_HOOKS = `(() => {
  const set = Storage.prototype.setItem, get = Storage.prototype.getItem;
  Storage.prototype.setItem = function (k, v) {
    if (window.__blockWrites && (window.__blockWrites === true || window.__blockWrites === k))
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    return set.call(this, k, v);
  };
  Storage.prototype.getItem = function (k) {
    if (localStorage.getItem.__blockReads || window.__blockReads) throw new DOMException('Blocked', 'SecurityError');
    return get.call(this, k);
  };
})();`;

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 800 }, acceptDownloads: true });
  await ctx.addInitScript(STORAGE_HOOKS);
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
  page.errors = errors; page.failed = failed;
  return page;
}
const vault = page => page.evaluate(k => localStorage.getItem(k), KEY);
const toast = page => page.textContent('#toast');
const dialogError = page => page.textContent('#modalRoot .form-error');
async function unlockFresh(page, pin = '2468') {
  await page.goto(base);
  await page.fill('#pin', pin);
  await page.press('#pin', 'Enter');
  await page.waitForSelector('#wizardLater');
  await page.click('#wizardLater');
  await page.waitForSelector('.balance');
}
async function unlock(page, pin = '2468') {
  await page.fill('#pin', pin);
  await page.press('#pin', 'Enter');
}
async function seedAndReload(page, data, pin = '2468') {
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, data]);
  await page.reload();
  await unlock(page, pin);
  await page.waitForSelector('.balance');
}
async function addTx(page, { kind = 'expense', desc, cat, amount }) {
  await page.click('#headingAction [data-add=transaction]');
  await page.selectOption('#entryForm [name=kind]', kind);
  await page.fill('#entryForm [name=description]', desc);
  if (cat) await page.selectOption('#entryForm [name=category]', cat);
  await page.fill('#entryForm [name=amount]', amount);
  await page.click('#entryForm .primary');
}
function fixture(extra = {}) {
  return Object.assign({
    version: 5,
    transactions: [
      { id: 'a', kind: 'income', date: '2026-11-02', description: 'Shop sales', category: 'Sales', amount: 125050, notes: '' },
      { id: 'b', kind: 'expense', date: '2026-11-03', description: 'Weekly shop', category: 'Groceries', amount: 5432, notes: '' },
    ],
    budgets: [], bills: [], loans: [], debts: [], contacts: [],
    payroll: { salary: 30000 }, profile: { name: 'Sam', setupComplete: true, createdAt: '2026-01-01T00:00:00Z', lastBackup: '' },
  }, extra);
}

test('first run, keyboard PIN, integer pennies survive reload', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await addTx(page, { kind: 'income', desc: 'Ten pence', cat: 'Sales', amount: '0.10' });
  await addTx(page, { kind: 'income', desc: 'Twenty pence', cat: 'Sales', amount: '0.20' });
  const stored = JSON.parse(await vault(page)).transactions.map(t => t.amount).sort();
  assert.deepEqual(stored, [10, 20]);
  await page.reload(); await unlock(page); await page.waitForSelector('.balance');
  assert.equal(await page.textContent('.balance-copy strong'), '£0.30');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('AL-01: a failed save keeps the dialog open, shows no success and changes nothing', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await addTx(page, { kind: 'income', desc: 'Kept', cat: 'Sales', amount: '10' });
  const before = await vault(page);
  await page.evaluate(k => { window.__blockWrites = k }, KEY);
  await addTx(page, { desc: 'Should not stick', cat: 'Equipment', amount: '99.99' });
  assert.ok(await page.isVisible('#entryForm'), 'dialog stays open');
  assert.equal(await page.inputValue('#entryForm [name=description]'), 'Should not stick', 'entry kept for retry');
  assert.match(await dialogError(page), /^Not saved/, 'error shown inside the dialog');
  assert.doesNotMatch(await toast(page), /Not saved/, 'the error is not also a toast over the dialog');
  assert.equal(await vault(page), before, 'stored records unchanged');
  assert.ok(await page.isVisible('#storageBanner'));
  // Retry after storage recovers.
  await page.evaluate(() => { window.__blockWrites = false });
  await page.click('#entryForm .primary');
  assert.ok(!(await page.isVisible('#entryForm')));
  assert.equal(JSON.parse(await vault(page)).transactions.length, 2);
  // Delete with storage blocked: the record stays, on screen and after reload.
  await page.click('[data-page=Transactions]');
  await page.evaluate(k => { window.__blockWrites = k }, KEY);
  await page.locator('.transaction', { hasText: 'Kept' }).locator('.row-remove').click();
  await page.click('#removeNow');
  assert.match(await dialogError(page), /^Not saved/);
  await page.click('#keep');
  assert.equal(await page.locator('.transaction', { hasText: 'Kept' }).count(), 1);
  await page.evaluate(() => { window.__blockWrites = false });
  await page.reload(); await unlock(page);
  await page.click('[data-page=Transactions]');
  assert.equal(await page.locator('.transaction', { hasText: 'Kept' }).count(), 1);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('AL-01: Mavis confirmation and preferences report storage failure honestly', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await page.click('#askJack');
  await page.fill('#jackInput', 'I spent £12.40 on fuel');
  await page.press('#jackInput', 'Enter');
  await page.waitForTimeout(250);
  await page.evaluate(k => { window.__blockWrites = k }, KEY);
  await page.locator('.jack-action', { hasText: 'Confirm' }).last().click();
  assert.match(await page.locator('.jack-bubble').last().textContent(), /Not saved/);
  assert.equal(await vault(page) && JSON.parse(await vault(page)).transactions.length, 0);
  await page.evaluate(() => { window.__blockWrites = false });
  await page.locator('.jack-action', { hasText: 'Try again' }).last().click();
  assert.match(await page.locator('.jack-bubble').last().textContent(), /^Added/);
  assert.equal(JSON.parse(await vault(page)).transactions.length, 1);
  await page.click('#jackClose');
  await page.evaluate(k => { window.__blockWrites = k }, PREF);
  await page.click('[data-page=Settings]');
  await page.click('[data-setting=density][data-value=compact]');
  assert.match(await toast(page), /session only/);
  await page.context().close();
});

test('AL-01: restore validates, cancels cleanly and never switches records after a failed write', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await seedAndReload(page, fixture());
  const original = await vault(page);
  await page.click('[data-page=Reports]');
  const file = (name, body) => ({ name, mimeType: 'application/json', buffer: Buffer.from(body) });
  // Malformed and wrong-shape files: error, nothing changes.
  for (const body of ['{not json', '{"nope":1}', '[1,2,3]']) {
    await page.setInputFiles('#restoreFile', file('bad.json', body));
    await page.waitForFunction(() => /not valid/.test(document.getElementById('toast').textContent));
    await page.evaluate(() => { document.getElementById('toast').textContent = '' });
    assert.equal(await toast(page), '');
    assert.equal(await vault(page), original);
  }
  // A legacy Amethyst export: a bare vault, older version, partly invalid fields.
  const legacy = { version: 3, transactions: [
    { id: 'x1', kind: 'income', date: '2025-01-05', description: 'Salary', category: 'Salary', amount: 210000 },
    { kind: 'weird', date: 'not a date', description: null, amount: '12.7' },
    'garbage',
  ], loans: [{ id: 'L', person: 'Jo', amount: 10000, lentDate: '2025-02-01', repayments: [{ id: 'r', amount: 2500, date: '2025-02-10' }] }] };
  await page.setInputFiles('#restoreFile', file('legacy.json', JSON.stringify(legacy)));
  assert.equal(await page.textContent('.confirm h2'), 'Replace your records?');
  await page.click('#restoreCancel');
  assert.equal(await vault(page), original, 'cancel leaves records unchanged');
  // Storage refuses the write: confirm stays open, records unchanged.
  await page.setInputFiles('#restoreFile', file('legacy.json', JSON.stringify(legacy)));
  await page.evaluate(k => { window.__blockWrites = k }, KEY);
  await page.click('#restoreGo');
  assert.match(await dialogError(page), /^Restore failed/);
  assert.ok(await page.isVisible('.confirm'));
  assert.equal(await vault(page), original);
  await page.click('#restoreCancel');
  await page.click('[data-page=Overview]');
  assert.equal(await page.textContent('.balance-copy strong'), '£1,196.18');
  // Storage accepts: restored, sanitised, legacy category kept, linked repayment intact.
  await page.click('[data-page=Reports]');
  await page.evaluate(() => { window.__blockWrites = false });
  await page.setInputFiles('#restoreFile', file('legacy.json', JSON.stringify(legacy)));
  await page.click('#restoreGo');
  assert.equal(await toast(page), 'Backup restored');
  const v = JSON.parse(await vault(page));
  assert.equal(v.transactions.length, 2);
  assert.equal(v.transactions[0].category, 'Salary');
  assert.ok(v.transactions.every(t => Number.isInteger(t.amount)));
  assert.equal(v.loans[0].repayments[0].amount, 2500);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('backup round trip: totals and linked repayments match exactly; documents are excluded', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await seedAndReload(page, fixture());
  // Lend 500, part repay 200, borrow 1,000, repay 250, all through the interface.
  await page.click('[data-page="Owed to you"]');
  await page.click('#headingAction [data-add=loan]');
  await page.fill('#loanForm [name=person]', 'Northwind Ltd');
  await page.fill('#loanForm [name=amount]', '500');
  await page.click('#loanForm .primary');
  await page.click('[data-repay-loan]');
  await page.fill('#repaymentForm [name=amount]', '200');
  await page.click('#repaymentForm .primary');
  await page.click('[data-page="You owe"]');
  await page.click('#headingAction [data-add=debt]');
  await page.fill('#debtForm [name=person]', 'Bank');
  await page.fill('#debtForm [name=amount]', '1000');
  await page.click('#debtForm .primary');
  await page.click('[data-repay-debt]');
  await page.fill('#debtRepaymentForm [name=amount]', '250');
  await page.click('#debtRepaymentForm .primary');
  // A stored document.
  await page.click('[data-page=Documents]');
  await page.setInputFiles('#docFile', { name: 'receipt.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic') });
  await page.click('#uploadForm .primary');
  await page.waitForSelector('.doc-row');
  const before = JSON.parse(await vault(page));
  await page.click('[data-page=Reports]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#backupBtn')]);
  const backupText = fs.readFileSync(await dl.path(), 'utf8');
  const backup = JSON.parse(backupText);
  assert.ok(!/synthetic|receipt\.txt/.test(backupText), 'documents are not in the JSON backup');
  // Restore into a fresh profile.
  const fresh = await newPage();
  await unlockFresh(fresh, '1357');
  await fresh.click('[data-page=Reports]');
  await fresh.setInputFiles('#restoreFile', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backupText) });
  await fresh.waitForFunction(() => /Backup restored/.test(document.getElementById('toast').textContent));
  const after = JSON.parse(await vault(fresh));
  const sum = v => v.transactions.reduce((s, t) => s + (t.kind === 'income' ? t.amount : -t.amount), 0);
  assert.equal(sum(after), sum(before));
  assert.equal(after.transactions.length, before.transactions.length);
  assert.deepEqual(after.loans[0].repayments.map(r => r.amount), [20000]);
  assert.deepEqual(after.debts[0].repayments.map(r => r.amount), [25000]);
  const loanId = after.loans[0].id, repId = after.loans[0].repayments[0].id;
  assert.ok(after.transactions.some(t => t.notes.startsWith(`Loan repayment:${loanId}:${repId}`)), 'repayment still linked to its income');
  await fresh.click('[data-page=Overview]');
  await page.click('[data-page=Overview]');
  assert.equal(await fresh.textContent('.balance-copy strong'), await page.textContent('.balance-copy strong'));
  await fresh.click('[data-page=Documents]');
  await fresh.waitForSelector('#docList .empty');
  assert.equal(backup.version, 5);
  await fresh.context().close(); await page.context().close();
});

test('bills: paying twice in one month records one transaction; month and local day are correct', async () => {
  const page = await newPage();
  // 00:30 on 1 March 2026 in London local time.
  await page.clock.setFixedTime(new Date('2026-03-01T00:30:00'));
  await unlockFresh(page);
  await page.click('[data-page="Bills & reminders"]');
  await page.click('#headingAction [data-add=bill]');
  await page.fill('#entryForm [name=name]', 'Business rates');
  await page.fill('#entryForm [name=amount]', '120');
  await page.fill('#entryForm [name=dueDay]', '31');
  await page.click('#entryForm .primary');
  await page.click('[data-pay-bill]');
  await page.click('.bill-paid', { force: true });
  const v = JSON.parse(await vault(page));
  const paid = v.transactions.filter(t => t.notes.startsWith('Recurring bill:'));
  assert.equal(paid.length, 1);
  assert.equal(paid[0].date, '2026-03-01');
  assert.ok(paid[0].notes.endsWith(':2026-03'));
  assert.ok(await page.isDisabled('.bill-paid'));
  await page.context().close();
});

test('partial repayments, editing and removing a repayment keep linked cash movements coherent', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await page.click('[data-page="Owed to you"]');
  await page.click('#headingAction [data-add=loan]');
  await page.fill('#loanForm [name=person]', 'Riley');
  await page.fill('#loanForm [name=amount]', '100.01');
  await page.click('#loanForm .primary');
  await page.click('[data-repay-loan]');
  await page.fill('#repaymentForm [name=amount]', '33.33');
  await page.click('#repaymentForm .primary');
  assert.equal(await page.textContent('.loan-amount strong'), '£66.68');
  await page.click('[data-edit-loan]');
  await page.fill('#editLoanForm [name=person]', 'Riley Carter');
  await page.click('#editLoanForm .primary');
  let v = JSON.parse(await vault(page));
  assert.ok(v.transactions.some(t => t.description === 'Lent to Riley Carter'));
  assert.ok(v.transactions.some(t => t.description === 'Repayment from Riley Carter'));
  await page.click('[data-loan-history]');
  await page.click('[data-remove-repayment]');
  await page.click('#removeNow');
  v = JSON.parse(await vault(page));
  assert.equal(v.loans[0].repayments.length, 0);
  assert.ok(!v.transactions.some(t => t.notes.startsWith('Loan repayment:')));
  assert.equal(v.transactions.reduce((s, t) => s + (t.kind === 'income' ? t.amount : -t.amount), 0), -10001);
  await page.context().close();
});

test('CSV import: quoting, duplicates, invalid dates, fractional pennies, formula text, cancellation', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await page.click('[data-page=Reports]');
  const csv = [
    'Date,Type,Description,Category,Amount,Notes',
    '2026-11-02,income,"Sales, market stall",Sales,"1,234.56","line one',
    'line two"',
    '2026-11-02,income,"Sales, market stall",Sales,"1,234.56",',
    '2026-13-45,expense,Bad date,Other,5,',
    '02/11/2026,expense,Wrong format,Other,5,',
    '2026-11-03,expense,=SUM(A1:A9),Other,12.345,',
    '2026-11-04,expense,"Unclosed quote,Other,7,',
  ].join('\n');
  await page.setInputFiles('#csvImport', { name: 't.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.waitForFunction(() => /imported/.test(document.getElementById('toast').textContent));
  assert.match(await toast(page), /^2 transactions imported · 4 skipped$/);
  const v = JSON.parse(await vault(page)).transactions;
  const sales = v.filter(t => t.description === 'Sales, market stall');
  assert.equal(sales.length, 1, 'duplicate skipped');
  assert.equal(sales[0].amount, 123456);
  assert.equal(sales[0].notes, 'line one\nline two');
  assert.ok(!v.some(t => /Bad date|Wrong format/.test(t.description)), 'invalid dates rejected');
  const formula = v.find(t => t.description === '=SUM(A1:A9)');
  assert.ok(formula, 'formula-like text kept as plain text');
  assert.ok(Number.isInteger(formula.amount) && Math.abs(formula.amount - 1235) <= 1, 'fractional pennies round to a whole penny');
  assert.ok(v.every(t => Number.isInteger(t.amount)));
  const countBefore = v.length;
  await page.setInputFiles('#csvImport', []);
  assert.equal(JSON.parse(await vault(page)).transactions.length, countBefore, 'cancelled picker changes nothing');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('AL-02: documents persist, and an aborted transaction is reported as a failure', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await page.click('[data-page=Documents]');
  await page.setInputFiles('#docFile', { name: 'kept.txt', mimeType: 'text/plain', buffer: Buffer.from('a') });
  await page.click('#uploadForm .primary');
  await page.waitForSelector('.doc-row');
  await page.reload(); await unlock(page);
  await page.click('[data-page=Documents]');
  await page.waitForSelector('.doc-row');
  assert.equal(await page.textContent('.doc-row b'), 'kept.txt', 'document persisted across reload');
  // The request succeeds, then the transaction aborts before commit.
  await page.evaluate(() => {
    for (const m of ['put', 'delete']) {
      const orig = IDBObjectStore.prototype[m];
      IDBObjectStore.prototype[m] = function (...a) {
        const r = orig.apply(this, a);
        r.addEventListener('success', () => { if (window.__abortDocs) this.transaction.abort(); });
        return r;
      };
    }
    window.__abortDocs = true;
  });
  await page.setInputFiles('#docFile', { name: 'lost.txt', mimeType: 'text/plain', buffer: Buffer.from('b') });
  await page.click('#uploadForm .primary');
  await page.waitForFunction(() => /not been saved/.test(document.getElementById('toast').textContent));
  assert.ok(!(await page.isDisabled('#uploadForm .primary')), 'not left busy');
  await page.click('.doc-row .row-remove');
  await page.waitForFunction(() => /could not be removed/.test(document.getElementById('toast').textContent));
  await page.evaluate(() => { window.__abortDocs = false });
  await page.reload(); await unlock(page);
  await page.click('[data-page=Documents]');
  await page.waitForSelector('.doc-row');
  assert.deepEqual(await page.locator('.doc-row b').allTextContents(), ['kept.txt']);
  // Retry works once the abort is gone.
  await page.click('.doc-row .row-remove');
  await page.waitForSelector('#docList .empty');
  await page.context().close();
});

test('AL-03: unreadable records are kept, downloadable and only replaced on request', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await page.evaluate(k => localStorage.setItem(k, '{"transactions":[{"id":"a"'), KEY);
  await page.reload();
  await unlock(page);
  await page.waitForSelector('#recoveryTitle');
  assert.equal(await page.textContent('#recoveryTitle'), 'Your records cannot be read');
  assert.ok(await page.isHidden('#app'));
  assert.equal(await vault(page), '{"transactions":[{"id":"a"', 'nothing overwritten');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#recoveryDownload')]);
  const rec = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  assert.equal(rec.vaultRecord, '{"transactions":[{"id":"a"');
  // Cancel the confirmation: still nothing changes.
  page.once('dialog', d => d.dismiss());
  await page.click('#recoveryEmpty');
  assert.equal(await vault(page), '{"transactions":[{"id":"a"');
  // Restore a backup from the recovery screen.
  page.once('dialog', d => d.accept());
  await page.setInputFiles('#recoveryRestore', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 5, data: fixture() })) });
  await page.waitForSelector('.balance');
  assert.equal(JSON.parse(await vault(page)).transactions.length, 2);
  const kept = await page.evaluate(k => Object.keys(localStorage).filter(x => x.startsWith(k + '-unreadable-')).map(x => localStorage.getItem(x)), KEY);
  assert.deepEqual(kept, ['{"transactions":[{"id":"a"']);
  await page.context().close();
});

test('AL-03: a damaged PIN record does not touch the records and allows a new PIN', async () => {
  const page = await newPage();
  await unlockFresh(page);
  await seedAndReload(page, fixture());
  const records = await vault(page);
  await page.evaluate(k => localStorage.setItem(k, '{broken'), PINKEY);
  await page.reload();
  await page.waitForSelector('#recoveryTitle');
  assert.equal(await page.textContent('#recoveryTitle'), 'The saved PIN cannot be read');
  assert.equal(await vault(page), records);
  await page.click('#recoveryNewPin');
  assert.equal(await page.textContent('#lockTitle'), 'Create a new PIN');
  await unlock(page, '9999');
  await page.waitForSelector('.balance');
  assert.equal(await page.textContent('#pageGreeting').then(t => t.endsWith('Sam')), true);
  assert.equal(await vault(page), records, 'records unchanged by the PIN reset');
  await page.context().close();
});

test('AL-03: blocked storage and missing browser crypto produce clear, non-destructive screens', async () => {
  const blocked = await newPage({ init: 'window.__blockReads = true;' });
  await blocked.goto(base);
  await blocked.waitForSelector('#recoveryTitle');
  assert.equal(await blocked.textContent('#recoveryTitle'), 'Storage is blocked');
  await blocked.context().close();
  const noCrypto = await newPage({ init: 'Object.defineProperty(window.crypto, "subtle", { value: undefined });' });
  await noCrypto.goto(base);
  await noCrypto.waitForSelector('#recoveryTitle');
  assert.equal(await noCrypto.textContent('#recoveryTitle'), 'This browser cannot check the PIN');
  await noCrypto.context().close();
});

test('a valid existing Amethyst vault and PIN open unchanged', async () => {
  const page = await newPage();
  await unlockFresh(page, '4321');
  await seedAndReload(page, fixture(), '4321');
  const before = await vault(page);
  await page.reload();
  await unlock(page, '4321');
  await page.waitForSelector('.balance');
  assert.equal(await vault(page), before);
  assert.equal(await page.textContent('.balance-copy strong'), '£1,196.18');
  await page.context().close();
});

test('locking clears Mavis, dialogs, onboarding and the mobile menu', async () => {
  const page = await newPage({ viewport: { width: 390, height: 844 } });
  await page.clock.install();
  await page.goto(base);
  await unlock(page);
  await page.waitForSelector('.wizard-bg');
  await page.click('#wizardLater');
  // One-minute auto-lock, set through the real preference store.
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ theme: 'dark', autoLock: 1 })), PREF);
  await page.reload();
  await unlock(page);
  await page.waitForSelector('.balance');
  await page.click('#askJack');
  await page.click('#jackClose');
  await page.click('#navToggle');
  await page.click('#nav [data-page=Transactions]');
  await page.click('#headingAction [data-add=transaction]');
  await page.evaluate(() => { window.__mavisWasOpened = true; document.getElementById('jackPanel').classList.add('open'); document.getElementById('sidebar').classList.add('open'); document.getElementById('navScrim').hidden = false; });
  await page.evaluate(() => { document.getElementById('onboardingRoot').innerHTML = '<div class="wizard-bg">x</div>'; });
  await page.clock.fastForward('01:05');
  assert.ok(await page.isVisible('#lock'));
  assert.equal(await page.evaluate(() => document.getElementById('modalRoot').innerHTML), '');
  assert.equal(await page.evaluate(() => document.getElementById('onboardingRoot').innerHTML), '');
  assert.ok(!(await page.evaluate(() => document.getElementById('jackPanel').classList.contains('open'))));
  assert.ok(!(await page.evaluate(() => document.getElementById('sidebar').classList.contains('open'))));
  assert.ok(await page.isHidden('#navScrim'));
  await page.context().close();
});

test('packaged folder opens from file:// and over HTTP with every asset present', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'alexis-pkg-'));
  execFileSync('python3', ['-I', '-B', path.join(ROOT, 'tools', 'package.py'), out]);
  const dir = path.join(out, 'alexis');
  const pkgServer = await serve(dir);
  for (const url of [`file://${dir}/alexis.html`, `http://127.0.0.1:${pkgServer.address().port}/alexis.html`]) {
    const page = await newPage();
    await page.goto(url);
    await page.fill('#pin', '2468');
    await page.press('#pin', 'Enter');
    await page.waitForSelector('#wizardLater');
    await page.click('#wizardLater');
    await addTx(page, { kind: 'income', desc: 'Packaged', cat: 'Sales', amount: '1' });
    assert.equal(await page.textContent('.balance-copy strong'), '£1.00', url);
    await page.click('[data-page=Settings]');
    const imgs = await page.evaluate(() => [...document.images].filter(i => i.offsetParent).map(i => [i.getAttribute('src'), i.naturalWidth]));
    assert.ok(imgs.length >= 2 && imgs.every(([, w]) => w > 0), `${url} images: ${JSON.stringify(imgs)}`);
    assert.deepEqual(page.failed.filter(u => !u.endsWith('favicon.ico')), [], url);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }
  pkgServer.close();
  fs.rmSync(out, { recursive: true, force: true });
});
