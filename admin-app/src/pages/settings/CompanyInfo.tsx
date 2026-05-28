
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Upload, X, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export const CompanyInfo = () => {
  const { profile, loading } = useProfile();
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Seed logo from currentCompany (profiles table has no company FK)
  useEffect(() => {
    if (currentCompany?.logo_url !== undefined) {
      setLogoUrl(currentCompany.logo_url ?? null);
    }
  }, [currentCompany?.logo_url]);

  const companyId = currentCompany?.id;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (!companyId) {
      toast({ title: 'Error', description: 'No company found for your account', variant: 'destructive' });
      return;
    }

    const file = e.target.files[0];

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 2MB', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `companies/${companyId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', companyId);

      if (dbError) throw dbError;

      setLogoUrl(publicUrl);
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });

      toast({ title: 'Success', description: 'Company logo updated' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Allow re-selecting the same file
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!companyId || !logoUrl) return;

    setUploading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', companyId);

      if (error) throw error;

      setLogoUrl(null);
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });

      toast({ title: 'Success', description: 'Company logo removed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove logo', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Company Information</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company profile and information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            Update your company information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Company Logo */}
          <div className="space-y-3">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {loading ? (
                  <div className="h-20 w-20 rounded-lg border-2 border-border flex items-center justify-center bg-muted">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  </div>
                ) : logoUrl ? (
                  <div className="relative group">
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="h-20 w-20 rounded-lg object-cover border-2 border-border"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      disabled={uploading}
                      className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity disabled:opacity-50"
                      aria-label="Remove logo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="company-logo-upload"
                />
                <Label htmlFor="company-logo-upload" className="cursor-pointer">
                  <Button type="button" disabled={uploading} asChild variant="outline">
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </span>
                  </Button>
                </Label>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP or SVG. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Company Name + Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                defaultValue={profile?.company?.name || ''}
                placeholder="Enter company name"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">Company Slug</Label>
              <Input
                id="company-slug"
                defaultValue={profile?.company?.slug || ''}
                placeholder="Enter company slug"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-description">Description</Label>
            <Textarea
              id="company-description"
              placeholder="Enter company description"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyInfo;
