import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT  = 'C:/Users/PC/petmatchai/thesis_images';
fs.mkdirSync(OUT, { recursive: true });

// ── Session obtained via Supabase REST API ───────────────────────
const SUPABASE_URL  = 'https://gucrvtyskudsfokmcavc.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Y3J2dHlza3Vkc2Zva21jYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjUxNDIsImV4cCI6MjA5NzAwMTE0Mn0.kbGtR-fm69Pru3lwlFWthxiumVd6AhxGAsRtuQvrzR0';
const EMAIL = 'famhemmy3@gmail.com';
const PASS  = 'Admin@123';

async function getSession() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  return res.json();
}

async function injectSession(page, session) {
  // Supabase v2 localStorage key format
  const key = `sb-gucrvtyskudsfokmcavc-auth-token`;
  const value = JSON.stringify({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
    expires_at:    session.expires_at,
    expires_in:    session.expires_in,
    token_type:    'bearer',
    user:          session.user,
  });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}

async function shot(page, filename, { delay = 2000, fullPage = true } = {}) {
  await page.waitForTimeout(delay);
  await page.screenshot({ path: `${OUT}/${filename}`, fullPage, animations: 'disabled' });
  console.log('✓', filename);
}

async function goAuth(page, session, url) {
  // Navigate to BASE first to set localStorage on correct origin
  if (!page.url().startsWith(BASE)) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  }
  await injectSession(page, session);
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
}

async function clickTab(page, text) {
  try {
    // Try multiple selectors
    const selectors = [
      `button:has-text("${text}")`,
      `[role="tab"]:has-text("${text}")`,
      `a:has-text("${text}")`,
    ];
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (count > 0) {
        await el.click();
        await page.waitForTimeout(1200);
        return true;
      }
    }
    console.warn('  Tab not found:', text);
    return false;
  } catch { return false; }
}

