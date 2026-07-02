# PetMatchAI — Manual Testing Checklist

> Mark each item: ✅ Pass · ❌ Fail · ⚠️ Partial
> Test URL: http://localhost:3000
> Complete sections in order — later tests depend on data created earlier.

---

## PART A — ACCOUNT SETUP (do this first)

### A1. Register Admin Account
- [ ] Go to `/auth/register`
- [ ] Select **Administrator** role → Continue
- [ ] Fill name, email, password (strength meter shows) → Create Account
- [ ] Check email inbox → click verification link
- [ ] Redirected to login → sign in → lands on `/dashboard/admin`

### A2. Register Seller Account
- [ ] Go to `/auth/register`
- [ ] Select **Seller** role → Continue
- [ ] Fill name, email, phone, location, business name, license number
- [ ] Create Account → verify email → login
- [ ] Lands on `/dashboard/seller`

### A3. Register Buyer Account
- [ ] Go to `/auth/register`
- [ ] Select **Buyer** role → Continue
- [ ] Fill all fields → Create Account
- [ ] Step 3 appears: select preferred species, set budget, pick purpose → Save & Continue
- [ ] Verify email → login → lands on `/dashboard/buyer`

### A4. Google OAuth (login + register)
- [ ] On `/auth/login` → click **Continue with Google** → Google consent screen opens
- [ ] Complete consent → redirected back → lands on `/dashboard`
- [ ] On `/auth/register` → click **Continue with Google** → same flow works

---

## PART B — AUTHENTICATION & SECURITY

### B1. Login / Logout
- [ ] Login with email + password → success
- [ ] Logout → redirected to `/`
- [ ] Try wrong password 5 times → account locked message with unlock time shown
- [ ] Wait or reset password → can log in again

### B2. Password Recovery
- [ ] Go to `/auth/forgot-password` → enter email → submit
- [ ] Email received with reset link → click link → `/auth/reset-password`
- [ ] Set new password → login with new password → success

### B3. Session Idle Timeout
- [ ] Log in, then leave the page idle for ~28 minutes (or manually test by watching for the modal)
- [ ] Warning modal appears with 2-minute countdown bar
- [ ] Click **Stay Logged In** → modal closes, timer resets
- [ ] Let countdown expire → auto signed out → redirected to `/auth/login?reason=idle`
- [ ] Yellow "signed out due to inactivity" banner shows on login page

### B4. Profile Management
- [ ] Go to `/profile`
- [ ] Change name, phone, location → Save Changes → success message
- [ ] Upload avatar photo (camera icon) → photo updates
- [ ] Change password in **Security** tab → new password works on next login

---

## PART C — SELLER FLOWS

> Login as **Seller** for this section.

### C1. Create Pet Listing
- [ ] Go to `/listings/new`
- [ ] Fill: name, species, breed, age, gender, color, size, price, location, description
- [ ] Select health statuses (vaccinated, dewormed, microchipped)
- [ ] Add personality trait chips (Friendly, Playful, etc.)
- [ ] Upload at least 1 photo
- [ ] Submit → listing appears on `/listings`

### C2. Edit Listing
- [ ] Go to `/dashboard/seller` → click a listing → Edit
- [ ] Change price → Save → price updates on listing page

### C3. Listing Status
- [ ] Edit a listing → change status to **Sold** → save
- [ ] Listing disappears from public `/listings` (only active show)

### C4. Draft Saving
- [ ] Start a new listing at `/listings/new`, fill some fields
- [ ] Navigate away without submitting
- [ ] Return to `/listings/new` → fields are still filled (localStorage draft)

### C5. Seller Dashboard
- [ ] `/dashboard/seller` shows: active listings count, total views, inquiry count
- [ ] "Matching Buyer Requests" section shows want-ads from buyers

### C6. Seller Analytics
- [ ] Go to `/analytics`
- [ ] KPI cards show (views, inquiries, conversion rate, avg days to sell)
- [ ] Market price chart renders
- [ ] Breed popularity chart renders
- [ ] Export to Excel → `.xlsx` file downloads with 3 sheets

