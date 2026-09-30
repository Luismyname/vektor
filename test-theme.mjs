import { chromium } from 'playwright';

async function testTheme() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('RESPONSE ERROR:', response.status(), response.url());
    }
  });
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('=== INITIAL STATE ===');
  console.log('URL:', page.url());
  console.log('data-theme:', await page.getAttribute('html', 'data-theme'));
  console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  
  // Navigate to login
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('\n=== LOGIN PAGE ===');
  console.log('URL:', page.url());
  console.log('data-theme:', await page.getAttribute('html', 'data-theme'));
  console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  
  // Login
  await page.fill('input[type="email"]', 'luismyname3193@gmail.com');
  await page.fill('input[type="password"]', 'Guillermo43+');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('\n=== AFTER LOGIN ===');
  console.log('URL:', page.url());
  console.log('data-theme:', await page.getAttribute('html', 'data-theme'));
  console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  
  // Go to settings
  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('\n=== SETTINGS PAGE ===');
  console.log('URL:', page.url());
  console.log('data-theme:', await page.getAttribute('html', 'data-theme'));
  console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  
  // Change theme to light
  const themeSelect = await page.$('select');
  if (themeSelect) {
    await themeSelect.selectOption('light');
    await page.waitForTimeout(1000);
    console.log('\n=== AFTER THEME CHANGE ===');
    console.log('data-theme:', await page.getAttribute('html', 'data-theme'));
    console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  }
  
  // Navigate to dashboard
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('\n=== DASHBOARD ===');
  console.log('URL:', page.url());
  console.log('data-theme:', await page.getAttribute('html', 'data-theme'));
  console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  
  // Check body background
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log('Body background color:', bodyBg);
  
  // Navigate to other pages
  for (const p of ['/profile', '/habits', '/tasks', '/weekly-planner', '/activity']) {
    console.log(`\n=== ${p.toUpperCase()} ===`);
    await page.goto(`http://localhost:5173${p}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log('URL:', page.url());
    console.log('data-theme:', await page.getAttribute('html', 'data-theme'));
    console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  }
  
  console.log('\n=== FINAL STATE ===');
  console.log('localStorage:', await page.evaluate(() => localStorage.getItem('vektor-theme')));
  console.log('Final data-theme:', await page.getAttribute('html', 'data-theme'));
  
  await page.waitForTimeout(30000);
  
  await browser.close();
}

const browser = await chromium.launch({ headless: false, slowMo: 500 });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
page.on('response', response => {
  if (response.status() >= 400) {
    console.log('RESPONSE ERROR:', response.status(), response.url());
  }
});

await testTheme();