# PetMatchAI — Requirement Coverage Tracker

> Source: Supervisor-provided prototype requirement brief (10 modules).
> Purpose: track exactly what's built vs. what's left, so we can close gaps one at a time.
> Legend: ✅ Done · ⚠️ Partial / needs work · ❌ Not implemented

---

## Module 1 — User Registration & Authentication

| Item | Status | Notes |
|---|---|---|
| Registration form with role selection | ✅ | `app/auth/register/page.tsx` |
| Buyer fields: name, email, phone, location | ✅ | Preferences captured separately post-signup, not on the form |
| Buyer pet preferences on registration | ✅ | Step 3 added to buyer registration: species, budget, purpose; saved to `buyer_preferences` on account creation |
| Seller fields: name, email, phone | ✅ | |
| Seller business name / license number | ✅ | Collected on register (seller role) + editable in Profile; run supabase-seller-fields.sql |
| Password strength indicator | ✅ | confirmed in register page |
| Email verification (OTP) | ✅ | Supabase + Brevo SMTP |
| Login page | ✅ | |
| Password recovery/reset | ✅ | Fixed this session, full PKCE flow |
| Social media login | ✅ | Google OAuth via Supabase (`signInWithOAuth`); Google button on login + register pages; `/auth/callback` handles redirect |
| Session management/timeout | ✅ | 30-min idle timeout: warns at 28 min with countdown modal, auto-signs-out at 30 min; activity resets timer |
| Role-based dashboard redirect | ✅ | |
| Profile management screen | ✅ | |
| Login attempt tracking / lockout | ✅ | login_attempts table tracks failures; account locked for 15 min after 5 failures; login page shows lockout state with unlock time |

---

## Module 2 — Dashboard

| Item | Status | Notes |
|---|---|---|
| Role-based dashboard views (buyer/seller/admin) | ✅ | |
| Buyer dashboard: recommended pets, saved listings | ✅ | |
| Buyer dashboard: recent searches | ✅ | Saved to localStorage on search submit; shown as chips on buyer dashboard with clear button |
| Seller dashboard: listings, inquiries, analytics | ✅ | |
| Admin dashboard: stats, activity, reported content | ✅ | |
| Summary cards | ✅ | |
| Recent activity feed | ✅ | |
| Quick action buttons | ✅ | |
| Notification center w/ unread counts | ✅ | Live via Supabase Realtime |
| System announcements | ✅ | Admin → broadcast |
| Pet popularity trends | ✅ | Analytics page + admin AI tab |
| Mobile-responsive layout | ✅ | |

---

## Module 3 — Pet Listing Management (Seller)

| Item | Status | Notes |
|---|---|---|
| Listing creation form | ✅ | |
| Pet details: type, breed, age, gender, color | ✅ | |
| Pet "size" attribute | ✅ | Added to listing form + API schema + SQL migration (supabase-pets-extras.sql) |
| Health status (vaccinated, dewormed) | ✅ | `microchipped` also tracked |
| Health certificate file upload | ✅ | File upload in listing form; stored to Supabase Storage; run supabase-pets-extras.sql |
| Price + negotiation | ✅ | Negotiation handled via separate Offers module |
| Location | ✅ | |
| Multi-photo upload | ✅ | Supabase Storage |
| Video upload | ✅ | |
| Description / personality traits | ✅ | Structured trait tag chips on listing form (Friendly, Playful, Calm, etc.); stored as `traits[]` array |
| Registration/pedigree info | ✅ | |
| Listing status (active/pending/sold) | ✅ | |
| Featured listing (paid) | ⚠️ | Toggle exists but not actually gated behind payment |
| Listing analytics (views/inquiries) | ✅ | |
| Draft saving | ✅ | `localStorage`-based |

---

## Module 4 — Pet Search & Discovery (Buyer)

| Item | Status | Notes |
|---|---|---|
| Global search bar | ✅ | With autocomplete (breed suggestions) |
| Autocomplete | ✅ | Breed dropdown as user types (≥2 chars) |
| Advanced filters: breed, price, species | ✅ | |
| Gender filter | ✅ | Male/Female/Any pills with active chip |
| Sort: price, age, newest | ✅ | "Relevance" sort not implemented |
| Save search | ✅ | Auto-saved to localStorage on Enter/suggestion click; persists across sessions |
| Recent searches history | ✅ | Shown on buyer dashboard; clickable chips link back to filtered /listings |
| Map-based location search | ✅ | "Map" toggle on `/listings`; Leaflet map geocodes listings via `/api/geocode` (Nominatim, Nigeria-scoped); markers with popup (name/breed/price/link) |
| Pet card view | ✅ | |
| Favorite/save listing | ✅ | |
| Compare pets | ✅ | Scale icon on PetCard adds to compare tray (up to 3); tray at bottom navigates to `/compare` side-by-side table |
| Share listing | ✅ | Web Share API on listing detail page |
| View similar pets | ✅ | "Similar pets" grid on `/listings/[id]` — same species, sorted by popularity |