### C7. Custom Report Builder
- [ ] On `/analytics` → open **Custom Report Builder**
- [ ] Set date range, species filter, status filter, sort → Generate Report
- [ ] Summary cards + table appear
- [ ] Export CSV → file downloads

### C8. Weekly Report Email
- [ ] (Cannot trigger manually in dev — verify the cron route exists)
- [ ] Visit `/api/cron/weekly-report` in browser with header `Authorization: Bearer petmatchai_cron_secret_2026` — or skip and trust the build

---

## PART D — BUYER FLOWS

> Login as **Buyer** for this section.

### D1. Browse Listings
- [ ] Go to `/listings`
- [ ] Listings grid loads with pet cards
- [ ] Search by breed name → results filter
- [ ] Autocomplete dropdown appears after 2 characters
- [ ] Clear search (×) → all results return

### D2. Filters & Sort
- [ ] Click **Filters** → select Species (Dog/Cat), Gender → results update
- [ ] Active filter chips appear → click × on chip → filter removed
- [ ] Sort by Price Low→High, Price High→Low, Youngest First → order changes
- [ ] Price range slider → drag → results update

### D3. Map View
- [ ] Click **Map** button on `/listings` → button turns indigo
- [ ] Map loads (may take a few seconds while geocoding)
- [ ] Pins appear on Nigeria map for listings with locations
- [ ] Click a pin → popup shows pet name, breed, price, "View Listing →" link
- [ ] Click **Map** again → returns to grid view

### D4. Pet Detail Page
- [ ] Click any pet card → `/listings/[id]`
- [ ] Photos display (gallery if multiple)
- [ ] Pet details, traits, health info shown
- [ ] Seller info + verified badge (if applicable)
- [ ] "Similar pets" grid at bottom renders
- [ ] Share button works (Web Share or copies link)

### D5. Save / Favourite Listing
- [ ] On a pet card or detail page → click heart/bookmark icon → saved
- [ ] Go to `/saved` → saved pet appears
- [ ] Unsave → pet removed from `/saved`

### D6. Compare Pets
- [ ] On `/listings`, click scale icon on 2–3 different pet cards → tray appears at bottom
- [ ] Click **Compare** in tray → `/compare` page opens
- [ ] Side-by-side table shows all pets with attributes
- [ ] Remove one pet from compare → table updates

### D7. Send Inquiry / Start Conversation
- [ ] On a listing detail page → click **Message Seller** or inquiry button
- [ ] Message thread opens in `/messages`
- [ ] Type a message → send → message appears

### D8. Make an Offer
- [ ] On a listing detail page → click **Make Offer**
- [ ] Enter amount + optional note → Submit
- [ ] Go to `/offers` → offer shows as "Pending"

### D9. Buyer Dashboard
- [ ] `/dashboard/buyer` shows: saved listings count, recent matches, recent searches
- [ ] Recent searches appear as clickable chips → click one → goes to filtered `/listings`
- [ ] "Follow up on your matches" section appears for accepted matches with no recent activity

### D10. Want Ads
- [ ] Go to `/want-ads` → click **Post a Want Ad**
- [ ] Fill species, breed, budget, description → Submit
- [ ] Want ad appears in the list
- [ ] Edit / delete want ad works

### D11. AI Recommendations
- [ ] Go to `/recommendations`
- [ ] Recommendation cards load with match % score and "Why this pet" text
- [ ] "Because you viewed…" section appears (after visiting a listing)
- [ ] "Similar to your saved pets" section appears (after saving a pet)
- [ ] "Popular in your area" section appears
- [ ] Click **Interested** on a card → button state changes
- [ ] Click **Not Interested** → card removed from view
- [ ] Share icon on recommendation card → Web Share opens

### D12. Recommendation History
- [ ] On `/recommendations` → click **History** tab
- [ ] All previously scored pets listed with match score, status badge, date