(async () => {
  console.log('Fetching session...');
  const session = await getSession();
  if (!session.access_token) {
    console.error('Auth failed:', session);
    process.exit(1);
  }
  console.log('Session OK — user:', session.user?.email, '| role:', session.user?.user_metadata?.role);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // ══════════════════════════════════════════════════════
  // SECTION A: UNAUTHENTICATED / PUBLIC PAGES
  // ══════════════════════════════════════════════════════
  console.log('\n── Public pages ──');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_01_login.png');

    // Fill in form for a nicer screenshot
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await shot(page, 'screen_01b_login_filled.png', { delay: 600 });

    await page.goto(`${BASE}/auth/register`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_02_register_step1.png');
    // Step 2 — click seller
    try {
      await page.locator('label:has-text("Seller"), button:has-text("Seller")').first().click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Continue"), button:has-text("Next")').first().click();
      await page.waitForTimeout(800);
      await shot(page, 'screen_02b_register_step2.png', { delay: 600 });
    } catch {}

    await page.goto(`${BASE}/auth/forgot-password`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_03_forgot_password.png');

    await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_04_listings_public.png', { delay: 2500 });

    await page.close();
  }

  // ══════════════════════════════════════════════════════
  // SECTION B: BLOCKED ROUTES (unauthenticated access)
  // ══════════════════════════════════════════════════════
  console.log('\n── Blocked routes (no login) ──');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    const blocked = [
      ['/admin',            'blocked_01_admin.png'],
      ['/dashboard/admin',  'blocked_02_dashboard_admin.png'],
      ['/dashboard/buyer',  'blocked_03_dashboard_buyer.png'],
      ['/dashboard/seller', 'blocked_04_dashboard_seller.png'],
      ['/messages',         'blocked_05_messages.png'],
      ['/offers',           'blocked_06_offers.png'],
      ['/recommendations',  'blocked_07_recommendations.png'],
      ['/matchmaking',      'blocked_08_matchmaking.png'],
      ['/analytics',        'blocked_09_analytics.png'],
      ['/profile',          'blocked_10_profile.png'],
      ['/profile/verify',   'blocked_11_profile_verify.png'],
    ];

    for (const [route, fname] of blocked) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await shot(page, fname, { delay: 1200 });
      console.log(`  ${route} → ${page.url()}`);
    }
    await page.close();
  }

  // ══════════════════════════════════════════════════════
  // SECTION C: ADMIN AUTHENTICATED PAGES
  // ══════════════════════════════════════════════════════
  console.log('\n── Admin authenticated pages ──');
  {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    // Seed session
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await injectSession(page, session);

    // Admin Dashboard
    await page.goto(`${BASE}/dashboard/admin`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_05_admin_dashboard.png', { delay: 2500 });

    // Buyer Dashboard
    await page.goto(`${BASE}/dashboard/buyer`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_06_buyer_dashboard.png', { delay: 2500 });

    // Seller Dashboard
    await page.goto(`${BASE}/dashboard/seller`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_07_seller_dashboard.png', { delay: 2500 });

    // Listings
    await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_08_listings.png', { delay: 2500 });

    // Listings map view
    try {
      const mapBtn = page.locator('button:has-text("Map")').first();
      if (await mapBtn.count() > 0) {
        await mapBtn.click();
        await shot(page, 'screen_08b_listings_map.png', { delay: 2500 });
      }
    } catch {}

    // Listing Detail — first active listing
    await page.goto(`${BASE}/listings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    try {
      const href = await page.locator('a[href^="/listings/"]').first().getAttribute('href');
      await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
      await shot(page, 'screen_09_listing_detail.png', { delay: 2000 });
      // Scroll to reviews section
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await shot(page, 'screen_09b_listing_reviews.png', { delay: 1000 });
    } catch (e) { console.warn('Listing detail:', e.message); }

    // New Listing
    await page.goto(`${BASE}/listings/new`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_10_new_listing.png', { delay: 1500 });
    // Scroll down to show more fields
    await page.evaluate(() => window.scrollTo(0, 600));
    await shot(page, 'screen_10b_new_listing_bottom.png', { delay: 800 });

    // AI Recommendations
    await page.goto(`${BASE}/recommendations`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_11_recommendations.png', { delay: 3500 });
    await clickTab(page, 'History');
    await shot(page, 'screen_11b_recommendations_history.png', { delay: 1500 });

    // Matchmaking
    await page.goto(`${BASE}/matchmaking`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_12_matchmaking.png', { delay: 2500 });
    await clickTab(page, 'History');
    await shot(page, 'screen_12b_matchmaking_history.png', { delay: 1500 });

    // Messages
    await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_13_messages.png', { delay: 2000 });

    // Offers
    await page.goto(`${BASE}/offers`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_14_offers.png', { delay: 2000 });

    // Analytics
    await page.goto(`${BASE}/analytics`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_15_analytics.png', { delay: 4000 });
    // Scroll to charts
    await page.evaluate(() => window.scrollTo(0, 500));
    await shot(page, 'screen_15b_analytics_charts.png', { delay: 1000 });

    // Saved
    await page.goto(`${BASE}/saved`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_16_saved.png', { delay: 2000 });

    // Notifications
    await page.goto(`${BASE}/notifications`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_17_notifications.png', { delay: 2000 });

    // Want Ads
    await page.goto(`${BASE}/want-ads`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_18_want_ads.png', { delay: 2000 });

    // Compare
    await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_19_compare.png', { delay: 1500 });

    // Profile — all tabs
    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_20_profile.png', { delay: 2000 });
    for (const [tab, fname] of [
      ['Preferences',   'screen_20b_profile_prefs.png'],
      ['Notifications', 'screen_20c_profile_notifs.png'],
      ['Reviews',       'screen_20d_profile_reviews.png'],
    ]) {
      await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
      await clickTab(page, tab);
      await shot(page, fname, { delay: 1200 });
    }

    // Identity Verification
    await page.goto(`${BASE}/profile/verify`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_21_verify_identity.png', { delay: 1500 });

    // ── ADMIN PANEL — every tab ──────────────────────────
    console.log('\n── Admin panel tabs ──');
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await shot(page, 'screen_22_admin_overview.png', { delay: 2500 });

    // Re-load and click each tab fresh
    const adminTabs = [
      ['Users',         'screen_22a_admin_users.png'],
      ['Listings',      'screen_22b_admin_listings.png'],
      ['Verifications', 'screen_22c_admin_verifications.png'],
      ['Reviews',       'screen_22d_admin_reviews.png'],
      ['Audit Log',     'screen_22e_admin_audit.png'],
      ['Disputes',      'screen_22f_admin_disputes.png'],
      ['Categories',    'screen_22g_admin_categories.png'],
      ['AI Cache',      'screen_22h_admin_ai.png'],
    ];
    for (const [tab, fname] of adminTabs) {
      await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      // Find tab button by text
      const tabEl = page.locator(`button`).filter({ hasText: tab }).first();
      try {
        await tabEl.waitFor({ timeout: 5000 });
        await tabEl.click();
        await page.waitForTimeout(2000);
      } catch { console.warn('  Tab not found:', tab); }
      await shot(page, fname, { delay: 1500 });
    }

    await page.close();
  }

  await browser.close();

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\nAll done! ${files.length} screenshots in thesis_images/`);
  files.filter(f=>f.startsWith('screen_')).sort().forEach(f => console.log(' ', f));
})();
