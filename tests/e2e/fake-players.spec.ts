import { test, expect } from '@playwright/test';

async function nameAdmin(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Change name', exact: true }).click();
  await page.getByLabel('Display name', { exact: true }).fill('Dev Admin');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByText('Dev Admin', { exact: true })).toBeVisible();
}

test('developer can fill a local lobby with fake players and inspect their roles', async ({
  page,
}) => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw new Error('Run with npm run test:ui (emulators only).');

  await nameAdmin(page);
  await page
    .getByRole('button', { name: 'Create a game', exact: true })
    .click();
  await page.getByLabel('Players (4–20)', { exact: true }).fill('4');
  await page.getByLabel('Minion count', { exact: true }).fill('0');
  await page.getByLabel('Collective count', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Create lobby', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your circle is forming.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Developer test mode · emulators only'),
  ).toBeVisible();
  await expect(page.getByText('Fake player list')).toBeVisible();

  for (const name of ['Fake One', 'Fake Two', 'Fake Three']) {
    await page.getByLabel('Fake player name', { exact: true }).fill(name);
    await page
      .getByRole('button', { name: 'Create fake', exact: true })
      .click();
    const row = page.getByLabel(`Fake player row for ${name}`);
    await expect(row).toBeVisible();
    await expect(row.getByText('Not joined', { exact: true })).toBeVisible();
    await row
      .getByRole('button', { name: `Join ${name}`, exact: true })
      .click();
    await expect(row.getByText('Joined', { exact: true })).toBeVisible();
  }

  await expect(
    page.getByRole('heading', { name: 'Players · 4/4' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Begin the game', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Trust carefully.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Refresh fake roles', exact: true })
    .click();
  await expect(page.getByText('Private:', { exact: false })).toHaveCount(3);
  await expect(page.getByLabel(/Fake player row for Fake/)).toHaveCount(3);
});