### D13. Matchmaking
- [ ] Go to `/matchmaking`
- [ ] AI match cards load with scores and reasons
- [ ] Click **Accept** on a match → opens message thread with seller auto-starter message
- [ ] Click **Decline** on a match → match disappears
- [ ] Click **Export Matches** → Excel file downloads

### D14. Match History (Matchmaking)
- [ ] On `/matchmaking` → click **History** tab (if present) or check `/recommendations` History tab
- [ ] Accepted/declined matches shown with status badges

---

## PART E — MESSAGING & COMMUNICATION

> Test with Buyer logged in (then switch to Seller to reply).

### E1. Messaging Interface
- [ ] Go to `/messages`
- [ ] Thread list shows conversations
- [ ] Search box filters threads by name, pet, or last message
- [ ] Click a thread → messages load on right panel

### E2. Send & Receive Messages
- [ ] Type a message → press Enter → message sent (bubble appears right side)
- [ ] Open a second browser/incognito as Seller → go to `/messages` → reply appears in real time (no page refresh)
- [ ] Shift+Enter creates a new line without sending

### E3. Quick Reply Templates
- [ ] Click the message icon button (left of input) → template list appears
- [ ] Click a template → fills input box → can send

### E4. Typing Indicator
- [ ] While Seller is typing in the thread, Buyer sees animated 3-dot bubble

### E5. Read Receipts
- [ ] After Seller reads a message sent by Buyer, "Seen" appears under the message

### E6. Archive Conversation
- [ ] Hover over a thread → Archive icon appears → click it
- [ ] Thread disappears from main list
- [ ] Click **Show archived** → archived thread reappears

### E7. Video Call
- [ ] In an open chat → click the **Video** icon in the chat header
- [ ] Video call modal opens with Jitsi embed
- [ ] "Open in new tab" link works
- [ ] "End Call" closes the modal

### E8. Report User
- [ ] In chat header → click **Flag** icon
- [ ] Report dropdown opens → select reason → Submit Report
- [ ] "Report submitted" confirmation message appears

---

## PART F — OFFERS & NEGOTIATION

> Switch between Buyer and Seller accounts to test both sides.

### F1. Buyer Makes Offer
- [ ] Buyer: `/offers` or listing page → make an offer → shows as Pending

### F2. Seller Responds to Offer
- [ ] Seller: go to `/offers` → see incoming offer
- [ ] Click **Accept** → offer status changes to Accepted
- [ ] Buyer receives notification + (if push enabled) push notification

### F3. Counter Offer
- [ ] Seller: click **Counter** on an offer → enter counter amount → Submit
- [ ] Buyer: offer shows counter amount with option to respond

### F4. Reject Offer
- [ ] Seller: click **Reject** → offer status changes to Rejected
- [ ] Buyer sees updated status on `/offers`

---

## PART G — REVIEWS & RATINGS

### G1. Leave a Review
- [ ] Go to a listing detail page → scroll to Reviews tab → click **Write a Review**
- [ ] Set overall star rating (1–5)
- [ ] Set sub-ratings: Communication, Accuracy, Pet Health
- [ ] Write review text
- [ ] Attach up to 3 photos → thumbnails preview
- [ ] Submit → review appears on listing

### G2. Review Display
- [ ] Rating distribution bar chart shows (per-star counts + animated bars)
- [ ] Average score displayed
- [ ] "Verified Transaction" badge on eligible reviews
- [ ] Review photos show as thumbnails under review text

### G3. Helpful Voting
- [ ] Click **Helpful** on any review → count increments
- [ ] Click again → vote toggled off

### G4. Seller Responds to Review
- [ ] Login as Seller → find the review on your listing → click **Reply**
- [ ] Type response → submit → reply appears under the review

### G5. My Reviews
- [ ] Go to `/profile` → **My Reviews** tab
- [ ] All reviews the logged-in user has written are listed

---

## PART H — NOTIFICATIONS

