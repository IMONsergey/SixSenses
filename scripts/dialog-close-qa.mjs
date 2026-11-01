import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Native pointer/wheel regression for long, nested modal windows. No enquiries
// are submitted. BASE_URL can target a published baseline or a local build.
const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:14336';
const phase = process.env.DIALOG_QA_PHASE || 'after';
const output = path.resolve(process.env.DIALOG_QA_OUTPUT || `artifacts/pixel-audit-20261101-v2/root-dialog-${phase}`);
const engines = (process.env.DIALOG_QA_ENGINES || 'chromium,webkit').split(',');
const report = { project: 'six-senses', base, phase, startedAt: new Date().toISOString(), profiles: [], pageErrors: [], blockedRequests: [] };
await mkdir(output, { recursive: true });

async function settle(page, selector) {
  await page.waitForFunction(selector => {
    const dialog = document.querySelector(selector);
    if (!dialog?.open) return false;
    const style = getComputedStyle(dialog);
    return Number(style.opacity) > .99 && !dialog.getAnimations().some(animation => animation.playState === 'running');
  }, selector);
  await page.waitForTimeout(120);
}

async function measurement(page, id) {
  return page.evaluate(id => {
    const dialog = document.getElementById(id);
    const close = dialog.querySelector(':scope > .close-button');
    const d = dialog.getBoundingClientRect(), b = close.getBoundingClientRect();
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    const hit = x > 0 && x < innerWidth && y > 0 && y < innerHeight && close.contains(document.elementFromPoint(x, y));
    const fullyVisible = b.top >= Math.max(0, d.top) - 1 && b.bottom <= Math.min(innerHeight, d.bottom) + 1 && b.left >= Math.max(0, d.left) - 1 && b.right <= Math.min(innerWidth, d.right) + 1;
    return { scrollTop: dialog.scrollTop, scrollHeight: dialog.scrollHeight, clientHeight: dialog.clientHeight, clientWidth: dialog.clientWidth, scrollWidth: dialog.scrollWidth, dialog: { top: d.top, left: d.left, width: d.width, height: d.height }, close: { top: b.top, left: b.left, width: b.width, height: b.height, x, y, hit, fullyVisible }, focused: document.activeElement?.id, openDialogs: [...document.querySelectorAll('dialog[open]')].map(node => node.id) };
  }, id);
}

