import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto(`${BASE}/auth/login`);
await page.fill('input[type="email"]', 'buyer1@hemmykennel.ng');
await page.fill('input[type="password"]', 'Buyer@Lagos2025');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

// Find Coco's and Zeus's pet ids via the listings API
const ids = await page.evaluate(async () => {
  const r = await fetch('/api/listings').catch(() => null);
  return null; // placeholder, will look up via DB instead
});

console.log('--- Visiting a listing detail page (Zeus) to record a view ---');
await page.goto(`${BASE}/listings/6ab0977c-9dae-4849-bdcb-83a972d0c52f`); // Zeus
await page.waitForTimeout(2000);

console.log('--- Visiting a listing detail page (Coco) and saving it ---');
await page.goto(`${BASE}/listings/fd1e4ea2-acf9-4279-9860-905df1c99d32`); // Coco
await page.waitForTimeout(1500);
await page.locator('button:has(svg.lucide-heart)').first().click();
await page.waitForTimeout(1000);
console.log('Clicked save (heart) button on Coco');

console.log('--- Loading /recommendations ---');
await page.goto(`${BASE}/recommendations`);
await page.waitForTimeout(10000);

const becauseYouViewedHeader = await page.locator('h2:has-text("Because you viewed")').count();
console.log('Because-you-viewed section present:', becauseYouViewedHeader > 0);
if (becauseYouViewedHeader > 0) {
  console.log('Header text:', await page.locator('h2:has-text("Because you viewed")').textContent());
}

const similarHeader = await page.locator('h2:has-text("Similar to your saved")').count();
console.log('Similar-to-saved section present:', similarHeader > 0);

const popularHeader = await page.locator('h2:has-text("Popular in your area")').count();
console.log('Popular-in-area section present:', popularHeader > 0);

await page.screenshot({ path: 'verify-contextual.png', fullPage: true });
await browser.close();
