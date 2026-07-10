export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: June 2026 · Effective immediately</p>

      <div className="prose prose-sm max-w-none space-y-8 text-gray-700">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Who We Are</h2>
          <p>
            PetMatchAI is operated by <strong>Hemmy Kennel</strong>, a registered pet breeding and trading business based in Lagos, Nigeria.
            This platform connects pet buyers and sellers using AI-powered matching.
            For privacy inquiries, contact us at <a href="mailto:famhemmy3@gmail.com" className="text-indigo-600 hover:underline">famhemmy3@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data:</strong> name, email address, phone number, location, role (buyer/seller/admin)</li>
            <li><strong>Listing data:</strong> pet details, photos, videos, pricing, health records you choose to share</li>
            <li><strong>Preference data:</strong> species, breed, budget, and purpose preferences used for AI matching</li>
            <li><strong>Communication data:</strong> messages and offers exchanged between buyers and sellers</li>
            <li><strong>Usage data:</strong> page views, listing views, and interaction logs for analytics</li>
            <li><strong>Verification data:</strong> photos submitted for listing verification purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To operate the platform and facilitate buyer-seller connections</li>
            <li>To score pet matches on our own servers, and to generate AI recommendation summaries via Groq</li>
            <li>To send transactional notifications (new messages, offer updates, listing status)</li>
            <li>To moderate listings and verify seller authenticity</li>
            <li>To generate aggregate analytics for sellers (views, inquiries — never shared with buyers)</li>
            <li>To comply with applicable Nigerian law (NDPR 2019)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Legal Basis (NDPR Compliance)</h2>
          <p>
            Under the Nigeria Data Protection Regulation (NDPR) 2019, we process your personal data on the following lawful bases:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Contract performance:</strong> to provide the services you registered for</li>
            <li><strong>Legitimate interests:</strong> fraud prevention, platform security, analytics</li>
            <li><strong>Consent:</strong> marketing communications (you may withdraw consent at any time)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Data Sharing</h2>
          <p>We do <strong>not</strong> sell your personal data. We share limited data with:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Supabase (Ireland/USA):</strong> database and file storage — GDPR-compliant infrastructure</li>
            <li><strong>Groq Inc. (USA):</strong> AI text generation for recommendation summaries and analytics — only anonymised, aggregated data is sent, no personal identifiers. Match scoring itself runs on our own servers and is never sent to Groq.</li>
            <li><strong>Other users:</strong> only the data visible in your public profile and listings</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. Deleted listings are removed within 30 days.
            You may request deletion of your account and all associated data at any time by emailing us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Your Rights</h2>
          <p>Under the NDPR you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Access a copy of the personal data we hold about you</li>
            <li>Correct inaccurate data (via your Profile settings)</li>
            <li>Request deletion of your account and data</li>
            <li>Object to processing for marketing purposes</li>
            <li>Lodge a complaint with the National Information Technology Development Agency (NITDA)</li>
          </ul>
          <p className="mt-2">To exercise any right, email <a href="mailto:famhemmy3@gmail.com" className="text-indigo-600 hover:underline">famhemmy3@gmail.com</a>.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Security</h2>
          <p>
            All data is encrypted in transit (TLS) and at rest. Authentication uses bcrypt password hashing and JWT tokens
            managed by Supabase Auth. Row Level Security (RLS) ensures users can only access their own data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Cookies</h2>
          <p>
            We use only strictly necessary cookies for session management (Supabase Auth session token). We do not use
            tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Significant changes will be communicated via in-app notification.
            Continued use of the platform after changes constitutes acceptance.
          </p>
        </section>

      </div>
    </div>
  );
}
