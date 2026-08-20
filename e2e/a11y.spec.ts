import { test, expect, type Page } from '@playwright/test';
import { dirname, join } from 'node:path';
import { STATE } from './support/users';

// The accessibility baseline (R2 D20).
//
// axe across the funnel, and the keyboard walk that had never been done. Both run here
// rather than as a sweep somebody did once, because an accessibility baseline that is not
// enforced is a snapshot of one afternoon.
//
// Public screens run unauthenticated on every pull request. The library is signed-in
// only, so its axe and keyboard walks sit behind E2E_WITH_AUTH like the rest of the
// signed-in specs. The editor's content panel is still owed — see docs/r2-week-4-plan.md.

const withAuth = process.env.E2E_WITH_AUTH === '1';

// What the D20 sweep found, for anyone reading a green run and wondering what it is worth:
//   · aria-pressed on all forty filter chips. Only valid on a button; these are links, so
//     an unsupported attribute meant no announcement at all and the active filter was
//     conveyed by colour alone. Critical.
//   · The brand red as small text: 4.06:1 on the near-black surface, against the 4.5:1 AA
//     asks for. Serious. Fixed with a separate --brand-ink token rather than by lightening
//     the brand, which would have broken white-on-red buttons instead.
//   · The landing page's "How it works" sat outside every landmark.

// Resolved from node_modules rather than fetched from a CDN: the page runs under a strict
// CSP, and an audit that needs the network is an audit that goes quiet on a bad day.
const AXE_PATH: string = join(dirname(require.resolve('axe-core/package.json')), 'axe.min.js');

interface AxeViolation {
    id: string;
    impact: string | null;
    help: string;
    nodes: { html: string; target: string[] }[];
}

/** Everything axe finds at critical or serious. Below that is a judgement call, not a gate. */
async function seriousViolations(page: Page): Promise<AxeViolation[]> {
    await page.addScriptTag({ path: AXE_PATH });
    const results = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: AxeViolation[] }> } }).axe;
        return axe.run(document, { resultTypes: ['violations'] });
    });
    return results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
}

function describeViolations(violations: AxeViolation[]): string {
    return violations
        .map((v) => `${v.impact}: ${v.id} — ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`)
        .join('\n');
}

const SCREENS = [
    { name: 'landing', url: '/' },
    { name: 'sign in', url: '/signin' },
    { name: 'describe your site', url: '/new' },
];

test.describe('axe across the funnel', () => {
    for (const screen of SCREENS) {
        test(`${screen.name} has no critical or serious violations`, async ({ page }) => {
            await page.goto(screen.url);
            const violations = await seriousViolations(page);
            expect(describeViolations(violations)).toBe('');
        });
    }

    test('the library is not a signed-out destination', async ({ page }) => {
        await page.goto('/templates');
        await expect(page).toHaveURL(/\/signin/);
    });
});

test.describe('axe across the signed-in library', () => {
    test.skip(!withAuth, 'needs Upstash: set E2E_WITH_AUTH=1');
    test.use({ storageState: STATE.first });

    test('the gallery has no critical or serious violations', async ({ page }) => {
        await page.goto('/templates');
        const violations = await seriousViolations(page);
        expect(describeViolations(violations)).toBe('');
    });

    test('the design detail dialog has none either', async ({ page }) => {
        await page.goto('/templates');
        await page.locator('article button').first().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // The design has to have actually loaded before the sweep means anything.
        //
        // This test asserted only that the dialog was visible and named, and the modal's
        // error state satisfies both — a "we could not load this design" panel is a visible,
        // correctly-labelled, accessible dialog. So it passed happily while the detail fetch
        // was failing, which is precisely what happened on a dev server whose route table had
        // gone stale. A11y-clean and broken is still broken, and the test could not tell.
        await expect(dialog.getByRole('heading', { name: /what you can change/i })).toBeVisible();
        await expect(dialog).not.toContainText(/could not load|could not reach/i);

        const violations = await seriousViolations(page);
        expect(describeViolations(violations)).toBe('');
    });
});

