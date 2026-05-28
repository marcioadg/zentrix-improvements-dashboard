
import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Users, Camera, Upload, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { CompanyUser } from '@/types/companyUser';
import { RoleSelector } from '@/components/shared/RoleSelector';
import { PersonalityColorSelector } from '@/components/shared/PersonalityColorSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { InsightsCandidatePicker, InsightsCandidate } from './InsightsCandidatePicker';
import { InsightsMiniChart } from './InsightsMiniChart';

interface UserProfileHeaderProps {
  user: CompanyUser;
  isEditing: boolean;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  loading: boolean;
  canEditPersonality?: boolean; // Can edit personality profile chart (manager+)
  isOwnProfile?: boolean; // Is this the current user's own profile
  selectedImageUrl?: string | null; // Current selected image URL
  onImageUrlChange?: (url: string | null) => void; // Callback for image URL change
  selectedPersonalityColor?: 'red' | 'yellow' | 'green' | 'blue' | null;
  onPersonalityColorChange?: (color: 'red' | 'yellow' | 'green' | 'blue' | null) => void;
  selectedInsightsCandidate?: InsightsCandidate | null;
  onInsightsCandidateChange?: (candidate: InsightsCandidate | null) => void;
}

const getAccessTypeDisplay = (accessType?: string) => {
  switch (accessType) {
    case 'direct':
      return {
        icon: Building,
        label: 'Company Member',
        color: 'bg-primary/10 text-primary',
        description: 'Has direct access to the company'
      };
    case 'team_member':
      return {
        icon: Users,
        label: 'Team Member',
        color: 'bg-success/10 text-success',
        description: 'Access granted through team membership'
      };
    default:
      return {
        icon: Building,
        label: 'Member',
        color: 'bg-muted text-muted-foreground',
        description: 'Company member'
      };
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'owner':
      return 'bg-warning/10 text-warning';
    case 'manager':
      return 'bg-primary/10 text-primary';
    case 'super_admin':
      return 'bg-secondary text-secondary-foreground';
    case 'inactive':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  isEditing,
  selectedRole,
  onRoleChange,
  loading,
  canEditPersonality = false,
  isOwnProfile = false,
  selectedPersonalityColor,
  onPersonalityColorChange,
  selectedImageUrl,
  onImageUrlChange,
  selectedInsightsCandidate,
  onInsightsCandidateChange,
}) => {
  const { user: currentUser } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    selectedImageUrl !== undefined ? selectedImageUrl : (user.image_url || null)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accessDisplay = getAccessTypeDisplay(user.access_type);
  const AccessIcon = accessDisplay.icon;
  
  // Only allow avatar editing if this is the current user's profile
  const isCurrentUser = currentUser?.id === user.id;

  // Update image preview when selectedImageUrl or user.image_url changes
  useEffect(() => {
    const imageUrl = selectedImageUrl !== undefined ? selectedImageUrl : (user.image_url || null);
    setImagePreview(imageUrl);
  }, [selectedImageUrl, user.image_url]);

  // Handler for image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image file size must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
          variant: "destructive"
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload image
      uploadImage(file);
    }
  };

  // Upload image to storage and update via callback (not directly to DB)
  const uploadImage = async (file: File) => {
    if (!currentCompany || !user.id) return;

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentCompany?.id}/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('role-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('role-images')
        .getPublicUrl(filePath);

      // Update preview immediately
      setImagePreview(data.publicUrl);
      
      // Notify parent via callback instead of saving directly
      if (onImageUrlChange) {
        onImageUrlChange(data.publicUrl);
      }
    } catch (err: any) {
      logger.error('Error uploading image:', err);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      const fallbackUrl = selectedImageUrl !== undefined ? selectedImageUrl : (user.image_url || null);
      setImagePreview(fallbackUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handler to remove image - now uses callback
  const handleRemoveImage = () => {
    setImagePreview(null);
    if (onImageUrlChange) {
      onImageUrlChange(null);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isEditing ? (
        <RoleSelector
          selectedRole={selectedRole}
          onRoleChange={onRoleChange}
          disabled={loading}
          className="w-auto"
        />
      ) : (
        <Badge className={`text-sm ${getRoleColor(user.role)}`}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </Badge>
      )}
      <Badge 
        variant="outline" 
        className={`text-sm flex items-center gap-1 ${accessDisplay.color}`}
      >
        <AccessIcon className="h-3 w-3" />
        {accessDisplay.label}
      </Badge>
      
      {/* Personality Profile Chart Upload - Show for manager+ or own profile */}
      {(canEditPersonality || isOwnProfile) && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isUploadingImage || loading}
                />
                {imagePreview ? (
                  <div className="relative group">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 gap-1.5 border-border hover:border-primary/50 bg-background"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage || loading}
                    >
                      <div className="relative h-4 w-4 flex-shrink-0">
                        <img 
                          src={imagePreview} 
                          alt="Personality Profile" 
                          className="h-full w-full object-cover rounded border border-border/50" 
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">Profile Chart</span>
                      {isUploadingImage && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </Button>
                    <button
                      type="button"
                      className="absolute top-0 right-0 h-5 w-5 rounded-full bg-background/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/80 z-10 flex items-center justify-center p-0 border-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                      disabled={isUploadingImage || loading}
                      title="Remove image"
                    >
                      <X className="h-3 w-3 text-muted-foreground/70 group-hover:text-foreground" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 gap-1.5 border-border hover:border-primary/50 bg-background"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage || loading}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">Profile Chart</span>
                    {isUploadingImage && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {imagePreview 
                  ? "Click to change personality profile chart image" 
                  : "Upload personality profile chart image (max 5MB)"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* From Insights — show for manager+ or own profile */}
      {(canEditPersonality || isOwnProfile) && (
        <div className="flex flex-col gap-1">
          <InsightsCandidatePicker
            onSelect={c => onInsightsCandidateChange?.(c)}
            disabled={false}
          />
          {selectedInsightsCandidate && (
            <div className="flex flex-col gap-1 max-w-[180px]">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground truncate flex-1">
                  {selectedInsightsCandidate.full_name}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onInsightsCandidateChange?.(null)}
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <InsightsMiniChart scores={selectedInsightsCandidate.scores} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
