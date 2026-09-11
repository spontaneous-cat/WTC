import { test, expect, type Page } from '@playwright/test';

async function namePlayer(page: Page, name: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Change name', exact: true }).click();
  await page.getByLabel('Display name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Change name', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create a game', exact: true }),
  ).toBeVisible();
}

test('four players create/join/start, privately mark suspicions, and reconnect', async ({
  browser,
}, testInfo) => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw new Error('Run with npm run test:ui (emulators only).');
  const contexts = await Promise.all(
    Array.from({ length: 4 }, () =>
      browser.newContext({ viewport: { width: 390, height: 844 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const errors: string[] = [];
  pages.forEach((page) =>
    page.on('pageerror', (error) => errors.push(error.message)),
  );
  try {
    const admin = pages[0]!;
    await namePlayer(admin, 'Aster');
    await admin.screenshot({
      path: testInfo.outputPath('welcome-light.png'),
      fullPage: true,
    });
    await admin
      .getByRole('button', { name: 'Create a game', exact: true })
      .click();
    await admin.getByLabel('Players (4–20)', { exact: true }).fill('4');
    await admin.getByLabel('Minion count', { exact: true }).fill('0');
    await admin.getByLabel('Collective count', { exact: true }).fill('2');
    await admin
      .getByRole('button', { name: 'Create lobby', exact: true })
      .click();
    await expect(
      admin.getByRole('heading', { name: 'Your circle is forming.' }),
    ).toBeVisible();
    const code = await admin
      .getByRole('heading', { name: /^\d{6}$/ })
      .innerText();
    await expect(
      admin.getByRole('button', { name: 'Begin the game', exact: true }),
    ).toBeDisabled();
    for (let i = 1; i < pages.length; i++) {
      const p = pages[i]!;
      await namePlayer(p, `Player ${i}`);
      await p.getByLabel('Game code', { exact: true }).fill(code);
      await p.getByRole('button', { name: 'Join game', exact: true }).click();
      await expect(
        p.getByRole('heading', { name: 'Your circle is forming.' }),
      ).toBeVisible();
      await expect(
        p.getByRole('button', { name: 'Edit game setup', exact: true }),
      ).toHaveCount(0);
      await expect(
        p.getByText('Developer test mode · emulators only'),
      ).toHaveCount(0);
      await expect(p.getByLabel(/Fake player row for /)).toHaveCount(0);
    }
    await expect(
      admin.getByRole('heading', { name: 'Players · 4/4' }),
    ).toBeVisible();
    await admin
      .getByRole('button', { name: 'Begin the game', exact: true })
      .click();
    const roleNames: string[] = [];
    for (const p of pages) {
      await expect(
        p.getByRole('heading', { name: 'Trust carefully.' }),
      ).toBeVisible();
      if (p !== admin) {
        await expect(
          p.getByText('Developer test mode · emulators only'),
        ).toHaveCount(0);
        await expect(p.getByLabel(/Fake player row for /)).toHaveCount(0);
      }
      await expect(
        p.getByRole('heading', { name: /^(Killer|Minion|Collective|Exile)$/ }),
      ).toHaveCount(0);
      await p
        .getByRole('button', { name: 'Reveal my role', exact: true })
        .click();
      roleNames.push(
        await p
          .getByRole('heading', { name: /^(Killer|Minion|Collective|Exile)$/ })
          .innerText(),
      );
    }
    expect(roleNames.sort()).toEqual([
      'Collective',
      'Collective',
      'Exile',
      'Killer',
    ]);
    await admin.getByRole('button', { name: 'Players', exact: true }).click();
    await admin
      .getByRole('button', { name: 'Set suspicion for Player 1', exact: true })
      .click();
    await admin.getByRole('button', { name: 'Killer', exact: true }).click();
    await expect(
      admin.getByText('Your guess: Killer', { exact: true }),
    ).toBeVisible();
    await pages[1]!
      .getByRole('button', { name: 'Players', exact: true })
      .click();
    await expect(
      pages[1]!.getByText('Your guess: Killer', { exact: true }),
    ).toHaveCount(0);
    await admin.getByRole('button', { name: 'History', exact: true }).click();
    await expect(
      admin.getByText('The game has begun. Your role is ready.', {
        exact: true,
      }),
    ).toBeVisible();
    await admin.getByRole('button', { name: 'Dark mode', exact: true }).click();
    await admin.reload();
    await expect(admin.getByText('Aster', { exact: true })).toBeVisible();
    await expect(
      admin.getByRole('heading', { name: 'Trust carefully.' }),
    ).toBeVisible();
    await expect(
      admin.getByRole('button', { name: 'Light mode', exact: true }),
    ).toBeVisible();
    await expect(
      admin.getByRole('button', { name: 'Reveal my role', exact: true }),
    ).toBeVisible();
    await admin.screenshot({
      path: testInfo.outputPath('dashboard-dark.png'),
      fullPage: true,
    });
    await admin.getByRole('button', { name: 'Players', exact: true }).click();
    await expect(
      admin.getByText('Your guess: Killer', { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