### H1. In-App Notifications
- [ ] Perform an action that triggers a notification (e.g., Buyer sends message to Seller)
- [ ] Login as Seller → bell icon in navbar shows unread count badge
- [ ] Click bell → `/notifications` page shows the notification
- [ ] Click notification → mark as read → unread count decreases

### H2. Real-Time Toast
- [ ] While Seller is logged in, Buyer sends a message
- [ ] Toast pop-up appears in Seller's browser (bottom of screen) without page refresh

### H3. Email Notifications
- [ ] Send a message → recipient's email inbox receives notification (Brevo)
- [ ] Make an offer → seller receives email
- [ ] Offer accepted → buyer receives email

### H4. Push Notifications
- [ ] Go to `/profile` → **Notifications** tab → click **Enable** (browser permission prompt appears)
- [ ] Allow → "Push notifications enabled!" confirmation
- [ ] From another account, send a message → push notification appears in OS notification area
- [ ] Click **Disable** → subscription removed

### H5. Notification Preferences
- [ ] `/profile` → Notifications tab → uncheck "Messages" → Save
- [ ] Trigger a message → no notification generated for that type

---

## PART I — ADMIN FLOWS

> Login as **Administrator** for this section.

### I1. Admin Dashboard
- [ ] `/dashboard/admin` loads with platform stats (total users, listings, matches)
- [ ] Recent activity feed shows latest actions
- [ ] Reported content queue shows flagged users

### I2. User Management
- [ ] Go to `/admin` → Users tab
- [ ] List of all users visible with role badges
- [ ] Search/filter users by name or role
- [ ] Click a user → can view profile details

### I3. Listing Moderation
- [ ] `/admin` → Listings tab
- [ ] All listings visible regardless of status
- [ ] Can change listing status (approve/reject/suspend)

### I4. Verify Seller
- [ ] `/admin` → find a seller → click **Verify**
- [ ] Seller's listings now show a verified badge on listing detail page

### I5. Review Moderation
- [ ] `/admin` → Reviews tab
- [ ] Pending reviews listed
- [ ] Approve a review → it becomes visible on the listing
- [ ] Reject a review → it is hidden

### I6. Handle Reports
- [ ] `/admin` → Reports tab
- [ ] Reported users listed
- [ ] Mark report as resolved

### I7. Broadcast Notification
- [ ] `/admin` → Announcements / Broadcast section
- [ ] Type a message → Send to All
- [ ] All users see the notification in their notification center

### I8. Admin Analytics
- [ ] `/analytics` (admin view) → full platform data visible
- [ ] AI Insights tab shows breed trends, demand data

---

## PART J — EDGE CASES & CROSS-CUTTING

### J1. Unauthenticated Access
- [ ] Visit `/dashboard` without logging in → redirected to `/auth/login`
- [ ] Visit `/messages` without logging in → access denied / redirect

### J2. Mobile Responsiveness
- [ ] Resize browser to mobile width (~375px)
- [ ] Navbar collapses to mobile menu (bottom nav)
- [ ] Listings grid becomes single column
- [ ] Messages: thread list fills screen; tap thread → chat view replaces it; ← Back returns to list

### J3. Accessibility
- [ ] Tab through login form → focus order is logical
- [ ] "Skip to main content" link appears on Tab press

### J4. Privacy Policy
- [ ] Footer link → `/privacy` page loads

### J5. 404 Page
- [ ] Visit `/some-nonexistent-page` → custom 404 page shown

---

## RESULT SUMMARY

| Module | Status | Notes |
|---|---|---|
| A — Account Setup | | |
| B — Auth & Security | | |
| C — Seller Flows | | |
| D — Buyer Flows | | |
| E — Messaging | | |
| F — Offers | | |
| G — Reviews | | |
| H — Notifications | | |
| I — Admin | | |
| J — Edge Cases | | |

---

*Fill in ✅ / ❌ / ⚠️ as you go. Report any ❌ items for fixing.*
