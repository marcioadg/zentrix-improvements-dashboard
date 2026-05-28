import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
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
          Terms of Service
        </h1>
        <p className="text-muted-foreground mb-8">
          Last updated: January 2025
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Zentrix ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Zentrix provides a cloud-based operating system for businesses to manage goals, track progress, coordinate teams, and achieve business objectives. The Service is accessible via web browser and may include various features and tools as updated from time to time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground mb-4">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Violate or infringe upon the rights of others</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload or transmit viruses or malicious code</li>
              <li>Collect or harvest information from the Service</li>
              <li>Use the Service to send spam or unsolicited messages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The Service and its original content, features, and functionality are owned by Zentrix and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. User Content</h2>
            <p className="text-muted-foreground mb-4">
              You retain ownership of content you create, upload, or share through the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display your content solely for the purpose of providing the Service.
            </p>
            <p className="text-muted-foreground">
              You are responsible for your content and warrant that you have all necessary rights to grant us this license.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Payment and Subscription</h2>
            <p className="text-muted-foreground mb-4">
              Some features of the Service require a paid subscription. By purchasing a subscription:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You agree to pay all applicable fees</li>
              <li>Subscriptions automatically renew unless cancelled</li>
              <li>You can cancel at any time through your account settings</li>
              <li>Refunds are provided according to our refund policy</li>
              <li>We may change pricing with 30 days notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, timely, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              In no event shall Zentrix be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the new Terms and updating the "Last updated" date. Your continued use of the Service after changes constitute acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Zentrix operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contact Information</h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              Email: rodrigo@zentrixventures.com
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 md:px-8 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 Zentrix. All rights reserved.</div>
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
            <a href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