---

## Module 5 — AI Recommendation Engine

| Item | Status | Notes |
|---|---|---|
| Personalized recommendations dashboard | ✅ | `/recommendations` |
| Match % score on pet cards | ✅ | Groq batch scoring, cached in `ai_matches` |
| "Why this pet" explanation | ✅ | Groq-generated reasons |
| Save recommendation | ✅ | |
| "Because you viewed..." section | ✅ | `/recommendations` — based on last viewed pet, same species/breed/price-range |
| "Similar to your saved pets" section | ✅ | `/recommendations` — heuristic match on saved pet species/breed |
| "Popular in your area" section | ✅ | `/recommendations` — location-overlap + sorted by views |
| New listings matching preferences (proactive) | ✅ | `/api/pets` POST now notifies matching buyers via `notifications` insert (respects `new_listings` pref) |
| Breed-specific recommendation view | ⚠️ | Breed is a scoring input, no dedicated browse-by-breed view |
| Feedback buttons (interested / not interested) | ✅ | `/recommendations` cards; persists to `ai_matches.feedback`, fed back into Groq scoring prompt |
| Share recommendation | ✅ | Share2 button on each recommendation card; uses Web Share API |
| Recommendation history | ✅ | "History" tab on /recommendations shows all AI-scored pets with score, status (accepted/declined/pending), date scored |

---

## Module 6 — Buyer-Seller Communication

| Item | Status | Notes |
|---|---|---|
| In-platform messaging | ✅ | |
| Conversation threads per listing | ✅ | `message_threads` keyed by `pet_id` |
| Inquiry form on listing page | ✅ | |
| Read receipts / typing indicators | ✅ | "Seen" shown under last read sent message (Realtime UPDATE sub); animated typing bubble via Supabase Realtime broadcast (throttled 2s) |
| File/image sharing in chat | ❌ | Out of scope |
| Offer & negotiation interface | ✅ | |
| Counter-offer management | ✅ | |
| Video call initiation | ✅ | Video icon in chat header opens Jitsi Meet iframe modal; room name derived from thread ID; end-to-end encrypted; no account needed |
| Message templates | ✅ | Quick-reply template button in chat input; 5 pre-written messages selectable with one click |
| Save/archive conversations | ✅ | Archive button on hover over each thread; persisted to localStorage per user; show/hide archived toggle |
| Block/report user | ✅ | |
| Message search | ✅ | Search bar in thread sidebar filters by name, pet name, and last message |

---

## Module 7 — Matchmaking Engine

| Item | Status | Notes |
|---|---|---|
| AI-generated matches for buyers | ✅ | Shared with Module 5 |
| Match quality score | ✅ | |
| Buyer requests for sellers (want-ads) | ✅ | Buyers post want-ads at `/want-ads`; sellers see matching requests on their dashboard |
| Compatibility breakdown (breed/price/location split) | ⚠️ | Text reason only, not a structured per-category score |
| New match notifications | ✅ | `/api/matches` GET auto-inserts notifications for newly computed matches scoring ≥75% |
| Match history viewer | ✅ | "History" tab on `/matchmaking` page shows all accepted/declined matches with status badges |
| Match acceptance/decline | ✅ | `/matchmaking` cards; accept opens a real seller conversation + seller notification, decline hides the match permanently |
| Follow-up suggestions | ✅ | Buyer dashboard shows "Follow up" cards for accepted matches with no message activity in the last 3 days |
| Match analytics | ✅ | History tab on /matchmaking + /recommendations; export to Excel on /matchmaking |
| Export match data | ✅ | "Export Matches" button on /matchmaking downloads Excel with all scored matches |
| Bidirectional matching (seller sees matching buyers) | ✅ | Seller dashboard fetches `/api/want-ads?sellerId=` and shows matching buyer want-ads filtered by species + budget |

---

## Module 8 — Analytics & Decision Support

| Item | Status | Notes |
|---|---|---|
| Analytics dashboard with KPI cards | ✅ | |
| Market price trends by breed | ✅ | |
| Demand forecasting | ❌ | Out of scope — needs historical ML data |
| Seller performance metrics | ✅ | |
| Listing conversion rate | ✅ | Computed in `/api/analytics`: sold/(sold+active)×100; displayed as stat card in analytics |
| Geographic demand heat map | ❌ | Out of scope |
| Breed popularity ranking | ✅ | |
| Average time to sell | ✅ | Computed from `updated_at - created_at` on sold pets; displayed as stat card in analytics |
| Price optimization suggestions | ❌ | |
| Custom report builder | ✅ | Collapsible builder on /analytics: filter by date range, species, status, sort; generates table + summary cards + Excel export |
| Report export (PDF/Excel) | ✅ | Excel export via dynamic `import("xlsx")`; 3-sheet workbook (Summary, Listings, Market Pricing) on analytics page |
| Scheduled report configuration | ✅ | Weekly email via Vercel Cron (Mon 8am UTC) → /api/cron/weekly-report; sends views/inquiries/active-listings summary via Brevo |

