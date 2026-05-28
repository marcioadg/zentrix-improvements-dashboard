import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { InsightsCandidatePicker, InsightsCandidate } from '@/components/modals/user-profile/InsightsCandidatePicker';
import { InsightsMiniChart } from '@/components/modals/user-profile/InsightsMiniChart';
import { RoleActivitySection } from './RoleActivitySection';
import { MultiUserSelector } from './MultiUserSelector';
import { useOrgChartOptimized } from '@/hooks/useOrgChartOptimized';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { useSettings } from '@/contexts/SettingsContext';
import { PersonalityColorSelector } from '@/components/shared/PersonalityColorSelector';
import { logger } from '@/utils/logger';

// Helper to split on newlines and trim with robust null/undefined handling
function parseResponsibilities(str: string | null | undefined): string[] {
  logger.log('📝 parseResponsibilities input:', { str, type: typeof str, isNull: str === null, isUndefined: str === undefined });
  if (!str || typeof str !== 'string' || str.trim() === '') return [];
  const result = str.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  logger.log('📝 parseResponsibilities output:', result);
  return result;
}

// Helper to join array into string for db
function serializeResponsibilities(arr: string[]): string {
  if (!Array.isArray(arr)) return '';
  const result = arr.map(s => s?.trim()).filter(Boolean).join('\n');
  logger.log('📝 serializeResponsibilities input:', arr, 'output:', result);
  return result;
}

interface RoleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId?: string | null;
  parentRoleId?: string | null;
  roles: any[]; // Pass roles as props instead of fetching inside modal
  onSave: (roleData: any) => Promise<void>;
  onDelete?: (roleId: string) => Promise<void>;
}

