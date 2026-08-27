# 🐾 PetMatchAI

> **AI-Powered Pet Marketplace with Secure Escrow Payments and Intelligent Matchmaking**

A comprehensive platform connecting pet buyers and sellers across Nigeria with deterministic AI matching, secure escrow payments, multi-stakeholder workflows, and complete dispute resolution.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.108.1-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Business Logic](#-business-logic)
- [Security & Authentication](#-security--authentication)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Documentation](#-documentation)

---

## 🎯 Overview

**PetMatchAI** is a next-generation pet marketplace platform that revolutionizes how buyers and sellers connect. Unlike traditional listing platforms, PetMatchAI uses **deterministic AI algorithms** to compute match scores based on real user preferences, behavioral data, and market statistics—ensuring every recommendation is accurate, explainable, and grounded in actual data.

### Problem Statement

Traditional pet marketplaces suffer from:
- ❌ Generic, untargeted listings
- ❌ Lack of buyer-seller trust mechanisms
- ❌ No payment protection for high-value transactions
- ❌ Poor dispute resolution processes
- ❌ Limited verification for listings and users

### Our Solution

PetMatchAI addresses these challenges with:
- ✅ **Intelligent Matchmaking:** AI-powered scoring based on preferences, behavior, and market data
- ✅ **Escrow Protection:** Secure payment holding until buyer confirms receipt
- ✅ **Dual Verification:** Identity verification for users + listing verification for pets
- ✅ **Dispute Resolution:** Admin-mediated conflict resolution with escrow settlement
- ✅ **Multi-Dimensional Reviews:** Comprehensive seller ratings (communication, accuracy, health)
- ✅ **Real-Time Communication:** In-app messaging with email/SMS/push notifications

---

## ✨ Key Features

### 🤖 AI-Powered Matchmaking
**100% Deterministic Algorithm** - No LLM hallucinations, all scores computed from real data

- **Smart Scoring:** 0-100 match scores based on:
  - Hard constraints (species, budget)
  - User preferences (breed, age, gender, health requirements)
  - Location overlap
  - Market price fairness (from live listing data)
  - Behavioral personalization (past saves, views, feedback)
  - Listing popularity (engagement metrics)

- **Explainable AI:** Every score comes with detailed reasons
  - Example: *"This pet scores 87 because it's within your budget, is a German Shepherd (your preferred breed), is located in Lagos (matching your area), and is priced 15% below market average."*

- **Continuous Learning:** User feedback (interested/not interested) refines future recommendations

### 💰 Secure Escrow Payments
**Paystack Integration** with buyer protection

**Payment Flow:**
```
1. Buyer makes offer → Seller accepts
2. Buyer pays via Paystack gateway
3. Funds held in escrow (status: paid_escrow)
4. Seller ships/delivers pet
5. Buyer confirms handover
6. Funds released to seller (status: released)

OR (if issue arises):
3b. Buyer files dispute
4b. Admin reviews evidence
5b. Admin refunds buyer OR releases to seller
```

**Security Features:**
- Race-safe settlement logic (webhook + browser verify)
- Amount verification (ensures paid amount matches agreed price)
- Audit trail for all payment events
- Dispute-triggered refunds

### ✅ Dual Verification System

**Listing Verification:**
- Seller receives unique verification code
- Uploads photo holding pet with code on paper
- Admin reviews and approves/rejects
- Verified badge displayed on listing

**Identity Verification:**
- User uploads government-issued ID
- Uploads selfie for face matching
- Admin reviews documents
- Verified badge displayed on profile

### 💬 Comprehensive Communication

**Multi-Channel Notifications:**
- 📱 In-app notifications
- 📧 Email (Brevo/Sendinblue SMTP)
- 📲 SMS (configurable provider)
- 🔔 Web Push (VAPID)

**User Preferences:**
- Per-notification-type preferences
- Per-channel preferences (can disable email but keep push)
- Stored as JSONB for flexibility

**Threaded Messaging:**
- One conversation per buyer-seller-pet combination
- Read receipts and delivery tracking
- Unread counts for both parties
- Admin can post into disputed threads

### ⭐ Multi-Dimensional Reviews

**4-Aspect Rating System:**
1. **Overall Rating** (1-5 stars)
2. **Communication Rating** - Seller responsiveness
3. **Accuracy Rating** - Listing accuracy vs actual pet
4. **Health Rating** - Pet health condition

**Review Features:**
- Photo attachments (up to 5 images)
- Verified purchase badge (if linked to accepted offer)
- Seller can reply to reviews
- Community helpful votes (many-to-many relationship)
- Prevents duplicate reviews per transaction

### 🔍 Advanced Search & Filtering

- Species (dog, cat, bird, rabbit, reptile, fish, other)
- Breed (autocomplete from database)
- Price range
- Age range (in months)
- Location (Nigeria states/cities)
- Gender
- Health attributes (vaccinated, dewormed, microchipped)
- Seller verification status
- Listing verification status

### 📊 Analytics & Insights

**For Sellers:**
- View count tracking
- Inquiry count tracking
- Price optimization suggestions (based on breed market data)
- Time-to-sell estimates
- Weekly digest emails

**For Admins:**
- Demand forecasting (6-month projections)
- Market statistics (average prices by breed/species)
- User activity trends
- Revenue reports (buyers, sellers, finance)
- Audit logs (all admin actions tracked)

### 🛡️ Dispute Resolution

**Complete Workflow:**
1. User files dispute (reporter vs respondent)
2. System links dispute to offer (for escrow access)
3. Admin views conversation + escrow status
4. Admin posts messages into thread
5. Admin resolves with decision:
   - Refund buyer (calls Transaction.refund())
   - Release to seller (calls Transaction.release())
   - No action (close without settlement)
6. Resolution text posted in chat
7. Both parties notified

**Escrow Integration:**
- Disputes linked to offer_id
- Admin can trigger refunds directly
- Funds returned to original payment method
- Pet status updated (active/sold)

### 🔐 Security Features

**Authentication:**
- JWT-based session management
- Email/password + Google OAuth
- Brute-force protection (5 attempts → 15min lockout)
- Account status management (active/suspended/disabled)

**Authorization:**
- Row Level Security (RLS) on all tables
- Participant-only access for sensitive data
- Admin override capabilities
- Service-role for backend operations

**Data Protection:**
- HTTPS-only communication
- HMAC-SHA512 webhook signature verification
- Parameterized queries (SQL injection prevention)
- XSS protection (React automatic escaping)
- CSRF tokens for mutations

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│  Next.js 16 App Router │ React 19 │ TypeScript 5            │
│  Tailwind CSS 4 │ Lucide Icons │ PWA Support               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  25+ REST Endpoints │ JWT Authentication                    │
│  Zod Validation │ Error Handling                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Business Logic Layer                        │
│  Matching Algorithm │ Escrow Settlement │ Notifications    │
│  Demand Forecasting │ Report Generation                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                 │
│  Supabase PostgreSQL │ RLS Policies │ Triggers             │
│  22 Tables │ 45+ Relationships │ 200+ Columns              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 External Services                           │
│  Paystack (Payments) │ Brevo (Email) │ SMS Provider        │
│  Supabase Storage (Images/Videos) │ Groq (Optional AI)     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

**Matchmaking Flow:**
```
User sets preferences → BuyerPreference saved
                      → Invalidates cached AIMatch scores
User views listings → GET /api/matches
                   → Compute scores for active pets
                   → Factor in: preferences, saved pets, views, market data
                   → Cache scores in AIMatch table
                   → Return sorted by score with reasons[]
User clicks interested → POST /api/matches (feedback)
                      → Update AIMatch.feedback = 'interested'
                      → Create MessageThread
                      → Notify seller
```

**Payment Flow:**
```
Buyer makes offer → POST /api/offers
Seller accepts → PATCH /api/offers (status: accepted)
              → Notify buyer
Buyer clicks pay → POST /api/payments (type: initialize)
                → Create Transaction (status: pending)
                → Call Paystack API (initialize)
                → Return authorization_url
Buyer pays → Paystack gateway
         → Webhook fires → POST /api/payments/webhook
         → Verify HMAC signature
         → Call settleToEscrow() (RACE-SAFE)
         → Update Transaction (status: paid_escrow)
         → Update Pet (status: pending)
         → Notify seller
Buyer receives pet → POST /api/payments (type: release)
                  → Verify buyer ownership
                  → Update Transaction (status: released)
                  → Update Pet (status: sold)
                  → Notify seller (funds released)
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 16.2.4 (App Router)
- **Language:** TypeScript 5.x
- **UI Library:** React 19.2.4
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **Maps:** Leaflet + React Leaflet
- **PWA:** Service Workers, Web Push

### Backend
- **Runtime:** Node.js (Next.js API Routes)
- **Validation:** Zod
- **Authentication:** Supabase Auth (JWT)
- **File Upload:** Supabase Storage

### Database
- **Primary:** PostgreSQL (Supabase)
- **ORM:** Supabase Client (direct SQL)
- **Migrations:** SQL scripts
- **Security:** Row Level Security (RLS)

### External Services
- **Payments:** Paystack (NGN, test mode)
- **Email:** Brevo (Sendinblue) SMTP
- **Storage:** Supabase Storage (3 buckets)
- **AI (Optional):** Groq SDK (for enhanced recommendations)

### DevOps
- **Hosting:** Vercel
- **CI/CD:** Vercel Git Integration
- **Testing:** Jest, Playwright
- **Linting:** ESLint
- **Version Control:** Git

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** 20.x or higher
- **npm/yarn/pnpm:** Latest version
- **Supabase Account:** Free tier works
- **Paystack Account:** Test mode for development

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/petmatchai.git
   cd petmatchai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Paystack
   PAYSTACK_SECRET_KEY=sk_test_xxxxx
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

   # Brevo (Email)
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SMTP_SERVER=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your_smtp_user
   BREVO_SMTP_PASS=your_smtp_pass

   # Web Push (VAPID)
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key

   # Optional: Groq AI
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Set up Supabase database**
   
   Run the SQL scripts in order:
   ```bash
   # In Supabase Dashboard → SQL Editor → New Query
   # Run each file:
   1. supabase-schema.sql
   2. supabase-storage-schema.sql
   3. supabase-transactions.sql
   4. supabase-disputes.sql
   5. supabase-want-ads.sql
   ```

5. **Generate VAPID keys (for web push)**
   ```bash
   npx web-push generate-vapid-keys
   ```
   Copy keys to `.env.local`

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:3000
   ```

### First-Time Setup

1. **Create admin account:**
   - Register normally at `/auth/register`
   - In Supabase Dashboard:
     ```sql
     UPDATE profiles SET role = 'administrator' WHERE email = 'your@email.com';
     ```

2. **Test Paystack webhook locally:**
   ```bash
   # Install ngrok
   npm install -g ngrok

   # Start tunnel
   ngrok http 3000

   # Add webhook URL in Paystack Dashboard:
   https://your-ngrok-url.ngrok.io/api/payments/webhook
   ```

3. **Seed test data (optional):**
   ```bash
   npm run seed  # if seed script exists
   ```

---

## 📁 Project Structure

```
petmatchai/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── admin/                # Admin management
│   │   ├── analytics/            # Demand forecasting, price optimization
│   │   ├── auth/                 # Authentication callbacks
│   │   ├── cron/                 # Scheduled jobs (weekly reports)
│   │   ├── disputes/             # Dispute filing, resolution
│   │   ├── matches/              # AI matchmaking, feedback
│   │   ├── messages/             # Threaded messaging
│   │   ├── notifications/        # In-app notifications
│   │   ├── offers/               # Price negotiation
│   │   ├── payments/             # Escrow payments, webhook
│   │   ├── pets/                 # Listing CRUD, view tracking
│   │   ├── preferences/          # Buyer preferences
│   │   ├── push/                 # Web push subscriptions
│   │   ├── recommendations/      # Hybrid recommendations
│   │   ├── reports/              # PDF/Excel generation
│   │   ├── reviews/              # Multi-dimensional reviews, voting
│   │   ├── upload/               # Image/video upload
│   │   ├── users/                # Profile management
│   │   ├── verify/               # Identity verification
│   │   └── want-ads/             # Buyer request postings
│   ├── admin/                    # Admin dashboard
│   ├── analytics/                # Analytics page
│   ├── auth/                     # Auth pages (login, register, etc.)
│   ├── compare/                  # Pet comparison
│   ├── dashboard/                # Role-based dashboards
│   ├── listings/                 # Pet listings, detail, edit
│   ├── matchmaking/              # Match results page
│   ├── messages/                 # Inbox page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── components/                   # React components
│   ├── auth/                     # Auth forms, guards
│   ├── compare/                  # Comparison tray
│   ├── layout/                   # Navbar, footer
│   ├── listings/                 # Pet cards, filters
│   ├── messaging/                # Chat UI
│   ├── modals/                   # Modals (video call, idle timeout)
│   ├── notifications/            # Notification UI
│   ├── payments/                 # Payment panel, escrow status
│   ├── reviews/                  # Review forms, display
│   └── ui/                       # Reusable UI components
├── lib/                          # Business logic
│   ├── escrow.ts                 # Escrow settlement logic
│   ├── forecast.ts               # Demand forecasting algorithm
│   ├── matching.ts               # AI scoring algorithm
│   ├── paystack.ts               # Paystack integration
│   ├── supabase.ts               # Supabase client setup
│   ├── email.ts                  # Email sending
│   └── utils.ts                  # Utility functions
├── types/                        # TypeScript type definitions
├── public/                       # Static assets
├── docs/                         # Documentation
│   ├── CLASS-DIAGRAM-README.md   # Architecture docs
│   ├── DIAGRAM-COMPARISON.md     # Diagram analysis
│   └── API.md                    # API documentation
├── supabase-*.sql                # Database schema files
├── .env.local                    # Environment variables (gitignored)
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

---

## 🗄️ Database Schema

### Core Tables (22)

#### User Management
- **profiles** - User accounts (buyer/seller/administrator)
- **buyer_preferences** - Matchmaking preferences
- **user_verification_requests** - Identity verification
- **login_attempts** - Brute-force protection

#### Pet Listings
- **pets** - Animal listings
- **pet_images** - Multiple photos per listing
- **pet_videos** - Video attachments
- **verification_requests** - Listing verification
- **saved_pets** - Bookmarks (many-to-many)
- **pet_views** - View tracking

#### Matchmaking
- **ai_matches** - Cached match scores
- **want_ads** - Buyer request postings

#### Communication
- **message_threads** - Conversation channels
- **messages** - Individual messages

#### Transactions
- **offers** - Price negotiations
- **transactions** - Escrow payments

#### Reviews
- **reviews** - Multi-dimensional ratings
- **review_helpful_votes** - Review voting

#### Admin
- **disputes** - Conflict resolution
- **notifications** - In-app alerts
- **push_subscriptions** - Web push
- **audit_logs** - Activity tracking

### Key Relationships

```sql
-- Matchmaking
profiles (1) ←→ (0..1) buyer_preferences
profiles (1) ←→ (0..*) ai_matches ←→ (0..*) pets

-- Escrow
offers (1) ←→ (0..1) transactions
transactions (*) → (1) pets
transactions (*) → (1) profiles (buyer)
transactions (*) → (1) profiles (seller)

-- Disputes
disputes (*) → (0..1) offers → transactions
disputes (*) → (0..1) message_threads

-- Reviews
reviews (1) ←→ (0..*) review_helpful_votes ←→ (0..*) profiles
```

### Database Diagram

See `petmatchai-complete-class-diagram.puml` for the complete entity-relationship diagram.

**View Options:**
1. Install PlantUML extension in VS Code → Open `.puml` file → Press `Alt+D`
2. Visit http://www.plantuml.com/plantuml/uml/ → Paste contents
3. View `petmatchai-class-diagram-mermaid.md` on GitHub (auto-renders)

---

## 🔌 API Documentation

### Authentication Endpoints

```typescript
POST /api/auth/lockout
  - Track login attempts
  - Returns: lockout status

GET /api/users?id={userId}
  - Get user profile
  - Auth: Required

PATCH /api/users
  - Update profile
  - Auth: Required
  - Body: { name, phone, location, avatar_url, notification_prefs }

POST /api/verify
  - Submit ID verification
  - Auth: Required
  - Body: { id_type, id_image_url, selfie_url }
```

### Pet Listing Endpoints

```typescript
GET /api/pets?species=dog&breed=Labrador&minPrice=10000&maxPrice=50000
  - List/search pets
  - Filters: species, breed, price, age, gender, location, seller

POST /api/pets
  - Create listing
  - Auth: Required (seller)
  - Body: { name, species, breed, age_months, gender, price, location, ... }

PATCH /api/pets?id={petId}
  - Update listing
  - Auth: Required (owner)

DELETE /api/pets?id={petId}
  - Delete listing
  - Auth: Required (owner)

POST /api/pets/[id]/view
  - Track view
  - Returns: updated view count
```

### Matchmaking Endpoints

```typescript
GET /api/matches
  - Get AI-matched pets
  - Auth: Required (buyer)
  - Returns: [{ pet, score, reasons, breakdown }]

GET /api/matches?saved=true
  - Get saved pets
  - Auth: Required

GET /api/matches?history=true
  - Get match history with feedback
  - Auth: Required

POST /api/matches
  - Save/unsave pet, provide feedback, accept/decline match
  - Auth: Required
  - Body: { action: 'save|unsave|feedback|accept|decline', petId, feedback? }

GET /api/preferences
  - Get buyer preferences
  - Auth: Required

POST /api/preferences
  - Set/update preferences
  - Auth: Required
  - Body: { preferred_species[], preferred_breeds[], budget_min, budget_max, ... }
  - Side effect: Invalidates cached AIMatch scores
```

### Offer & Payment Endpoints

```typescript
GET /api/offers?petId={petId}
  - List offers for a pet
  - Auth: Required (participant)

POST /api/offers
  - Make offer
  - Auth: Required (buyer)
  - Body: { petId, amount, note? }

PATCH /api/offers
  - Accept/reject/counter offer
  - Auth: Required (seller)
  - Body: { id, action: 'accept|reject|counter', counterAmount? }

POST /api/payments (type: initialize)
  - Initialize payment for accepted offer
  - Auth: Required (buyer)
  - Body: { type: 'initialize', offerId }
  - Returns: { authorization_url, reference }

POST /api/payments (type: verify)
  - Verify payment
  - Auth: Required (buyer)
  - Body: { type: 'verify', reference }
  - Side effect: Funds move to escrow

POST /api/payments (type: release)
  - Release escrow (buyer confirms handover)
  - Auth: Required (buyer)
  - Body: { type: 'release', reference }
  - Side effect: Funds released to seller, pet marked sold

POST /api/payments/webhook
  - Paystack webhook handler
  - Auth: HMAC signature verification
```

### Messaging Endpoints

```typescript
GET /api/messages?petId={petId}&otherUserId={userId}
  - Get/create message thread
  - Auth: Required

POST /api/messages
  - Send message
  - Auth: Required
  - Body: { threadId, content }
  - Side effect: Email + SMS + push notification

PATCH /api/messages?threadId={threadId}
  - Mark messages as read
  - Auth: Required
```

### Review Endpoints

```typescript
GET /api/reviews?sellerId={userId}
  - Get seller reviews
  - Public

POST /api/reviews
  - Submit review
  - Auth: Required (buyer with completed purchase)
  - Body: { sellerId, petId, rating, communication_rating, accuracy_rating, health_rating, comment, photo_urls[] }

PATCH /api/reviews?id={reviewId}
  - Reply to review
  - Auth: Required (seller)
  - Body: { seller_reply }

POST /api/reviews/helpful
  - Vote review helpful
  - Auth: Required
  - Body: { reviewId, action: 'vote|unvote' }
```

### Dispute Endpoints

```typescript
GET /api/disputes
  - Get user's disputes
  - Auth: Required

POST /api/disputes
  - File dispute
  - Auth: Required
  - Body: { respondentId, offerId?, subject, description, context }
  - Side effect: Notifies admin + parties, sets thread dispute_status
```

### Admin Endpoints

```typescript
GET /api/admin?type=auditLogs
  - Get audit logs
  - Auth: Required (admin)
  - Filters: from, to, action, userId

GET /api/admin?type=disputes
  - Get all disputes with escrow + thread info
  - Auth: Required (admin)

GET /api/admin?type=disputeThread&threadId={id}
  - Get conversation for dispute resolution
  - Auth: Required (admin)

PATCH /api/admin (type: resolveDispute)
  - Resolve dispute
  - Auth: Required (admin)
  - Body: { type: 'resolveDispute', disputeId, outcome: 'refund_buyer|release_seller|none', resolution }
  - Side effect: Calls Transaction.refund() or release(), posts admin_decision in chat

POST /api/admin (type: announcement)
  - Send system-wide announcement
  - Auth: Required (admin)
```

Full API documentation: See `docs/API.md`

---

## 🧠 Business Logic

### Matchmaking Algorithm (`lib/matching.ts`)

**100% Deterministic** - No LLM, all scores computed from real data

```typescript
function scoreMatch(
  buyer: BuyerPrefs,
  pet: ScorablePet,
  behavior: { likedKeys, dislikedKeys, savedPetIds },
  market: { byBreed, bySpecies }
): MatchResult {
  score = 0
  
  // Hard constraints
  if (!matchesSpecies(buyer, pet)) return { score: 8, reasons: [...] }
  if (!withinBudget(buyer, pet)) return { score: 18, reasons: [...] }
  
  score = 55 // Base fit
  
  // Breed preference
  if (buyer.preferred_breeds.includes(pet.breed)) score += 18
  else score -= 12
  
  // Age range
  if (withinAgeRange(buyer, pet)) score += 6
  else score -= 12
  
  // Gender
  if (buyer.preferred_gender !== pet.gender && buyer.preferred_gender !== 'any') {
    score -= 10
  }
  
  // Health requirements
  for (const req of buyer.health_requirements) {
    if (!petHasFeature(pet, req)) score -= 12
  }
  
  // Location overlap
  if (locationsOverlap(buyer.preferred_location, pet.location)) {
    score += 10
  }
  
  // Market price fairness
  const avgPrice = market.byBreed[pet.breed]?.avg || market.bySpecies[pet.species]?.avg
  if (pet.price <= avgPrice * 0.9) score += 8  // Below average
  if (pet.price >= avgPrice * 1.25) score -= 6  // Above average
  
  // Behavioral personalization
  const key = `${pet.species} ${pet.breed}`.toLowerCase()
  if (behavior.likedKeys.has(key)) score += 15
  if (behavior.dislikedKeys.has(key)) score -= 20
  
  // Popularity
  if (pet.views > 20) score += 4
  
  return { score: clamp(score, 0, 100), reasons, breakdown }
}
```

**Market Statistics** (computed from live listings):
```typescript
function computeMarketStats(listings: Listing[]): MarketStats {
  // Group by breed and species
  // Calculate average price
  // Return { byBreed: { 'German Shepherd': { avg: 45000, count: 12 }, ... } }
}
```

### Escrow Settlement (`lib/escrow.ts`)

**Race-Safe Settlement** - Handles webhook + browser verify arriving simultaneously

```typescript
async function settleToEscrow(db, tx: Transaction): Promise<Transaction | null> {
  // Only ONE caller succeeds (status guard)
  const { data: updated } = await db
    .from('transactions')
    .update({ 
      status: 'paid_escrow', 
      paid_at: new Date() 
    })
    .eq('id', tx.id)
    .eq('status', 'pending')  // 🔒 Race-safe guard
    .select()
    .maybeSingle()
  
  if (!updated) return null  // Already settled by another caller
  
  // Only winner performs side effects
  await db.from('pets').update({ status: 'pending' }).eq('id', tx.pet_id)
  await db.from('notifications').insert({
    user_id: tx.seller_id,
    type: 'system',
    title: 'Payment received — held in escrow 🔒',
    message: `A buyer has paid ₦${tx.amount.toLocaleString()} into escrow.`
  })
  
  return updated
}
```

### Demand Forecasting (`lib/forecast.ts`)

**Linear regression + momentum analysis**

```typescript
function forecastDemand(timestamps: Date[], horizon: number): Forecast {
  // Convert to monthly series
  const series = groupByMonth(timestamps)
  
  // Calculate trend (least-squares linear regression)
  const trend = calculateTrend(series)
  
  // Calculate momentum (rising/falling/flat)
  const momentum = trend.slope / mean(series.values) > 0.1 ? 'rising' 
                 : trend.slope / mean(series.values) < -0.1 ? 'falling' 
                 : 'flat'
  
  // Project next N months
  const projection = series.months.map((month, i) => 
    trend.intercept + trend.slope * (series.length + i)
  )
  
  return { trend, momentum, projection, insight: generateInsight(...) }
}
```

---

## 🔐 Security & Authentication

### Authentication Flow

```typescript
// Supabase Auth (JWT)
1. User registers → auth.users created
2. Trigger auto-creates profiles row
3. User logs in → JWT token issued
4. API routes verify token:
   const { user } = await verifyToken(token)
   if (!user) return 401
```

### Authorization Levels

| Role | Capabilities |
|------|-------------|
| **Buyer** | Create offers, save pets, submit reviews, send messages |
| **Seller** | Create listings, accept offers, reply to reviews, verify listings |
| **Administrator** | All of the above + resolve disputes, verify users, view audit logs, suspend users |

### Row Level Security (RLS)

All tables have RLS policies:

```sql
-- Example: offers table
CREATE POLICY "Participants can read offers"
  ON offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create offers"
  ON offers FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update offers"
  ON offers FOR UPDATE
  USING (auth.uid() = seller_id);
```

### Security Measures

1. **Brute-Force Protection:**
   - 5 failed login attempts → 15-minute lockout
   - Tracked in `login_attempts` table

2. **Account Status:**
   - active/suspended/disabled
   - Suspended users banned at auth level + profile flag

3. **Payment Security:**
   - Webhook HMAC signature verification
   - Amount validation (paid amount must match offer amount)
   - Idempotent settlement (prevents double-processing)

4. **Data Validation:**
   - Zod schemas for all API inputs
   - SQL injection prevention (parameterized queries)
   - XSS prevention (React automatic escaping)

5. **Audit Trail:**
   - All admin actions logged with entity_type + entity_id
   - Can reconstruct who changed what, when

---

## 🌐 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Git:**
   ```bash
   # Push to GitHub/GitLab
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to https://vercel.com/new
   - Import your repository
   - Configure environment variables (copy from `.env.local`)

3. **Set Environment Variables:**
   - All variables from `.env.local` must be added in Vercel dashboard
   - Mark sensitive variables (API keys) as encrypted

4. **Deploy:**
   - Vercel auto-deploys on every push to main
   - Preview deployments for PRs

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
BREVO_API_KEY
BREVO_SMTP_SERVER
BREVO_SMTP_PORT
BREVO_SMTP_USER
BREVO_SMTP_PASS
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
GROQ_API_KEY (optional)
```

### Production Checklist

- [ ] Enable Paystack live mode
- [ ] Configure production Paystack webhook URL
- [ ] Set up custom domain
- [ ] Enable SSL (automatic on Vercel)
- [ ] Configure email sending limits
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Enable error tracking (Sentry recommended)
- [ ] Set up database backups (Supabase)
- [ ] Configure CORS if needed
- [ ] Set up rate limiting

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# E2E tests (Playwright)
npx playwright test

# E2E with UI
npx playwright test --ui
```

### Test Coverage

```bash
npm run test -- --coverage
```

### Writing Tests

**Unit Test Example:**
```typescript
// __tests__/lib/matching.test.ts
import { scoreMatch } from '@/lib/matching'

describe('Matchmaking Algorithm', () => {
  it('should score 100 for perfect match', () => {
    const buyer = { preferred_species: ['dog'], budget_max: 100000, ... }
    const pet = { species: 'dog', price: 50000, ... }
    const result = scoreMatch(buyer, pet, {}, {})
    expect(result.score).toBeGreaterThan(90)
  })
})
```

**API Test Example:**
```typescript
// __tests__/api/pets.test.ts
import { POST } from '@/app/api/pets/route'

describe('POST /api/pets', () => {
  it('should create pet listing', async () => {
    const req = new Request('http://localhost/api/pets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Max', species: 'dog', ... })
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow TypeScript best practices
   - Add tests for new features
   - Update documentation
4. **Run tests and linting**
   ```bash
   npm run lint
   npm run test
   ```
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add pet video upload support"
   ```
6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Coding Standards

- **TypeScript:** Strict mode enabled
- **Formatting:** Use ESLint + Prettier
- **Naming:** camelCase for variables/functions, PascalCase for components
- **Comments:** JSDoc for public functions
- **Commits:** Conventional Commits (feat, fix, docs, style, refactor, test, chore)

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

---

## 📚 Documentation

### Architecture Documentation
- **CLASS-DIAGRAM-README.md** - Complete system architecture
- **DIAGRAM-COMPARISON.md** - Diagram analysis and improvements
- **DIAGRAM-SUMMARY.md** - Quick reference guide
- **petmatchai-complete-class-diagram.puml** - Entity-relationship diagram (PlantUML)
- **petmatchai-class-diagram-mermaid.md** - Entity-relationship diagram (Mermaid)

### Database Documentation
- **supabase-schema.sql** - Core tables and RLS policies
- **supabase-storage-schema.sql** - Storage buckets and verification tables
- **supabase-transactions.sql** - Escrow payment tables
- **supabase-disputes.sql** - Dispute resolution tables
- **supabase-want-ads.sql** - Want ads tables

### API Documentation
- See [API Documentation](#-api-documentation) section above
- Inline JSDoc comments in route handlers

### Business Logic Documentation
- **lib/matching.ts** - Matchmaking algorithm (inline comments)
- **lib/escrow.ts** - Escrow settlement logic (inline comments)
- **lib/forecast.ts** - Demand forecasting algorithm (inline comments)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

- **Developer:** [Your Name]
- **Project Type:** Academic/Research Project
- **Institution:** [Your Institution]
- **Year:** 2026

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/petmatchai/issues)
- **Email:** support@petmatchai.app
- **Documentation:** [Docs Site](https://docs.petmatchai.app)

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the database and authentication platform
- Paystack for payment gateway integration
- Brevo for email service
- All contributors and testers

---

## 📈 Roadmap

### Phase 1 (Current)
- [x] Core marketplace functionality
- [x] AI matchmaking algorithm
- [x] Escrow payment system
- [x] Dispute resolution
- [x] Multi-dimensional reviews
- [x] Identity and listing verification

### Phase 2 (Planned)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Seller subscriptions/premium features
- [ ] Multi-currency support (USD, EUR)
- [ ] Integration with more payment gateways
- [ ] AI-powered price recommendations
- [ ] Pet health tracking integration
- [ ] Shipping/delivery partner integration

### Phase 3 (Future)
- [ ] Blockchain-based pet pedigree tracking
- [ ] NFT certificates for verified pets
- [ ] Marketplace API for third-party integrations
- [ ] White-label solution for other countries
- [ ] Machine learning for fraud detection

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript, and Supabase**

[⬆ Back to Top](#-petmatchai)

</div>