---

## Module 9 — Review & Rating

| Item | Status | Notes |
|---|---|---|
| Post-transaction review form | ✅ | |
| Star rating (1–5) | ✅ | |
| Written review text | ✅ | |
| Multi-criteria ratings (communication/accuracy/health) | ✅ | |
| Photo attachment on review | ✅ | Up to 3 photos on review form; uploaded to Supabase Storage; displayed as thumbnails on listing detail; run supabase-review-photos.sql |
| Verified transaction badge | ✅ | |
| Review moderation queue (admin) | ✅ | |
| Seller response to reviews | ✅ | |
| Review helpfulness voting | ✅ | "Helpful" button on each review card; toggle-vote via `/api/reviews/helpful`; cached count on reviews table; run supabase-review-helpful.sql |
| Aggregate rating display | ✅ | Computed inline on listing page |
| Rating distribution breakdown | ✅ | Star bar chart above reviews on listing detail — avg score, per-star counts, animated fill bars |
| Review history viewer | ✅ | "My Reviews" tab in `/profile` shows all reviews the user has written with rating + verified badge |

---

## Module 10 — Notification & Alert

| Item | Status | Notes |
|---|---|---|
| Notification center w/ unread counts | ✅ | Live via Realtime |
| Real-time alert pop-ups (toast) | ✅ | ToastContainer + ToastContext; Navbar Realtime fires `addToast` on new notification insert; icon+color per type |
| New match notifications | ⚠️ | See Module 7 |
| Message alerts | ✅ | |
| Listing view notifications (to seller) | ✅ | Seller notified at milestone view counts (every 10 views) via `/api/pets/[id]/view` |
| Offer submission alerts | ✅ | |
| Price change notifications (saved listings) | ✅ | Buyers who saved a pet notified when seller updates price via PATCH `/api/pets` |
| New listing alerts (matching preferences) | ✅ | Buyers notified on POST `/api/pets` when new listing matches their species/budget/breed prefs |
| Broadcast composer (admin) | ✅ | |
| Notification preference settings | ✅ | `/profile` Notifications tab |
| Email channel | ✅ | Brevo SMTP wired |
| SMS channel | ✅ | Termii integration in `lib/sms.ts`; gated by `notification_prefs.channel_sms`; fires on new message + offer events |
| Push channel | ✅ | Web Push + VAPID keys; service worker (`public/sw.js`) shows notifications; enable/disable button in Profile → Notifications tab; fires on new message + offer events |
| Alert history log | ✅ | The notifications page itself serves this |

---

## Module 11 — Analytics & Reporting (extended)

| Item | Status | Notes |
|---|---|---|
| Geographic user distribution chart | ✅ | Admin-only bar chart on /analytics showing top user locations from profiles.location |
| AI Executive Summary generator | ✅ | Groq-powered 3-sentence summary on /analytics; all roles; Generate/Regenerate button |
| PDF export | ✅ | window.print() with proper @media print CSS; prints page cleanly |
| Data visualizations | ✅ | Bar charts for breed pricing, listings volume, seller views |

---

## Module 12 — Platform Administration (extended)

| Item | Status | Notes |
|---|---|---|
| Disputes tab in admin | ✅ | Admin panel "Disputes" tab — table with inline resolution form; run supabase-disputes.sql |
| Categories tab in admin | ✅ | Admin panel "Categories" tab — species bar chart + searchable breed directory from live DB |
| Bulk operations | ❌ | Out of scope for prototype |
| Platform settings panel | ❌ | Out of scope for prototype |
| System health monitor | ❌ | Out of scope for prototype |

---

## Module 13 — Security & Audit

