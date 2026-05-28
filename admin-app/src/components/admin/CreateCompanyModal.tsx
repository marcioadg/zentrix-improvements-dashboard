
import React, { useState } from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface CreateCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({
        title: "Error",
        description: "Company name and slug are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .insert({ name: name.trim(), slug: slug.trim() });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company created successfully",
      });

      setName('');
      setSlug('');
      onOpenChange(false);
    } catch (error) {
      logger.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setSlug('');
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Company"
      description="Create a new company in the system."
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Create Company"
      submitDisabled={loading || !name.trim() || !slug.trim()}
      loading={loading}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter company name"
          />
        </div>
        <div>
          <Label htmlFor="company-slug">Company Slug</Label>
          <Input
            id="company-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="company-slug"
          />
        </div>
      </div>
    </BaseModal>
  );
};