async function exercise(page, profile, name, id, open) {
  const result = { name, id, errors: [] };
  try {
    await open();
    await settle(page, `#${id}`);
    result.before = await measurement(page, id);
    await page.screenshot({ path: path.join(output, `${profile.label}-${name}-top.png`) });
    const d = result.before.dialog;
    await page.mouse.move(Math.min(profile.width - 20, d.left + d.width / 2), Math.min(profile.height - 24, Math.max(70, d.top + d.height * .7)));
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(350);
    result.after = await measurement(page, id);
    await page.screenshot({ path: path.join(output, `${profile.label}-${name}-scrolled.png`) });
    if (result.after.scrollHeight > result.after.clientHeight + 2 && result.after.scrollTop < 1) result.errors.push('Native wheel did not move a scrollable modal');
    if (result.after.scrollWidth > result.after.clientWidth + 1) result.errors.push('Horizontal overflow inside modal');
    if (!result.after.close.hit) result.errors.push('Close is not reachable after scrolling');
    if (!result.after.close.fullyVisible) result.errors.push('The close control is partly clipped by the viewport or modal');
    if (Math.abs(result.after.close.top - result.before.close.top) > 2) result.errors.push('Close moved with the scrolled content');
    if (result.after.close.hit) {
      if (profile.isMobile) await page.touchscreen.tap(result.after.close.x, result.after.close.y);
      else await page.mouse.click(result.after.close.x, result.after.close.y);
      await page.waitForFunction(id => !document.getElementById(id).open, id);
      result.nativeClose = true;
    } else {
      await page.keyboard.press('Escape');
      result.nativeClose = false;
    }
    // close() removes [open] immediately, then dispatches the close event as a
    // queued task. Wait for that listener's scroll-lock reconciliation.
    await page.waitForFunction(() => {
      const open = Boolean(document.querySelector('dialog[open]'));
      return document.body.classList.contains('modal-open') === open && document.documentElement.classList.contains('modal-open') === open;
    }, undefined, { timeout: 1500 });
    result.afterClose = await page.evaluate(() => ({ openDialogs: [...document.querySelectorAll('dialog[open]')].map(node => node.id), bodyLocked: document.body.classList.contains('modal-open'), htmlLocked: document.documentElement.classList.contains('modal-open') }));
    if (!result.afterClose.openDialogs.length && (result.afterClose.bodyLocked || result.afterClose.htmlLocked)) result.errors.push('Scroll lock remained after closing the last dialog');
  } catch (error) {
    result.errors.push(error.message);
    await page.keyboard.press('Escape').catch(() => {});
  }
  result.ok = result.errors.length === 0;
  profile.cases.push(result);
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${profile.label} ${name}: ${result.errors.join('; ')}`);
}

for (const engine of engines) {
  const browser = await playwright[engine].launch({ headless: true });
  try {
    for (const [width, height] of [[320, 740], [844, 390]]) {
      // Playwright does not implement mouse.wheel in mobile WebKit. That engine
      // uses a desktop context at the same narrow viewport for the native-wheel
      // check; the separate interaction audit covers mobile WebKit rendering.
      const isMobile = engine !== 'webkit';
      const profile = { label: `${engine}-${width}x${height}`, engine, browserVersion: browser.version(), width, height, isMobile, scrollInput: 'native mouse wheel', closeInput: isMobile ? 'touch tap' : 'mouse click', cases: [] };
      report.profiles.push(profile);
      const context = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile, reducedMotion: 'no-preference' });
      try {
        await context.route('**/api/enquiry**', async route => { report.blockedRequests.push({ method: route.request().method(), url: route.request().url() }); await route.abort('blockedbyclient'); });
        const page = await context.newPage();
        page.setDefaultTimeout(9000);
        page.on('pageerror', error => report.pageErrors.push({ profile: profile.label, message: error.message }));
        await page.goto(base, { waitUntil: 'load', timeout: 25000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => !document.querySelector('.intro')?.classList.contains('is-active'));
        const openMenu = () => page.getByRole('button', { name: 'Open navigation', exact: true }).click();
        await exercise(page, profile, 'menu', 'menu-dialog', openMenu);
        const openEnquiry = async () => {
          await openMenu();
          await settle(page, '#menu-dialog');
          await page.locator('#menu-dialog [data-enquire]').click();
        };
        await exercise(page, profile, 'enquiry', 'enquiry-dialog', openEnquiry);
        // The form opens over the menu. Return through that native stack first.
        if (await page.locator('#menu-dialog').evaluate(node => node.open)) await page.keyboard.press('Escape');
        await openEnquiry();
        await settle(page, '#enquiry-dialog');
        await page.locator('#modal-form [name=firstName]').fill('Visual audit');
        await exercise(page, profile, 'privacy', 'privacy-dialog', () => page.locator('#modal-form [data-privacy]').click());
        await exercise(page, profile, 'terms', 'terms-dialog', () => page.locator('#modal-form [data-terms]').click());
        await page.keyboard.press('Escape');
        if (await page.locator('#menu-dialog').evaluate(node => node.open)) await page.keyboard.press('Escape');
        await openEnquiry();
        await settle(page, '#enquiry-dialog');
        profile.reopen = await page.evaluate(() => ({ scrollTop: document.querySelector('#enquiry-dialog').scrollTop, firstName: document.querySelector('#modal-form [name=firstName]').value }));
        if (profile.reopen.scrollTop > 1 || profile.reopen.firstName !== 'Visual audit') profile.cases.push({ name: 'reopen', ok: false, errors: ['A reopened enquiry lost its initial position or entered data'] });
      } catch (error) { profile.cases.push({ name: 'profile', ok: false, errors: [error.message] }); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
}
report.finishedAt = new Date().toISOString();
report.ok = report.profiles.length === engines.length * 2 && report.profiles.every(profile => profile.cases.length === 4 && profile.cases.every(result => result.ok)) && !report.pageErrors.length && !report.blockedRequests.length;
await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, output, profiles: report.profiles.length, failures: report.profiles.flatMap(profile => profile.cases.filter(result => !result.ok).map(result => ({ profile: profile.label, ...result }))) }));
process.exitCode = report.ok ? 0 : 1;
