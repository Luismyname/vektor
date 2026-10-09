import { test, expect } from '@playwright/test';
import readline from 'node:readline/promises';
import process from 'node:process';

async function resolveCredentials() {
  const email = process.env.VECTOR_EMAIL || process.env.E2E_EMAIL;
  const password = process.env.VECTOR_PASSWORD || process.env.E2E_PASSWORD;

  if (email && password) {
    return { email, password };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\nSe requieren credenciales para validar el login del planner semanal.');
  const resolvedEmail = await rl.question('Email: ');
  const resolvedPassword = await rl.question('Contraseña: ');
  rl.close();

  return {
    email: resolvedEmail.trim(),
    password: resolvedPassword.trim(),
  };
}

async function openWeeklyPlannerModal(page) {
  await page.goto('/');
  await page.goto('/login');

  const { email, password } = await resolveCredentials();

  await page.getByLabel(/correo electrónico/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole('button', { name: /continuar/i }).click();

  await page.waitForLoadState('networkidle');
  await page.goto('/weekly-planner');
  await page.waitForLoadState('networkidle');

  await page.locator('.weekly-hour-slot').first().click();
  await expect(page.locator('.weekly-time-slot-modal')).toBeVisible();
}

test('Weekly Planner modal responsive styles and task filtering', async ({ page }, testInfo) => {
  await openWeeklyPlannerModal(page);

  const sizes = [1920, 1366, 1024, 768, 480];

  for (const width of sizes) {
    await page.setViewportSize({ width, height: 920 });
    await page.locator('.weekly-time-slot-modal').waitFor({ state: 'visible' });
    await page.screenshot({ path: testInfo.outputPath(`weekly-planner-modal-${width}.png`), fullPage: true });

    const tabs = page.locator('.modal-tab');
    await expect(tabs).toHaveCount(5);

    // Find the active tab (first tab is active by default)
    const activeTab = page.locator('.modal-tab.active');
    await expect(activeTab).toBeVisible();

    const firstTabStyle = await activeTab.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        background: styles.backgroundColor,
        color: styles.color,
        display: styles.display,
      };
    });

    // Active tab should have the active color #7a61ff (rgb 122, 97, 255)
    expect(firstTabStyle.background).toContain('122, 97, 255');
    expect(firstTabStyle.color).toContain('255, 255, 255');

    // Test tab switching
    const tabNames = ['Tarea existente', 'Hábito existente', 'Nueva tarea', 'Nuevo hábito', 'Recordatorio'];
    for (const name of tabNames) {
      const tab = page.getByRole('tab', { name });
      if (await tab.count()) {
        await tab.click();
        await expect(page.locator('.modal-tab.active')).toBeVisible();
      }
    }

    if (width <= 480) {
      const modalBox = await page.locator('.weekly-time-slot-modal').boundingBox();
      expect(modalBox).not.toBeNull();
      expect(modalBox.width).toBeLessThanOrEqual(Math.floor(page.viewportSize().width * 0.95));
    }
  }
});