test.describe('the core flow, with only a keyboard', () => {
    test.skip(!withAuth, 'needs Upstash: set E2E_WITH_AUTH=1');
    test.use({ storageState: STATE.first });
    // Never walked end to end before D20. The browser drives real Tab presses here, which
    // is the part a hand-written focus() loop cannot stand in for — it is the browser's own
    // sequencing being tested, not our idea of it.

    test('tabbing reaches the gallery and every stop shows where it is', async ({ page }) => {
        await page.goto('/templates');
        await page.locator('body').click({ position: { x: 2, y: 2 } });

        const invisible: string[] = [];
        let reachedAChip = false;
        let reachedATile = false;

        for (let step = 0; step < 60; step += 1) {
            await page.keyboard.press('Tab');

            const stop = await page.evaluate(() => {
                const el = document.activeElement as HTMLElement | null;
                if (!el || el === document.body) return null;
                const cs = getComputedStyle(el);
                const outlined =
                    cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth || '0') > 0;
                const shadowed = cs.boxShadow !== 'none' && cs.boxShadow !== '';
                return {
                    name: (el.getAttribute('aria-label') || el.innerText || '')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, 40),
                    visible: outlined || shadowed,
                    isChip: !!el.closest('[aria-label="Filter designs"]'),
                    isTile: !!el.closest('article'),
                };
            });

            if (!stop) continue;
            // A focus stop nobody can see is a keyboard user lost on the page.
            if (!stop.visible) invisible.push(stop.name || '(unnamed)');
            if (stop.isChip) reachedAChip = true;
            if (stop.isTile) reachedATile = true;
            if (reachedAChip && reachedATile) break;
        }

        expect(invisible, 'focus stops with no visible indicator').toEqual([]);
        expect(reachedAChip, 'never reached a filter chip by keyboard').toBe(true);
        expect(reachedATile, 'never reached a design tile by keyboard').toBe(true);
    });

    test('a design opens, traps focus, and gives it back on Escape', async ({ page }) => {
        // The whole dialog contract, which is where keyboard access usually breaks: opened
        // by key rather than by mouse, focus moved in, the page behind it hidden from
        // assistive technology, and — the part everyone forgets — focus handed back to the
        // control it came from, rather than dumped at the top of the document.
        await page.goto('/templates');

        const tile = page.locator('article button').first();
        await tile.focus();
        await page.keyboard.press('Enter');

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAccessibleName(/.+/);

        // Focus is inside, and the rest of the page is not offered to a screen reader.
        expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
        expect(
            await page.evaluate(() =>
                [...document.querySelectorAll('[aria-hidden="true"]')].some((e) =>
                    e.contains(document.querySelector('article')),
                ),
            ),
        ).toBe(true);

        // Tab all the way round: focus must never escape into the page behind.
        for (let i = 0; i < 10; i += 1) {
            await page.keyboard.press('Tab');
            expect(
                await dialog.evaluate((d) => d.contains(document.activeElement)),
                `focus left the dialog after ${i + 1} tabs`,
            ).toBe(true);
        }

        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        expect(await tile.evaluate((t) => document.activeElement === t)).toBe(true);
    });

    test('the filter chips say which one is chosen, not just colour it', async ({ page }) => {
        // The critical finding, as a regression test. aria-pressed was invalid on a link, so
        // the selected filter was announced to nobody.
        await page.goto('/templates?category=fitness');

        const chip = page.getByRole('link', { name: /^Fitness/ });
        await expect(chip).toHaveAttribute('aria-current', 'true');
        await expect(chip).toHaveAccessibleName(/selected/i);

        expect(
            await page.evaluate(() => document.querySelectorAll('[aria-pressed]').length),
            'aria-pressed is back on an element that cannot carry it',
        ).toBe(0);
    });

    test('an empty gallery announces itself instead of going quiet', async ({ page }) => {
        await page.goto('/templates?search=zzzznothingmatches');

        const status = page.getByRole('status');
        await expect(status).toContainText(/no designs match/i);
        await expect(page.getByRole('link', { name: /clear filters/i })).toBeVisible();
    });
});
