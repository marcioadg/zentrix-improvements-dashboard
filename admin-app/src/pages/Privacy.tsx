import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { SchemaMarkup } from '@/components/seo/SchemaMarkup';

const Privacy: React.FC = () => {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy - Zentrix OS",
      "description": "Privacy Policy for Zentrix OS application. Learn how we collect, use, and protect your data.",
      "url": "https://zentrixos.com/privacy",
      "inLanguage": "en",
      "publisher": {
        "@type": "Organization",
        "name": "Zentrix Ventures",
        "email": "rodrigo@zentrixventures.com"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy - Zentrix OS</title>
        <meta name="description" content="Privacy Policy for Zentrix OS. Learn how we collect, use, protect, and share your personal information when you use our business operating system." />
        <link rel="canonical" href="https://zentrixos.com/privacy" />
      </Helmet>
      <SchemaMarkup schemas={schemas} />

      {/* Nav */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" className="text-xl md:text-2xl font-bold text-foreground">
            Zentrix
          </Link>
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mb-8">
          Last updated: December 23, 2025
        </p>

        <div className="prose prose-gray max-w-none space-y-10 text-foreground">
          {/* Introduction */}
          <section>
            <p className="text-muted-foreground">
              Zentrix Ventures ("Zentrix", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Zentrix OS application ("App") and related services. Please read this privacy policy carefully. By using the App, you consent to the practices described in this policy.
            </p>
          </section>

          {/* Section 1 - Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect several types of information from and about users of our App:
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">1.1 Account Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Full name and display name</li>
              <li>Email address</li>
              <li>Profile photo (if provided)</li>
              <li>Password (encrypted)</li>
              <li>Phone number (optional)</li>
              <li>Account preferences and settings</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">1.2 Business and Organizational Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Company name and information</li>
              <li>Team structures and member assignments</li>
              <li>Tasks, to-dos, and project data</li>
              <li>Goals, metrics, and KPIs</li>
              <li>Meeting notes and agendas</li>
              <li>Issues and problem tracking</li>
              <li>Headlines and announcements</li>
              <li>SOPs (Standard Operating Procedures) and wiki content</li>
              <li>Organizational charts and accountability data</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">1.3 Usage and Analytics Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Session duration and frequency</li>
              <li>Features accessed and usage patterns</li>
              <li>Actions taken within the App</li>
              <li>Performance metrics and error logs</li>
              <li>Device and browser information</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">1.4 Payment Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Billing name and address</li>
              <li>Payment method details (processed securely via Stripe)</li>
              <li>Subscription status and history</li>
              <li>Invoice and transaction records</li>
            </ul>
            <p className="text-muted-foreground mt-2 text-sm">
              Note: We do not store complete credit card numbers. All payment processing is handled by Stripe, a PCI-compliant payment processor.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">1.5 Communication Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>AI chat conversations and queries</li>
              <li>Support requests and correspondence</li>
              <li>Notification preferences</li>
              <li>In-app messaging content</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">1.6 Files and Media</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Uploaded documents and attachments</li>
              <li>Images and profile photos</li>
              <li>Task and issue attachments</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">1.7 Technical Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device type and operating system</li>
              <li>Time zone and language settings</li>
              <li>Unique device identifiers</li>
              <li>Crash reports and diagnostic data</li>
            </ul>
          </section>

          {/* Section 2 - How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the information we collect for the following purposes:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Service Provision</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Create and manage your account</li>
              <li>Provide, operate, and maintain the App</li>
              <li>Process and complete transactions</li>
              <li>Enable collaboration features among team members</li>
              <li>Sync data across your devices</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Payment Processing</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Process subscription payments</li>
              <li>Send billing notifications and invoices</li>
              <li>Manage subscription renewals and cancellations</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Communications</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Send transactional emails (password resets, confirmations)</li>
              <li>Deliver notifications about meetings, tasks, and deadlines</li>
              <li>Provide customer support</li>
              <li>Send product updates and feature announcements (with opt-out option)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Analytics and Improvement</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Analyze usage patterns to improve the App</li>
              <li>Monitor performance and fix issues</li>
              <li>Develop new features based on user needs</li>
              <li>Conduct research and analysis</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.5 AI Features</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Power AI-assisted chat and recommendations</li>
              <li>Provide contextual business insights</li>
              <li>Generate summaries and analysis</li>
              <li>Improve AI model performance (using anonymized data)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.6 Security and Compliance</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Detect and prevent fraud and abuse</li>
              <li>Ensure the security of your account</li>
              <li>Comply with legal obligations</li>
              <li>Enforce our Terms of Service</li>
            </ul>
          </section>

          {/* Section 3 - Information Sharing and Disclosure */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Information Sharing and Disclosure</h2>
            <p className="text-muted-foreground mb-4">
              <strong>We do not sell your personal information.</strong> We may share information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Service Providers</h3>
            <p className="text-muted-foreground mb-3">We share data with trusted third-party service providers who assist us in operating the App:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Supabase:</strong> Database hosting, authentication, and file storage</li>
              <li><strong>Stripe:</strong> Payment processing and subscription management</li>
              <li><strong>Google Analytics / Google Tag Manager:</strong> Usage analytics and conversion tracking</li>
              <li><strong>AI Providers (e.g., OpenAI):</strong> AI-powered features and natural language processing</li>
              <li><strong>Sentry:</strong> Error monitoring and performance tracking</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Within Your Organization</h3>
            <p className="text-muted-foreground">
              Data you create within a company workspace may be visible to other members of that company based on permissions and access controls set by company administrators.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Legal Requirements</h3>
            <p className="text-muted-foreground">
              We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas).
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Business Transfers</h3>
            <p className="text-muted-foreground">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.5 With Your Consent</h3>
            <p className="text-muted-foreground">
              We may share your information for any other purpose with your explicit consent.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.6 Third-Party OAuth Integrations</h3>
            <p className="text-muted-foreground mb-3">
              Zentrix OS lets you optionally connect third-party services (e.g., Google Calendar) so our AI agent can read information on your behalf. These connections are strictly opt-in and managed per user.
            </p>
            <p className="text-muted-foreground mb-3">
              <strong>What we receive:</strong> When you click "Connect" for a third-party service, you authorize that service to share specific data with Zentrix OS through the provider's official OAuth flow. We store only the access and refresh tokens necessary to make API requests as you, plus a display label such as the connected account email. We never request, store, or have access to your password for those services.
            </p>
            <p className="text-muted-foreground mb-3">
              <strong>Where the data goes:</strong> Data retrieved from connected services (e.g., calendar events) is fetched at request time, used to answer your in-app query, briefly included in the prompt sent to our AI providers solely so the AI can compose your reply, and not retained on Zentrix servers beyond the lifetime of that request. We do not sell this data, use it to serve advertising, or share it with third parties other than the AI providers strictly necessary to fulfill your request.
            </p>
            <p className="text-muted-foreground mb-3">
              <strong>How to disconnect:</strong> You can disconnect any third-party integration at any time from Settings → Integrations. Disconnecting deletes the stored tokens from Zentrix and revokes the connection at the provider where supported.
            </p>

            <h4 className="text-lg font-semibold mb-3 mt-6">Google API Services — Limited Use Disclosure</h4>
            <p className="text-muted-foreground mb-3">
              Zentrix OS's use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
            <p className="text-muted-foreground mb-3">
              Specifically, with respect to data accessed via Google APIs:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>We use Google user data only to provide and improve user-facing features in Zentrix OS (for example, surfacing your upcoming meetings to the in-app AI agent when you ask about your schedule).</li>
              <li>We do not transfer Google user data to third parties except as necessary to provide or improve user-facing features, comply with applicable law, or as part of a merger, acquisition, or sale of assets with notice to users.</li>
              <li>We do not use Google user data for serving advertisements, including retargeting, personalized, or interest-based advertising.</li>
              <li>We do not allow humans to read Google user data unless we have your affirmative agreement for specific messages, are doing so for security purposes (such as investigating abuse), to comply with applicable law, or for internal operations where the data has been aggregated and anonymized.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Scopes we request from Google: <code className="text-xs bg-muted px-1 py-0.5 rounded">calendar.readonly</code> and <code className="text-xs bg-muted px-1 py-0.5 rounded">calendar.events.readonly</code> (to display upcoming events in response to your queries), and the standard <code className="text-xs bg-muted px-1 py-0.5 rounded">openid</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">email</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">profile</code> scopes (to show you which Google account is connected). We do not modify your calendar or events — read access only.
            </p>
          </section>

          {/* Section 4 - Apple App Store Specific Disclosures */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. App Store Privacy Disclosures</h2>
            <p className="text-muted-foreground mb-4">
              In accordance with Apple App Store requirements, we provide the following disclosures:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Data Linked to Your Identity</h3>
            <p className="text-muted-foreground mb-3">The following data may be linked to your identity:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Contact Info (name, email address, phone number)</li>
              <li>User Content (tasks, notes, documents, photos)</li>
              <li>Identifiers (user ID, device ID)</li>
              <li>Usage Data (product interaction, analytics)</li>
              <li>Purchases (payment info, purchase history)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Data Not Linked to Your Identity</h3>
            <p className="text-muted-foreground mb-3">The following data is collected but not linked to your identity:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Diagnostics (crash data, performance data)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Tracking</h3>
            <p className="text-muted-foreground">
              <strong>This app does not track you across apps and websites owned by other companies</strong> for the purposes of advertising or sharing with data brokers. We use analytics solely for improving our own services.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.4 Data Use Purposes</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>App Functionality:</strong> Essential data for core features</li>
              <li><strong>Analytics:</strong> Understanding usage to improve the App</li>
              <li><strong>Product Personalization:</strong> Customizing your experience</li>
              <li><strong>Developer's Advertising or Marketing:</strong> Occasional product updates (opt-out available)</li>
            </ul>
          </section>

          {/* Section 5 - Data Security */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Encryption in Transit:</strong> All data transmitted between your device and our servers is encrypted using TLS/SSL</li>
              <li><strong>Encryption at Rest:</strong> Stored data is encrypted using AES-256 encryption</li>
              <li><strong>Secure Authentication:</strong> Powered by Supabase Auth with secure password hashing (bcrypt)</li>
              <li><strong>Row Level Security (RLS):</strong> Database-level access controls ensure users can only access their authorized data</li>
              <li><strong>Regular Security Audits:</strong> We conduct regular security assessments and penetration testing</li>
              <li><strong>Access Controls:</strong> Strict internal access controls limit who can access user data</li>
              <li><strong>Two-Factor Authentication:</strong> Available for additional account security</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Section 6 - Your Rights */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Your Rights and Choices</h2>
            <p className="text-muted-foreground mb-4">
              Depending on your location, you may have the following rights regarding your personal information:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Access and Portability</h3>
            <p className="text-muted-foreground">
              You have the right to request a copy of the personal information we hold about you. You can export your data at any time through your account settings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Correction</h3>
            <p className="text-muted-foreground">
              You can update or correct your personal information through your account settings or by contacting us.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Deletion</h3>
            <p className="text-muted-foreground">
              You have the right to request deletion of your personal data ("right to be forgotten"). You can delete your account through account settings, which will remove your personal data from our active systems within 30 days.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.4 Objection and Restriction</h3>
            <p className="text-muted-foreground">
              You may object to the processing of your personal data or request that we restrict certain processing activities.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.5 Opt-Out of Marketing</h3>
            <p className="text-muted-foreground">
              You can opt out of marketing communications at any time by clicking the "unsubscribe" link in any email or updating your notification preferences in the App.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.6 California Residents (CCPA)</h3>
            <p className="text-muted-foreground">
              California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete, and the right to opt-out of the sale of personal information. We do not sell your personal information.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.7 European Residents (GDPR)</h3>
            <p className="text-muted-foreground">
              If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including the rights mentioned above. Our legal basis for processing is: (a) your consent, (b) performance of a contract, and (c) legitimate interests in operating our business.
            </p>

            <p className="text-muted-foreground mt-4">
              To exercise any of these rights, please contact us at <a href="mailto:rodrigo@zentrixventures.com" className="text-primary hover:underline">rodrigo@zentrixventures.com</a>.
            </p>
          </section>

          {/* Section 7 - Data Retention */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We retain your personal information for as long as necessary to fulfill the purposes described in this Privacy Policy:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account Data:</strong> Retained while your account is active and for up to 30 days after deletion request</li>
              <li><strong>Business Data:</strong> Retained while your company subscription is active</li>
              <li><strong>Usage Analytics:</strong> Aggregated analytics may be retained indefinitely</li>
              <li><strong>Security Logs:</strong> Retained for 90 days for security and fraud prevention</li>
              <li><strong>Payment Records:</strong> Retained as required by tax and accounting regulations (typically 7 years)</li>
              <li><strong>Backup Data:</strong> May persist in encrypted backups for up to 90 days after deletion</li>
            </ul>
          </section>

          {/* Section 8 - Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Zentrix OS is a business productivity tool and is <strong>not intended for use by children under the age of 16</strong>. We do not knowingly collect personal information from children under 16. If we learn that we have collected personal information from a child under 16, we will take steps to delete that information as quickly as possible. If you believe we may have collected information from a child under 16, please contact us immediately.
            </p>
          </section>

          {/* Section 9 - International Data Transfers */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground mb-4">
              Your information may be transferred to, and maintained on, servers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ from those in your jurisdiction.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Our primary servers are located in the United States and European Union</li>
              <li>We use service providers who may process data in various locations globally</li>
              <li>We implement appropriate safeguards for international transfers, including Standard Contractual Clauses where applicable</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              By using the App, you consent to the transfer of your information to these locations.
            </p>
          </section>

          {/* Section 10 - Cookies and Tracking Technologies */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar tracking technologies to collect and track information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Essential Cookies:</strong> Required for the App to function (authentication, session management)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the App (Google Analytics)</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can control cookies through your browser settings. Note that disabling certain cookies may affect the functionality of the App.
            </p>
          </section>

          {/* Section 11 - Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>Posting the updated policy on this page</li>
              <li>Updating the "Last updated" date at the top</li>
              <li>Sending an email notification for significant changes</li>
              <li>Displaying an in-app notification</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Your continued use of the App after any changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Section 12 - Contact Us */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted/50 rounded-lg p-6 space-y-3">
              <p className="text-foreground font-semibold">Zentrix Ventures</p>
              <p className="text-muted-foreground">
                <strong>Email:</strong> <a href="mailto:rodrigo@zentrixventures.com" className="text-primary hover:underline">rodrigo@zentrixventures.com</a>
              </p>
              <p className="text-muted-foreground">
                <strong>Privacy Inquiries:</strong> <a href="mailto:privacy@zentrixventures.com" className="text-primary hover:underline">privacy@zentrixventures.com</a>
              </p>
              <p className="text-muted-foreground">
                <strong>Website:</strong> <a href="https://zentrixos.com" className="text-primary hover:underline">https://zentrixos.com</a>
              </p>
            </div>
            <p className="text-muted-foreground mt-4">
              We will respond to your inquiry within 30 days.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 md:px-8 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 Zentrix Ventures. All rights reserved.</div>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/account-deletion" className="hover:text-foreground transition-colors">
              Account Deletion
            </Link>
            <a href="mailto:rodrigo@zentrixventures.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
