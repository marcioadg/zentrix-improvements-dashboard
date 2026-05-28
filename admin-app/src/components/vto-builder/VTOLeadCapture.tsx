import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAttribution } from '@/utils/marketingAttribution';
import { logger } from '@/utils/logger';

interface Props {
  onSubmit: (data: {
    name: string;
    email: string;
    company: string;
    companySize: string;
    role: string;
  }) => void;
}

export const VTOLeadCapture: React.FC<Props> = ({ onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    companySize: '',
    role: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isValid = form.name && form.email && form.company && form.companySize && form.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      // Get marketing attribution from localStorage
      const attribution = getAttribution();

      const { error } = await supabase
        .from('vto_leads')
        .insert({
          name: form.name,
          email: form.email,
          company: form.company,
          company_size: form.companySize,
          role: form.role,
          utm_source: attribution?.utm_source || null,
          utm_medium: attribution?.utm_medium || null,
          utm_campaign: attribution?.utm_campaign || null,
          utm_content: attribution?.utm_content || null,
          utm_term: attribution?.utm_term || null,
          utm_adset: attribution?.utm_adset || null,
          utm_ad: attribution?.utm_ad || null,
          gclid: attribution?.gclid || null,
          fbclid: attribution?.fbclid || null,
          li_fat_id: attribution?.li_fat_id || null,
          landing_page_url: attribution?.landing_page_url || window.location.href,
          referral_source: document.referrer || null,
        } as any);

      if (error) {
        logger.error('Error saving VTO lead:', error);
      }
    } catch (err) {
      logger.error('Error saving VTO lead:', err);
    } finally {
      setSubmitting(false);
      onSubmit(form);
    }
  };

  const companySizes = ['1-10', '11-50', '51-200', '201-500', '500+'];
  const roles = ['Founder / CEO', 'COO / Operations', 'VP / Director', 'Manager', 'Other'];

  return (
    <section id="vto-lead-capture" className="py-24 px-6 bg-background">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Unlock the free V/TO Builder
          </h2>
          <p className="text-muted-foreground text-lg">
            Enter your info to start building your strategic plan now.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="vto-name" className="text-sm font-medium text-foreground">Full Name</Label>
            <Input
              id="vto-name"
              placeholder="John Smith"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="vto-email" className="text-sm font-medium text-foreground">Work Email</Label>
            <Input
              id="vto-email"
              type="email"
              placeholder="john@company.com"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="vto-company" className="text-sm font-medium text-foreground">Company Name</Label>
            <Input
              id="vto-company"
              placeholder="Acme Inc."
              value={form.company}
              onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Company Size</Label>
            <div className="grid grid-cols-5 gap-2 mt-1.5">
              {companySizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, companySize: size }))}
                  className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    form.companySize === size
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Your Role</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, role }))}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    form.role === role
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full h-14 text-lg font-bold bg-foreground hover:bg-foreground/90 text-background rounded-xl"
          >
            {submitting ? 'Starting...' : 'Start Building — It\'s Free'}
          </Button>

          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Your data stays private
            </span>
          </div>
        </form>
      </div>
    </section>
  );
};
