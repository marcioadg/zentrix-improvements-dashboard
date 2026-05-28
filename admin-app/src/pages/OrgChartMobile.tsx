/**
 * OrgChartMobile — Mobile-only Org Chart page (/m/org-chart).
 *
 * Ships three visual variants in one bundle with an in-page switcher
 * (A · Hierarchy · default, B · Focus, C · Canvas). Last-chosen variant
 * is persisted per company in safeStorage.
 *
 * Data layer: uses useOrgChartOptimized — the SAME hook the desktop
 * OrgChart page uses (src/pages/OrgChart.tsx). Both reads (roles, profiles)
 * and writes (createRole, updateRole, deleteRole, moveRole) go through it.
 * Desktop's OrgChart.tsx and src/components/org-chart/* are untouched.
 *
 * Tables consumed (via the hook):
 *  - org_roles            — the role records
 *  - role_assignments     — many-to-many user ↔ role
 *  - profiles             — user info for avatars / names
 *  - company_members      — current-company filtering
 *
 * Mutation surface matches desktop's RoleConfigModal subset:
 *  - Create role  → createRole({ title, responsibilities, personality_color,
 *                                  reports_to_role_id })
 *  - Edit role    → updateRole(id, { ...same fields })
 *  - Move role    → moveRole(id, newParentId)
 *  - Delete role  → deleteRole(id)  (throws if role has direct reports —
 *                                    surfaced to the user as a toast)
 *
 * Assignment management is intentionally out-of-scope for v1 (matches the
 * recap PM signed off on). Roles render existing assignees read-only.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users, X } from 'lucide-react';
import { useOrgChartOptimized, OrgRole } from '@/hooks/useOrgChartOptimized';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { safeStorage } from '@/utils/safeStorage';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  MobileOrgHierarchyView,
  MobileOrgFocusView,
  MobileOrgCanvasView,
  MobileRoleDetailSheet,
  MobileEditRoleSheet,
  MobileMoveRolePicker,
  type EditRoleDraft,
} from '@/components/mobile/org-chart';

// ---------------------------------------------------------------------------
// Variant persistence
// ---------------------------------------------------------------------------

export type OrgChartVariant = 'A' | 'B' | 'C';

const STORAGE_KEY_PREFIX = 'mobile_org_chart_variant';
const DEFAULT_VARIANT: OrgChartVariant = 'A';

const storageKeyFor = (companyId: string | null | undefined) =>
  companyId ? `${STORAGE_KEY_PREFIX}_${companyId}` : STORAGE_KEY_PREFIX;

const loadVariant = (companyId: string | null | undefined): OrgChartVariant => {
  try {
    const raw = safeStorage.getItem(storageKeyFor(companyId));
    if (raw === 'A' || raw === 'B' || raw === 'C') return raw;
  } catch (e) {
    logger.warn('OrgChartMobile: failed to read persisted variant', e);
  }
  return DEFAULT_VARIANT;
};

const saveVariant = (companyId: string | null | undefined, v: OrgChartVariant) => {
  try {
    safeStorage.setItem(storageKeyFor(companyId), v);
  } catch (e) {
    logger.warn('OrgChartMobile: failed to persist variant', e);
  }
};

const VARIANT_LABELS: Record<OrgChartVariant, string> = {
  A: 'Hierarchy',
  B: 'Focus',
  C: 'Canvas',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OrgChartMobile: React.FC = () => {
  const { currentCompany } = useMultiCompany();
  const companyId = currentCompany?.id ?? null;
  const { toast } = useToast();

  const [variant, setVariant] = useState<OrgChartVariant>(() => loadVariant(companyId));
  const [searchTerm, setSearchTerm] = useState('');

  // Sheet / focused-role state. We keep these as ids (not roles) so they
  // stay valid across hook refetches.
  const [detailRoleId, setDetailRoleId] = useState<string | null>(null);
  const [focusedRoleId, setFocusedRoleId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [movingRoleId, setMovingRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingUnderParentId, setCreatingUnderParentId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Data layer — same hook desktop uses.
  const {
    roles,
    profiles,
    profilesLoading,
    isLoading,
    fetchError,
    createRole,
    updateRole,
    deleteRole,
    moveRole,
    fetchRoles,
  } = useOrgChartOptimized();

  // Reload variant when active company changes.
  useEffect(() => {
    setVariant(loadVariant(companyId));
  }, [companyId]);
  useEffect(() => {
    saveVariant(companyId, variant);
  }, [companyId, variant]);

  // Header counts (computed against the unfiltered roles set).
  const totals = useMemo(() => {
    const total = roles.length;
    const filled = roles.filter((r) => (r.assignments ?? []).length > 0).length;
    return { total, filled, unassigned: total - filled };
  }, [roles]);

  // Resolve role objects from ids — derived state so they re-resolve after refetch.
  const detailRole = useMemo<OrgRole | null>(
    () => (detailRoleId ? roles.find((r) => r.id === detailRoleId) ?? null : null),
    [roles, detailRoleId],
  );
  const editingRole = useMemo<OrgRole | null>(
    () => (editingRoleId ? roles.find((r) => r.id === editingRoleId) ?? null : null),
    [roles, editingRoleId],
  );
  const movingRole = useMemo<OrgRole | null>(
    () => (movingRoleId ? roles.find((r) => r.id === movingRoleId) ?? null : null),
    [roles, movingRoleId],
  );

  // When entering Focus mode without a target, fall back to the currently-
  // viewed detail role (continuity from A/C) or the first root.
  useEffect(() => {
    if (variant !== 'B') return;
    if (focusedRoleId && roles.some((r) => r.id === focusedRoleId)) return;
    const fallback = detailRoleId ?? roles.find((r) => !r.reports_to_role_id)?.id ?? roles[0]?.id ?? null;
    setFocusedRoleId(fallback);
  }, [variant, focusedRoleId, detailRoleId, roles]);

  // ---------------------------------------------------------------------
  // Mutation handlers — all wrapped to surface errors via toast.
  // ---------------------------------------------------------------------
  const handleCreateSave = async (draft: EditRoleDraft) => {
    setIsMutating(true);
    try {
      // Same payload shape desktop uses (RoleConfigModal.tsx:411-422).
      // The hook handles role_assignments for us when assigned_user_ids
      // is non-empty (useOrgChartOptimized.ts:387-413).
      await createRole({
        title: draft.title,
        responsibilities: draft.responsibilities,
        personality_color: draft.personality_color,
        reports_to_role_id: draft.reports_to_role_id,
        assigned_user_ids: draft.assigned_user_ids,
      });
      setIsCreating(false);
      setCreatingUnderParentId(null);
      toast({ title: 'Role created', description: draft.title });
    } catch (err) {
      logger.error('createRole failed', err);
      toast({
        title: 'Could not create role',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditSave = async (draft: EditRoleDraft) => {
    if (!editingRole) return;
    setIsMutating(true);
    try {
      // Same payload shape desktop uses (RoleConfigModal.tsx:411-422).
      // intentional_assignment_update tells the hook to diff & rewrite
      // role_assignments (useOrgChartOptimized.ts:464-510). Including
      // reports_to_role_id allows the user to reparent via this sheet
      // without going through the separate Move flow.
      await updateRole(editingRole.id, {
        title: draft.title,
        responsibilities: draft.responsibilities,
        personality_color: draft.personality_color,
        reports_to_role_id: draft.reports_to_role_id,
        assigned_user_ids: draft.assigned_user_ids,
        intentional_assignment_update: true,
      });
      setEditingRoleId(null);
      toast({ title: 'Role updated', description: draft.title });
    } catch (err) {
      logger.error('updateRole failed', err);
      toast({
        title: 'Could not save changes',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleMoveConfirm = async (newParentId: string | null) => {
    if (!movingRole) return;
    setIsMutating(true);
    try {
      await moveRole(movingRole.id, newParentId);
      setMovingRoleId(null);
      toast({
        title: 'Role moved',
        description: newParentId
          ? `New parent: ${roles.find((r) => r.id === newParentId)?.title ?? '—'}`
          : 'Now a root role',
      });
    } catch (err) {
      logger.error('moveRole failed', err);
      toast({
        title: 'Could not move role',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    // Match desktop's confirmation pattern — same wording prefix.
    if (!window.confirm(`Delete "${role.title}"? This cannot be undone.`)) return;
    setIsMutating(true);
    try {
      await deleteRole(roleId);
      if (detailRoleId === roleId) setDetailRoleId(null);
      if (focusedRoleId === roleId) setFocusedRoleId(null);
      if (editingRoleId === roleId) setEditingRoleId(null);
      toast({ title: 'Role deleted', description: role.title });
    } catch (err) {
      logger.error('deleteRole failed', err);
      toast({
        title: 'Could not delete role',
        description:
          err instanceof Error
            ? err.message
            : 'A role with direct reports must be reassigned first.',
        variant: 'destructive',
      });
    } finally {
      setIsMutating(false);
    }
  };

  // ---------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------
  const handleSelectRole = (roleId: string) => {
    if (variant === 'B') {
      setFocusedRoleId(roleId);
    } else {
      setDetailRoleId(roleId);
    }
  };

  const handleNavigateInsideDetail = (roleId: string) => {
    setDetailRoleId(roleId);
  };

  /**
   * Open the create-role flow with `parentRoleId` pre-selected as the new
   * role's parent. Closes any open detail/focus context first so the edit
   * sheet has the user's full attention.
   */
  const handleAddReport = (parentRoleId: string) => {
    setCreatingUnderParentId(parentRoleId);
    setDetailRoleId(null);
    setIsCreating(true);
  };

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-[max(env(safe-area-inset-top,20px),20px)] pb-3 bg-background">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-[8px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h1
              className="text-[22px] font-bold leading-[1.1] text-foreground"
              style={{ letterSpacing: '-0.3px' }}
            >
              Org Chart
            </h1>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              {totals.total} role{totals.total === 1 ? '' : 's'} · {totals.filled} filled ·{' '}
              {totals.unassigned} unassigned
            </span>
          </div>
        </div>

        {/* Variant switcher */}
        <div
          className="mt-3 flex bg-muted/60 rounded-[10px] p-0.5"
          role="tablist"
          aria-label="Org chart variant"
        >
          {(['A', 'B', 'C'] as OrgChartVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={variant === v}
              onClick={() => setVariant(v)}
              className={cn(
                'flex-1 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all duration-150',
                variant === v
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground active:scale-[0.97]',
              )}
            >
              {v} · {VARIANT_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Search (hidden in canvas variant to give more room to the canvas) */}
        {variant !== 'C' && (
          <div className="mt-3 flex items-center gap-2 h-10 px-3 bg-muted/60 rounded-[10px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search role or person…"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm('')}
                className="p-1"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-28">
        {isLoading && roles.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Loading org chart…
          </div>
        ) : fetchError ? (
          <div className="rounded-[10px] border border-destructive/30 bg-destructive/5 text-destructive text-[12px] px-3 py-2">
            Couldn't load the org chart. {fetchError}
            <button
              type="button"
              onClick={() => fetchRoles()}
              className="block mt-1.5 underline font-semibold"
            >
              Retry
            </button>
          </div>
        ) : roles.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No roles yet.
            <button
              type="button"
              onClick={() => {
                setCreatingUnderParentId(null);
                setIsCreating(true);
              }}
              className="block mx-auto mt-2 text-primary font-semibold"
            >
              Tap to add the first role.
            </button>
          </div>
        ) : variant === 'A' ? (
          <MobileOrgHierarchyView
            roles={roles}
            searchTerm={searchTerm}
            onSelectRole={handleSelectRole}
            onLongPressRole={(id) => setMovingRoleId(id)}
          />
        ) : variant === 'B' ? (
          <MobileOrgFocusView
            roles={roles}
            focusedRoleId={focusedRoleId}
            onFocusRole={setFocusedRoleId}
            onEdit={(id) => setEditingRoleId(id)}
            onMove={(id) => setMovingRoleId(id)}
            onDelete={handleDelete}
            onAddReport={handleAddReport}
          />
        ) : (
          <MobileOrgCanvasView roles={roles} onSelectRole={handleSelectRole} />
        )}
      </div>

      {/* Add-role FAB (above bottom nav) */}
      <button
        type="button"
        aria-label="Add role"
        onClick={() => {
          setCreatingUnderParentId(
            // If a role is currently focused/detailed, default the new role
            // to be a child of that one — mirrors the desktop "add child" UX.
            variant === 'B' ? focusedRoleId : detailRoleId,
          );
          setIsCreating(true);
        }}
        className={cn(
          'fixed right-4 bottom-[max(calc(env(safe-area-inset-bottom,0)+74px),80px)] z-20',
          'w-[52px] h-[52px] rounded-full bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'transition-transform duration-150 active:scale-95',
        )}
      >
        <Plus className="h-5 w-5" />
      </button>

      <MobileBottomNav />

      {/* Detail sheet — A & C */}
      <MobileRoleDetailSheet
        open={detailRoleId !== null && (variant === 'A' || variant === 'C')}
        onOpenChange={(open) => !open && setDetailRoleId(null)}
        role={detailRole}
        allRoles={roles}
        onNavigateToRole={handleNavigateInsideDetail}
        onEdit={(id) => {
          setEditingRoleId(id);
          // Close detail so the edit sheet has the user's full attention.
          setDetailRoleId(null);
        }}
        onMove={(id) => {
          setMovingRoleId(id);
          setDetailRoleId(null);
        }}
        onDelete={(id) => {
          handleDelete(id);
        }}
        onAddReport={handleAddReport}
      />

      {/* Edit sheet (also handles "create new" when role is null) */}
      <MobileEditRoleSheet
        open={editingRoleId !== null || isCreating}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRoleId(null);
            setIsCreating(false);
            setCreatingUnderParentId(null);
          }
        }}
        role={editingRole}
        allRoles={roles}
        profiles={profiles}
        profilesLoading={profilesLoading}
        defaultParentId={creatingUnderParentId}
        saving={isMutating}
        onSave={editingRole ? handleEditSave : handleCreateSave}
      />

      {/* Move picker */}
      <MobileMoveRolePicker
        open={movingRoleId !== null}
        onOpenChange={(open) => !open && setMovingRoleId(null)}
        role={movingRole}
        allRoles={roles}
        saving={isMutating}
        onMove={handleMoveConfirm}
      />
    </div>
  );
};

export default OrgChartMobile;
