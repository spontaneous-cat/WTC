import { writeFile } from 'node:fs/promises';
import { test, expect, type Page, type TestInfo } from '@playwright/test';

const names = [
  'Fake One',
  'Alexandra the Very Long Named Fake Player'.slice(0, 40),
  'AlexandertheUnreasonablyLongFakePlayerName'.slice(0, 40),
];
const privateRole =
  /^Private: (killer · evil|good · good|neutral_exile · neutral) · alive$/;

async function nameAdmin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Change name', exact: true }).click();
  await page.getByLabel('Display name', { exact: true }).fill('Dev Admin');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByText('Dev Admin', { exact: true })).toBeVisible();
}

async function inspectList(page: Page, testInfo: TestInfo, state: string) {
  const viewport = page.viewportSize()!;
  const list = page.getByTestId('fake-player-list');
  const rows = page.getByLabel(/Fake player row for /);
  const dimensions = await rows.evaluateAll((elements) =>
    elements.map((el) => {
      const { width, height } = el.getBoundingClientRect();
      return { name: el.getAttribute('aria-label'), width, height };
    }),
  );
  // Three representative rows should fit in one phone-height viewport.
  expect((await list.boundingBox())!.height).toBeLessThanOrEqual(
    viewport.height,
  );
  for (const row of await rows.all()) {
    // A common list surface and separators, not separately framed cards.
    await expect(row).toHaveCSS('border-radius', '0px');
    await expect(row).toHaveCSS('border-left-width', '0px');
    await expect(row).toHaveCSS('border-right-width', '0px');
    const bounds = (await row.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    for (const button of await row.getByRole('button').all()) {
      const action = (await button.boundingBox())!;
      expect(action.width).toBeGreaterThanOrEqual(48);
      expect(action.height).toBeGreaterThanOrEqual(48);
    }
    // Check text and action bounds as well as the row: long labels must not overflow it.
    const overflow = await row.evaluate((el) => {
      const bounds = el.getBoundingClientRect();
      return [...el.querySelectorAll('*')].some((child) => {
        const rect = child.getBoundingClientRect();
        return (
          rect.left < bounds.left - 1 ||
          rect.right > bounds.right + 1 ||
          child.scrollWidth > child.clientWidth + 1
        );
      });
    });
    expect(overflow).toBe(false);
  }
  await list.scrollIntoViewIfNeeded();
  await expect(list).toBeInViewport({ ratio: 1 });
  await list.screenshot({ path: testInfo.outputPath(`${state}.png`) });
  await writeFile(
    testInfo.outputPath(`${state}.json`),
    JSON.stringify(dimensions, null, 2),
  );
}

for (const width of [360, 390]) {
  test(`fake-player list shows real state and usable actions at ${width}px`, async ({
    page,
  }, testInfo) => {
    if (
      !process.env.FIRESTORE_EMULATOR_HOST ||
      !process.env.FIREBASE_AUTH_EMULATOR_HOST
    )
      throw new Error('Run with npm run test:ui (emulators only).');
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await nameAdmin(page);
    await page
      .getByRole('button', { name: 'Create a game', exact: true })
      .click();
    await page.getByLabel('Players (4–20)', { exact: true }).fill('4');
    await page.getByLabel('Minion count', { exact: true }).fill('0');
    await page.getByLabel('Collective count', { exact: true }).fill('2');
    await page
      .getByRole('button', { name: 'Create lobby', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Your circle is forming.' }),
    ).toBeVisible();
    await expect(
      page.getByText('Developer test mode · emulators only'),
    ).toBeVisible();
    await expect(page.getByText('Fake player list')).toBeVisible();
    await expect(
      page.getByText('No fake players on this browser/device yet.'),
    ).toBeVisible();
    const code = await page
      .getByRole('heading', { name: /^\d{6}$/ })
      .innerText();

    for (const name of names) {
      await page.getByLabel('Fake player name', { exact: true }).fill(name);
      await page
        .getByRole('button', { name: 'Create fake', exact: true })
        .click();
      const row = page.getByLabel(`Fake player row for ${name}`, {
        exact: true,
      });
      await expect(row.getByText(name, { exact: true })).toBeVisible();
      await expect(
        row.getByText('Not joined · Public: —', { exact: true }),
      ).toBeVisible();
      await expect(
        row.getByText('Last: Created local fake identity.', { exact: true }),
      ).toBeVisible();
      await expect(
        row.getByRole('button', { name: `Refresh ${name}`, exact: true }),
      ).toBeDisabled();
      const join = row.getByRole('button', {
        name: `Join ${name}`,
        exact: true,
      });
      await expect(join).toHaveText('Join');
      await join.click();
      await expect(
        row.getByText('Joined · Public: alive', { exact: true }),
      ).toBeVisible();
      await expect(
        row.getByText(`Last: Joined lobby ${code}.`, { exact: true }),
      ).toBeVisible();
      await expect(join).toBeDisabled();
      await expect(row.getByText('Private: —', { exact: true })).toBeVisible();
    }
    await inspectList(page, testInfo, 'lobby-light');
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
    await inspectList(page, testInfo, 'lobby-dark');
    await expect(
      page.getByRole('heading', { name: 'Players · 4/4' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Begin the game', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Trust carefully.' }),
    ).toBeVisible();

    const first = page.getByLabel(`Fake player row for ${names[0]}`, {
      exact: true,
    });
    await first
      .getByRole('button', { name: `Refresh ${names[0]}`, exact: true })
      .click();
    await expect(first.getByText(privateRole)).toBeVisible();
    await expect(
      first.getByText('Last: Private role refreshed.', { exact: true }),
    ).toBeVisible();
    // The row action refreshes this owner only; other private values remain unloaded.
    for (const name of names.slice(1)) {
      const row = page.getByLabel(`Fake player row for ${name}`, {
        exact: true,
      });
      await expect(row.getByText('Private: —', { exact: true })).toBeVisible();
    }
    await page
      .getByRole('button', { name: 'Refresh fake roles', exact: true })
      .click();
    for (const name of names) {
      const row = page.getByLabel(`Fake player row for ${name}`, {
        exact: true,
      });
      await expect(row.getByText(privateRole)).toBeVisible();
      await expect(
        row.getByText('Joined · Public: alive', { exact: true }),
      ).toBeVisible();
      await expect(
        row.getByText('Last: Private role refreshed.', { exact: true }),
      ).toBeVisible();
      await expect(
        row.getByRole('button', { name: `Join ${name}`, exact: true }),
      ).toBeDisabled();
      await expect(
        row.getByRole('button', { name: `Refresh ${name}`, exact: true }),
      ).toBeEnabled();
    }
    await expect(page.getByLabel(/Fake player row for /)).toHaveCount(3);
    await inspectList(page, testInfo, 'active-dark');
    await page.getByRole('button', { name: 'Light mode', exact: true }).click();
    await inspectList(page, testInfo, 'active-light');

    // Check actual role values, not just labels: fake roles plus the admin match setup.
    const roleNames = {
      killer: 'Killer',
      good: 'Collective',
      neutral_exile: 'Exile',
    };
    const roles = (await page.getByText(privateRole).allTextContents()).map(
      (text) => roleNames[text.split(' ')[1]! as keyof typeof roleNames],
    );
    await page
      .getByRole('button', { name: 'Reveal my role', exact: true })
      .click();
    roles.push(
      await page
        .getByRole('heading', { name: /^(Killer|Collective|Exile)$/ })
        .innerText(),
    );
    expect(roles.sort()).toEqual([
      'Collective',
      'Collective',
      'Exile',
      'Killer',
    ]);

    await page
      .getByRole('button', { name: 'Reset local fake players', exact: true })
      .click();
    await expect(page.getByLabel(/Fake player row for /)).toHaveCount(0);
    await expect(
      page.getByText('No fake players on this browser/device yet.'),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
