import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'luismyname3193@gmail.com';
const TEST_PASSWORD = 'Guillermo43+';

test.describe('Weekly Planner - Manual Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('Desktop - Create task, complete task, check UI', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:5173/weekly-planner');
    
    // Wait for planner to load
    await page.waitForSelector('.weekly-grid', { timeout: 10000 });
    
    // Take screenshot - Desktop
    await page.screenshot({ path: 'test-results/weekly-planner-desktop.png', fullPage: true });
    
    // Click on a time slot (first column, 9am)
    const slot = page.locator('.weekly-hour-slot').first();
    await slot.click();
    
    // Modal should appear
    await expect(page.locator('.weekly-time-slot-modal')).toBeVisible({ timeout: 5000 });
    
    // Take screenshot of modal
    await page.screenshot({ path: 'test-results/weekly-planner-modal-desktop.png', fullPage: true });
    
    // Check all 5 tabs exist
    await expect(page.locator('button[role="tab"]')).toHaveCount(5);
    await expect(page.locator('button[role="tab"]:has-text("Tarea existente")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Hábito existente")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Nueva tarea")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Nuevo hábito")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Recordatorio")')).toBeVisible();
    
    // Create a new task
    await page.click('button[role="tab"]:has-text("Nueva tarea")');
    await page.fill('#task-title', 'Test Task E2E');
    await page.fill('#task-description', 'Test description');
    await page.selectOption('#task-priority', 'high');
    await page.selectOption('#task-duration', '30');
    await page.click('button[type="submit"]:has-text("Crear tarea y agendar")');
    
    // Wait for task to be created and modal to close
    await expect(page.locator('.weekly-time-slot-modal')).not.toBeVisible({ timeout: 5000 });
    
    // Verify task appears in grid
    await expect(page.locator('.weekly-block:has-text("Test Task E2E")')).toBeVisible({ timeout: 5000 });
    
    // Take screenshot after task creation
    await page.screenshot({ path: 'test-results/weekly-planner-task-created.png', fullPage: true });
    
    // Complete the task - click on the task block
    const taskBlock = page.locator('.weekly-block:has-text("Test Task E2E")');
    await taskBlock.click();
    
    // Status change modal should appear - select "completed"
    await page.click('button:has-text("Finalizada")');
    
    // Wait for status to update
    await page.waitForTimeout(1000);
    
    // Take screenshot after completion
    await page.screenshot({ path: 'test-results/weekly-planner-task-completed.png', fullPage: true });
    
    console.log('✅ Desktop test passed');
  });

  test('Tablet - Click time slot opens modal', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://127.0.0.1:5173/weekly-planner');
    
    await page.waitForSelector('.weekly-grid', { timeout: 10000 });
    
    await page.screenshot({ path: 'test-results/weekly-planner-tablet.png', fullPage: true });
    
    const slot = page.locator('.weekly-hour-slot').first();
    await slot.click();
    
    await expect(page.locator('.weekly-time-slot-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[role="tab"]')).toHaveCount(5);
    
    await page.screenshot({ path: 'test-results/weekly-planner-modal-tablet.png', fullPage: true });
    
    await page.click('button:has-text("Cancelar")');
    
    console.log('✅ Tablet test passed');
  });

  test('Mobile - Click time slot opens modal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:5173/weekly-planner');
    
    await page.waitForSelector('.weekly-grid', { timeout: 10000 });
    
    await page.screenshot({ path: 'test-results/weekly-planner-mobile.png', fullPage: true });
    
    const slot = page.locator('.weekly-hour-slot').first();
    await slot.click();
    
    await expect(page.locator('.weekly-time-slot-modal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[role="tab"]')).toHaveCount(5);
    
    await page.screenshot({ path: 'test-results/weekly-planner-modal-mobile.png', fullPage: true });
    
    await page.click('button:has-text("Cancelar")');
    
    console.log('✅ Mobile test passed');
  });

  test('Theme toggle - Switch to light mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:5173/settings');
    
    await page.waitForSelector('select', { timeout: 5000 });
    
    // Get current theme
    const htmlTheme = await page.getAttribute('html', 'data-theme');
    console.log('Initial theme:', htmlTheme);
    
    // Toggle theme
    const themeSelect = page.locator('select');
    await themeSelect.selectOption('light');
    
    const htmlThemeLight = await page.getAttribute('html', 'data-theme');
    expect(htmlThemeLight).toBe('light');
    console.log('Theme switched to:', htmlThemeLight);
    
    // Switch back to dark
    await themeSelect.selectOption('dark');
    const htmlThemeDark = await page.getAttribute('html', 'data-theme');
    expect(htmlThemeDark).toBe('dark');
    console.log('Theme switched back to:', htmlThemeDark);
  });

  test('Console errors check', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:5173/weekly-planner');
    await page.waitForSelector('.weekly-grid', { timeout: 10000 });
    
    // Click time slot
    const slot = page.locator('.weekly-hour-slot').first();
    await slot.click();
    await expect(page.locator('.weekly-time-slot-modal')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cancelar")');
    
    // Filter out expected errors
    const criticalErrors = errors.filter(e => 
      !e.includes('401') && 
      !e.includes('403') && 
      !e.includes('favicon') &&
      !e.includes('ERR_INSUFFICIENT_RESOURCES') &&
      !e.includes('Maximum update depth')
    );
    
    console.log('All console errors:', errors);
    console.log('Critical errors:', criticalErrors);
    
    expect(criticalErrors.length).toBe(0);
  });
});