| Item | Status | Notes |
|---|---|---|
| Role-based permission matrix | ✅ | 3 roles (buyer/seller/admin) enforced at API and UI level |
| Audit log with filters | ✅ | Admin "Audit Log" tab — filter by date range, action type, user ID; Export CSV |
| Listing modification history | ✅ | PATCH /api/pets logs field-level diffs (from/to) to audit_logs with action "edit_listing" |
| User action audit log | ✅ | Role changes, suspensions, verifications, announcements all logged to audit_logs |
| Dispute resolution system | ✅ | Disputes table + admin resolution UI; run supabase-disputes.sql |
| Structured compatibility breakdown | ✅ | Matchmaking cards show 5-category grid: Species/Price/Breed/Location/Health with ✓/✗ |
| Data encryption status | ⚠️ | Supabase handles encryption at rest; no in-app status UI |
| MFA for staff | ❌ | Out of scope |
| Real-time anomaly detection | ❌ | Out of scope |
| Data retention policy configuration | ❌ | Out of scope |
| Privacy compliance documentation | ✅ | /privacy page exists |

---

## Still out of scope (documented, defensible)

- FR-10 2FA / MFA — low academic return for effort; Supabase TOTP available if needed
- FR-39 File/image sharing in chat messages
- FR-43 Demand forecasting — needs historical ML training data
- Geographic heat map — data exists but rendering a proper choropleth needs a paid tile service
- Featured listing payment gate — payment provider integration out of scope
- Price optimization AI suggestions — needs sufficient historical sell-price data
- Bulk admin operations — prototype scope
- Platform settings panel — prototype scope

---

## Remaining Work — Suggested Order (one step at a time)

Prioritized by: (a) how directly it supports the stated objective ("AI-powered... based on preferences **and behavioral data**"), (b) cost to build given existing data we already have.

1. ~~**Recommendation feedback loop**~~ — ✅ Done 2026-06-16. "Interested"/"not interested" buttons on `/recommendations`, persisted to `ai_matches.feedback`, injected into the Groq prompt as a behavioral-signal block that demonstrably changes scoring/reasoning for other pets (verified end-to-end in browser).
2. ~~**Match accept/decline**~~ — ✅ Done 2026-06-16. `/matchmaking` cards now have Accept/Decline. Accept marks `ai_matches.match_status = 'accepted'`, opens (or reuses) a `message_threads` conversation with the seller, auto-sends a starter message, and notifies the seller — verified seller-side (notification + thread visible in their inbox). Decline marks `'declined'` and the match is filtered out of all future `/api/matches` responses (persists across reload). Idempotency-checked: re-accepting an already-accepted match does not duplicate the message or notification.
3. ~~**Contextual recommendation sections**~~ — ✅ Done 2026-06-17. "Because you viewed", "similar to saved", "popular in your area" sections live in `/recommendations`.
4. ~~**Gender filter + autocomplete on search**~~ — ✅ Done 2026-06-17. Gender (Male/Female/Any) pills + breed autocomplete dropdown (≥2 chars) added to `/listings`.
5. ~~**Seller business name / license number field**~~ — ✅ Done 2026-06-17. Collected on seller registration + editable in `/profile` → Profile tab; run `supabase-seller-fields.sql`.
6. ~~**Compare pets / view similar pets**~~ — ✅ Done 2026-06-17. Scale icon on PetCard adds to floating compare tray (max 3); tray "Compare" button opens `/compare?ids=…` side-by-side table. Similar pets grid on detail page (same species, sorted by views).
7. ~~**Rating distribution breakdown + review photo attachment**~~ — ✅ Done 2026-06-19. Star bar chart (avg score + per-star counts + animated bars) on listing detail reviews tab. Photo upload on review form (up to 3, previewed before submit, stored in Supabase); photos displayed as thumbnails on review cards. Run `supabase-review-photos.sql`.
8. ~~**Real-time toast pop-ups**~~ — ✅ Done 2026-06-19. ToastContext + ToastContainer; Navbar Realtime listener fires `addToast` with icon/color mapping per notification type (message/offer/match/system).
9. ~~**SMS backend**~~ — ✅ Done 2026-06-19. Termii integration (`lib/sms.ts`); normalises Nigerian numbers; fires on new message + offer events; respects `notification_prefs.channel_sms`. Set `TERMII_API_KEY` + `TERMII_SENDER_ID` env vars.
10. ~~**Time-to-sell / conversion-rate analytics**~~ — ✅ Done 2026-06-19. `avgDaysToSell` and `conversionRate` computed in `/api/analytics`; displayed as stat cards + included in Excel export.
11. ~~**Bidirectional matching** (seller sees matching buyers) + **buyer want-ads**~~ — ✅ Done 2026-06-19. Buyers manage want-ads at `/want-ads`; seller dashboard fetches `/api/want-ads?sellerId=` and shows "Matching Buyer Requests" section. Run `supabase-want-ads.sql`.
12. ~~**Excel export**~~ — ✅ Done 2026-06-19. Dynamic `import("xlsx")` on analytics page; exports 3-sheet workbook (Summary, Listings, Market Pricing).

---

*Last updated: 2026-06-19 (all external-service features implemented — Google OAuth, Leaflet map, Web Push, Jitsi video call)*