export const RoleConfigModal: React.FC<RoleConfigModalProps> = ({
  isOpen,
  onClose,
  roleId,
  parentRoleId,
  roles, // Use roles from props
  onSave,
  onDelete
}) => {
  const { profilesLoading } = useOrgChartOptimized(); // Only get profilesLoading
  const { currentCompany } = useMultiCompanyAccess();
  
  const [formData, setFormData] = useState({
    title: '',
    responsibilities: [] as string[],
    assigned_user_ids: [] as string[],
    reports_to_role_id: parentRoleId || null,
    personality_color: 'green' as 'red' | 'yellow' | 'green' | 'blue',
    image_url: '',
  });
  
  const [newResponsibility, setNewResponsibility] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedInsightsCandidate, setSelectedInsightsCandidate] = useState<InsightsCandidate | null>(null);
  
  // Track if user has made local edits to prevent re-initialization on tab switch
  const isDirtyRef = useRef(false);
  // Track the roleId that was used to initialize the form
  const initializedRoleIdRef = useRef<string | null>(null);

  // Debug logs at the very top of component render
  logger.log('🔵 RoleConfigModal: RENDERING with props:', { 
    isOpen, 
    roleId, 
    parentRoleId, 
    rolesCount: roles?.length || 0 
  });
  
  if (isOpen) {
    logger.log('🔵 RoleConfigModal: Modal is OPEN, roles data:', 
      roles?.map(r => ({ id: r.id, title: r.title, responsibilities: r.responsibilities }))
    );
  }
  
  // Force re-compute currentRole when roles data changes (fixes stale data issue)
  const currentRole = useMemo(() => {
    if (!roleId) return null;
    const role = roles.find(r => r.id === roleId);
    if (role) {
      logger.log('🔍 RoleConfigModal: FRESH currentRole computed:', {
        id: role.id,
        title: role.title,
        responsibilities: role.responsibilities,
        timestamp: Date.now()
      });
    }
    return role || null;
  }, [roleId, roles, roles.length]);
  
  if (isOpen && roleId) {
    logger.log('🔵 RoleConfigModal: Searching for role with ID:', roleId);
    logger.log('🔵 RoleConfigModal: Available role IDs:', roles.map(r => r.id));
    logger.log('🔵 RoleConfigModal: Found currentRole:', currentRole ? {
      id: currentRole.id,
      title: currentRole.title,
      responsibilities: currentRole.responsibilities,
      responsibilitiesType: typeof currentRole.responsibilities,
      assignments: currentRole.assignments,
      assignmentsLength: currentRole.assignments?.length || 0
    } : 'NOT FOUND');
    
    // Extra debugging for data validation
    if (currentRole) {
      logger.log('🔵 RoleConfigModal: Current role full data:', JSON.stringify(currentRole, null, 2));
    }
  }
  
  const isEditing = !!roleId;

  // Check if role has subordinates
  const hasSubordinates = isEditing && roleId ? roles.some(r => r.reports_to_role_id === roleId) : false;

  // Reset form data immediately when roleId changes to prevent stale data flash
  useEffect(() => {
    if (isOpen && roleId && initializedRoleIdRef.current !== roleId) {
      // Different role selected — reset form to prevent showing old role's data
      setFormData({
        title: '',
        responsibilities: [],
        assigned_user_ids: [],
        reports_to_role_id: parentRoleId || null,
        personality_color: 'green',
        image_url: '',
      });
      setImageFile(null);
      setImagePreview(null);
      setSelectedInsightsCandidate(null);
      isDirtyRef.current = false;
    }
  }, [isOpen, roleId, parentRoleId]);

  // Force refresh when modal opens to ensure fresh data
  useEffect(() => {
    logger.log('🔄 RoleConfigModal useEffect triggered:', { 
      isOpen,
      isEditing, 
      roleId,
      hasCurrentRole: !!currentRole, 
      parentRoleId,
      rolesLength: roles.length 
    });
    
    if (!isOpen) {
      // Reset ALL transient state when modal closes to prevent stale disabled buttons
      isDirtyRef.current = false;
      initializedRoleIdRef.current = null;
      setFormData({
        title: '',
        responsibilities: [],
        assigned_user_ids: [],
        reports_to_role_id: null,
        personality_color: 'green',
        image_url: '',
      });
      setIsDeleting(false);
      setIsSaving(false);
      setShowDeleteConfirm(false);
      setError(null);
      setImageFile(null);
      setImagePreview(null);
      setSelectedInsightsCandidate(null);
      return;
    }
    
    setError(null);
    
    if (isEditing && roleId) {
      // Skip re-initialization if user has unsaved edits for the same role
      if (isDirtyRef.current && initializedRoleIdRef.current === roleId) {
        logger.log('🔒 RoleConfigModal: Skipping re-initialization, user has unsaved edits');
        return;
      }
      
      // Wait a moment for roles to be fully loaded
      const initializeEditForm = () => {
        const foundRole = roles.find(r => r.id === roleId);
        logger.log('🔍 RoleConfigModal: Looking for role ID:', roleId);
        logger.log('🔍 RoleConfigModal: Available roles:', roles.map(r => ({ id: r.id, title: r.title })));
        logger.log('🔍 RoleConfigModal: Found role:', foundRole);
        
        if (foundRole) {
          logger.log('🔍 RoleConfigModal: Raw role data from database:', {
            id: foundRole.id,
            title: foundRole.title,
            responsibilities: foundRole.responsibilities,
            responsibilitiesType: typeof foundRole.responsibilities,
            responsibilitiesLength: foundRole.responsibilities?.length || 0,
            assignments: foundRole.assignments,
            reports_to_role_id: foundRole.reports_to_role_id
          });
          
          // Robust data extraction with proper fallbacks
          const safeTitle = foundRole.title || '';
          const safeResponsibilities = parseResponsibilities(foundRole.responsibilities);
          const safeAssignments = Array.isArray(foundRole.assignments) ? foundRole.assignments : [];
          const assignedUserIds = safeAssignments.map(a => a?.user_id).filter(Boolean) || [];
          const safeReportsTo = foundRole.reports_to_role_id || null;
          
          logger.log('🔍 RoleConfigModal: Processed form data before setting:', {
            title: safeTitle,
            responsibilities: safeResponsibilities,
            assigned_user_ids: assignedUserIds,
            reports_to_role_id: safeReportsTo,
          });
          
          const safeImageUrl = foundRole.image_url || '';
          const newFormData = {
            title: safeTitle,
            responsibilities: safeResponsibilities,
            assigned_user_ids: assignedUserIds,
            reports_to_role_id: safeReportsTo,
            personality_color: (foundRole.personality_color as 'red' | 'yellow' | 'green' | 'blue') || 'green',
            image_url: safeImageUrl,
          };
          
          setFormData(newFormData);
          setImagePreview(safeImageUrl || null);
          setImageFile(null);
          setSelectedInsightsCandidate(null);
          isDirtyRef.current = false;
          initializedRoleIdRef.current = roleId;
          logger.log('✅ RoleConfigModal: Edit form data set successfully');
        } else {
          logger.log('❌ RoleConfigModal: Role not found in roles array');
          // Try again after a short delay - roles might still be loading
          if (roles.length === 0) {
            logger.log('🔄 RoleConfigModal: Roles array empty, waiting for data...');
            setTimeout(initializeEditForm, 100);
          }
        }
      };
      
      initializeEditForm();
    } else if (!isEditing) {
      logger.log('🔍 RoleConfigModal: Setting form data for new role');
      const newRoleFormData = {
        title: '',
        responsibilities: [],
        assigned_user_ids: [],
        reports_to_role_id: parentRoleId || null,
        personality_color: 'green' as const,
        image_url: '',
      };
      setFormData(newRoleFormData);
      setImageFile(null);
      setImagePreview(null);
      setSelectedInsightsCandidate(null);
      isDirtyRef.current = false;
      initializedRoleIdRef.current = null;
      logger.log('✅ RoleConfigModal: New role form data set');
    }
    
    setNewResponsibility('');
  }, [isOpen, isEditing, roleId, parentRoleId, roles]);

  // Get available parent roles (exclude current role and its descendants to prevent cycles)
  const availableParentRoles = roles.filter(role => {
    if (!role.id) return false;
    if (isEditing && role.id === roleId) return false;
    
    // Prevent creating cycles by excluding descendants of current role
    if (isEditing && currentRole) {
      const isDescendant = (checkRole: any, ancestorId: string): boolean => {
        if (checkRole.reports_to_role_id === ancestorId) return true;
        const parent = roles.find(r => r.id === checkRole.reports_to_role_id);
        return parent ? isDescendant(parent, ancestorId) : false;
      };
      if (isDescendant(role, roleId)) return false;
    }
    
    return true;
  });

  const handleAddResponsibility = () => {
    if (newResponsibility.trim()) {
      isDirtyRef.current = true;
      setFormData(prev => ({
        ...prev,
        responsibilities: [...prev.responsibilities, newResponsibility.trim()]
      }));
      setNewResponsibility('');
    }
  };

  const handleRemoveResponsibility = (index: number) => {
    isDirtyRef.current = true;
    setFormData(prev => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index)
    }));
  };

  const handleEditResponsibility = (index: number, value: string) => {
    isDirtyRef.current = true;
    setFormData(prev => ({
      ...prev,
      responsibilities: prev.responsibilities.map((item, i) => i === index ? value : item)
    }));
  };

  const handleResponsibilityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddResponsibility();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !currentCompany) return null;
    setIsUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${currentCompany.id}/${roleId || 'new'}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('role-images')
        .upload(fileName, imageFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('role-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      logger.error('Image upload failed:', err);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isDeleting) return;

    setError(null);

    if (!formData.title.trim()) {
      setError('Role title is required');
      return;
    }

    if (!currentCompany) {
      setError('Please select a company first');
      return;
    }

    setIsSaving(true);

    try {
      const serializedResponsibilities = serializeResponsibilities(formData.responsibilities);
      logger.log('💾 Saving role data:', {
        title: formData.title.trim(),
        responsibilities: formData.responsibilities,
        serializedResponsibilities,
        assigned_user_ids: formData.assigned_user_ids
      });

      // Upload image if a new file was selected
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const roleData = {
        title: formData.title.trim(),
        responsibilities: serializedResponsibilities,
        reports_to_role_id: formData.reports_to_role_id,
        personality_color: formData.personality_color,
        company_id: currentCompany?.id,
        assigned_user_ids: formData.assigned_user_ids,
        intentional_assignment_update: true, // Explicitly flag assignment updates
        image_url: finalImageUrl || null,
        insights_candidate_id: selectedInsightsCandidate?.id || null,
        insights_scores: selectedInsightsCandidate?.scores || null,
      };

      await onSave(roleData);
      onClose();
    } catch (err: any) {
      logger.error('Error saving role:', err);
      setError(err.message || 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    // Prevent default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!roleId || !onDelete || isDeleting || isSaving) return;

    if (hasSubordinates) {
      setError('Cannot delete role with direct reports. Please reassign or delete subordinate roles first.');
      setShowDeleteConfirm(false);
      return;
    }

    // CRITICAL: Set deleting state FIRST
    setIsDeleting(true);
    setError(null);

    // Store roleId in a local variable to avoid closure issues
    const roleIdToDelete = roleId;

    // CRITICAL FIX: Close the AlertDialog FIRST before any async work
    // This prevents the Dialog/AlertDialog state conflict
    setShowDeleteConfirm(false);

    try {
      // Now perform the async delete operation
      await onDelete(roleIdToDelete);
      
      // Reset deleting state BEFORE closing to prevent stale state
      setIsDeleting(false);
      
      // Only close the parent modal AFTER successful deletion
      // Use setTimeout to ensure React has finished updating AlertDialog state
      setTimeout(() => {
        onClose();
      }, 0);
    } catch (err: any) {
      logger.error('Error deleting role:', err);
      setError(err.message || 'Failed to delete role');
      // Re-enable the delete button on error
      setIsDeleting(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Prevent closing while deleting to avoid state conflicts
        if (!open && isDeleting) {
          return;
        }
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className={cn(
        "sm:max-w-[600px] max-h-[90vh] overflow-y-auto border border-border bg-popover text-popover-foreground",
        "shadow-lg"
      )}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!currentCompany && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select a company from the company switcher before managing roles.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="title">Role Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => { isDirtyRef.current = true; setFormData(prev => ({ ...prev, title: e.target.value })); }}
              placeholder="e.g. Senior Software Engineer"
              disabled={isSaving || !currentCompany}
            />
          </div>

          <div>
            <Label htmlFor="assigned_users">Assigned People</Label>
            <MultiUserSelector
              value={formData.assigned_user_ids}
              onValueChange={(value) => { isDirtyRef.current = true; setFormData(prev => ({ ...prev, assigned_user_ids: value })); }}
              disabled={isSaving || !currentCompany}
            />
          </div>

          <div>
            <Label htmlFor="parent_role">Reports To</Label>
            <Select
              value={formData.reports_to_role_id || 'none'}
              onValueChange={(value) => { isDirtyRef.current = true; setFormData(prev => ({
                ...prev,
                reports_to_role_id: value === 'none' ? null : value
              })); }}
              disabled={isSaving || !currentCompany}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-lg">
                <SelectItem value="none">No direct manager (Top level)</SelectItem>
                {availableParentRoles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableParentRoles.length === 0 && roles.length > 0 && (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>No valid parent roles available</span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="personality_color">Personality Color</Label>
            <PersonalityColorSelector
              selectedColor={formData.personality_color}
              onColorChange={(color) => { isDirtyRef.current = true; setFormData(prev => ({
                ...prev,
                personality_color: color
              })); }}
              disabled={isSaving || !currentCompany}
            />
          </div>

          {/* Personality Profile Image Upload */}
          <div>
            <Label>Personality Profile Image</Label>
            <div className="mt-1 flex items-start gap-3">
              {imagePreview ? (
                <div className="relative w-16 h-16 flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Personality profile"
                    className="w-16 h-16 rounded-md object-cover border border-border"
                  />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-background border border-border rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={handleRemoveImage}
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <label htmlFor="role-image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 cursor-pointer"
                    disabled={isSaving || isUploadingImage || !currentCompany}
                    asChild
                  >
                    <span>
                      {isUploadingImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </span>
                  </Button>
                </label>
                <input
                  id="role-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={isSaving || isUploadingImage || !currentCompany}
                />
                <span className="text-xs text-muted-foreground">Max 5MB</span>
              </div>
            </div>
          </div>

          {/* From Insights Candidate Picker */}
          <div>
            <Label>From Insights</Label>
            <div className="mt-1 flex flex-col gap-2">
              <InsightsCandidatePicker
                onSelect={(c) => setSelectedInsightsCandidate(c)}
                disabled={isSaving || !currentCompany}
              />
              {selectedInsightsCandidate && (
                <div className="flex flex-col gap-1 max-w-[220px] p-2 border border-border rounded-md bg-muted/30">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-foreground truncate flex-1">
                      {selectedInsightsCandidate.full_name}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                      onClick={() => setSelectedInsightsCandidate(null)}
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <InsightsMiniChart scores={selectedInsightsCandidate.scores} />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="responsibilities">Responsibilities</Label>
            <div>
              {/* Show empty state message when no responsibilities */}
              {formData.responsibilities.length === 0 && (
                <div className="text-sm text-muted-foreground mb-2 p-3 border border-dashed rounded-md text-center">
                  No responsibilities added yet. Add some below.
                </div>
              )}
              
              {/* Dynamic responsibilities list */}
              {formData.responsibilities.map((item, idx) => (
                <div key={idx} className="flex items-center mb-2">
                  <Input
                    value={item}
                    onChange={e => handleEditResponsibility(idx, e.target.value)}
                    className="mr-2 flex-1"
                    placeholder={`Responsibility #${idx + 1}`}
                    disabled={isSaving || !currentCompany}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleRemoveResponsibility(idx)}
                    disabled={isSaving || !currentCompany}
                    aria-label="Delete responsibility"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {/* Add new responsibility input */}
              <div className="flex items-center">
                <Input
                  value={newResponsibility}
                  onChange={e => setNewResponsibility(e.target.value)}
                  onKeyDown={handleResponsibilityKeyDown}
                  placeholder="Add a responsibility..."
                  disabled={isSaving || !currentCompany}
                  className="mr-2 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddResponsibility}
                  disabled={!newResponsibility.trim() || isSaving || !currentCompany}
                  aria-label="Add responsibility"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1 ml-1">
                Press <kbd>Enter</kbd> or <span className="text-primary">+</span> to add.
              </div>
            </div>
          </div>

          {/* Activities Section - Only show when editing existing roles */}
          {isEditing && roleId && (
            <div className="border-t pt-4">
              <RoleActivitySection roleId={roleId} />
            </div>
          )}

          <div className="flex justify-between pt-4">
            {/* Delete button on the left */}
            <div>
              {isEditing && onDelete && (
          <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => {
                    // Only allow closing if not in the middle of deleting
                    if (!isDeleting) {
                      setShowDeleteConfirm(open);
                    }
                  }}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isSaving || isDeleting || !currentCompany}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Role
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Role</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{currentRole?.title}"? This action cannot be undone.
                        {hasSubordinates && (
                          <div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded">
                            <div className="flex items-center gap-2 text-warning">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">Warning:</span>
                            </div>
                            <p className="text-sm text-warning mt-1">
                              This role has direct reports. You must reassign or delete subordinate roles first.
                            </p>
                          </div>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || hasSubordinates}
                        className="bg-destructive hover:bg-red-700"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Role'
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Cancel and Save buttons on the right */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving || isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isDeleting || !currentCompany || !formData.title.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Role' : 'Create Role'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
