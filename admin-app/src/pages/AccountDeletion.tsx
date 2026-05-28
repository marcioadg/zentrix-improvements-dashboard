import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { SchemaMarkup } from '@/components/seo/SchemaMarkup';

const AccountDeletion: React.FC = () => {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Account Deletion - Zentrix OS",
      "description": "Learn how to delete your Zentrix OS account, what data is removed, and what is retained.",
      "url": "https://zentrixos.com/account-deletion",
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
        <title>Account Deletion - Zentrix OS</title>
        <meta name="description" content="Learn how to delete your Zentrix OS account. Understand what data is deleted, anonymized, and retained when you request account deletion." />
        <link rel="canonical" href="https://zentrixos.com/account-deletion" />
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
          Account Deletion
        </h1>
        <p className="text-muted-foreground mb-8">
          Last updated: February 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-10 text-foreground">
          {/* Overview */}
          <section>
            <p className="text-muted-foreground">
              Zentrix OS allows you to delete your account at any time. This page explains how to request account deletion, what data is removed, and what data may be retained for organizational integrity. This policy applies to all Zentrix OS users across web, Android, and iOS platforms.
            </p>
          </section>

          {/* How to Delete */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. How to Delete Your Account</h2>
            <p className="text-muted-foreground mb-4">
              Only the account owner can request deletion. Account deletion is self-service and does not require contacting support.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">On Desktop (Web Browser)</h3>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Log in to your Zentrix OS account at <strong>zentrixos.com</strong></li>
              <li>Navigate to <strong>Settings</strong> from the sidebar</li>
              <li>Scroll to the <strong>Danger Zone</strong> section</li>
              <li>Click <strong>"Delete Account"</strong></li>
              <li>Confirm your identity by entering your password (for email/password accounts)</li>
              <li>Confirm the deletion when prompted</li>
            </ol>

            <h3 className="text-xl font-semibold mb-3 mt-6">On Mobile (Android / iOS)</h3>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Open the Zentrix OS app</li>
              <li>Tap the <strong>Settings</strong> icon</li>
              <li>Scroll to the <strong>Danger Zone</strong> section</li>
              <li>Tap <strong>"Delete Account"</strong></li>
              <li>Confirm your identity by entering your password (for email/password accounts)</li>
              <li>Confirm the deletion when prompted</li>
            </ol>
          </section>

          {/* Timing */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. When Does Deletion Take Effect?</h2>
            <p className="text-muted-foreground">
              Account deletion is <strong>immediate</strong>. Once you confirm the deletion, your account is deactivated instantly. There is no cooling-off period or waiting time. You will be logged out and will no longer be able to access your account.
            </p>
          </section>

          {/* What is Deleted */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. What Data Is Deleted or Anonymized</h2>
            <p className="text-muted-foreground mb-4">
              When you delete your account, the following actions are taken immediately:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Profile name</strong> is changed to "Deleted User"</li>
              <li><strong>Email address</strong> is anonymized (your original email is freed for reuse)</li>
              <li><strong>Account role</strong> is set to inactive</li>
              <li><strong>All company memberships</strong> are deactivated</li>
              <li><strong>Personal tasks</strong> are deleted</li>
              <li><strong>Issue ratings</strong> you submitted are permanently deleted</li>
              <li><strong>Ownership references</strong> are reassigned to a system placeholder</li>
              <li><strong>Audit trail references</strong> are anonymized</li>
              <li><strong>Third-party integration tokens</strong> (Google Calendar, etc.) are deleted from our database, and we attempt to revoke access at the provider so any remaining copies of the token are invalidated</li>
            </ul>
          </section>

          {/* What is Retained */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. What Data May Be Retained</h2>
            <p className="text-muted-foreground mb-4">
              To preserve the integrity of shared organizational data, certain content you contributed to your company workspace may be retained in anonymized form. This data is no longer linked to your identity and is attributed to a generic "Deleted User" placeholder.
            </p>
            <p className="text-muted-foreground mb-4">
              Retained data may include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Company goals, metrics, and issues</strong> — shared team data that other members depend on</li>
              <li><strong>SOPs, wiki pages, and strategic plans</strong> — organizational knowledge base content</li>
              <li><strong>Meeting templates and meeting records</strong> — shared meeting history</li>
              <li><strong>Headlines and health assessments</strong> — company-wide reporting data</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              This retained data cannot be used to identify you. Your name, email, and personal information are removed from all retained records.
            </p>
          </section>

          {/* Google/Social Login */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Accounts Using Google Sign-In</h2>
            <p className="text-muted-foreground">
              If you signed up using Google, the same deletion process applies. Navigate to Settings, then delete your account from the Danger Zone section. Deleting your Zentrix OS account does not affect your Google account. To also revoke Zentrix OS access to your Google account, visit your{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Account Permissions
              </a>.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Questions or Assistance</h2>
            <p className="text-muted-foreground">
              If you have any questions about account deletion or need assistance, please contact us:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong>{' '}
              <a href="mailto:rodrigo@zentrixventures.com" className="text-primary hover:underline">
                rodrigo@zentrixventures.com
              </a>
            </p>
            <p className="text-muted-foreground mt-2">
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
            <a href="mailto:rodrigo@zentrixventures.com" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AccountDeletion;
