import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useMultiCompanyAccess } from "@/hooks/useMultiCompanyAccess";

export type Permissions = {
  view: string[];
  edit: string[];
} | null;

type PagePatch = Partial<{
  title: string;
  content_blocks: any[];
  folder_id?: string | null;
  status: string;
  permissions: Permissions;
  updated_by: string;
  display_order: number;
  visibility_type?: string;
  emoji?: string | null;
}>;

export type WikiPage = {
  id: string;
  title: string;
  content_blocks: any[];
  folder_id?: string | null;
  status: string;
  permissions: Permissions;
  updated_by: string;
  display_order: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  visibility_type?: string;
  archived?: boolean;
  archived_at?: string | null;
  deleted_at?: string | null;
  emoji?: string | null; // <-- Added for emoji support
  company_id?: string;
  category?: string; // Add category field
};

export function useWikiPages() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompanyAccess();

  function parsePage(row: any): WikiPage {
    let content_blocks = [];
    if (typeof row.content_blocks === "string") {
      try { content_blocks = JSON.parse(row.content_blocks); if (!Array.isArray(content_blocks)) content_blocks = []; } catch { content_blocks = []; }
    } else if (Array.isArray(row.content_blocks)) { content_blocks = row.content_blocks; }
    let permissions: Permissions = null;
    if (typeof row.permissions === "string") {
      try { permissions = JSON.parse(row.permissions); } catch { permissions = null; }
    } else if (row.permissions && typeof row.permissions === "object") { permissions = row.permissions; }
    return {
      ...row,
      content_blocks,
      permissions,
      visibility_type: row.visibility_type || "people",
      archived: !!row.archived,
      archived_at: row.archived_at || null,
      deleted_at: row.deleted_at || null,
      emoji: row.emoji || null,
      category: row.category || null,
    };
  }

  // --- Only load once currentCompany is ready ---
  const ready = !!currentCompany?.id;

  // --- React Query: company scoped queryKey and company_id filter ---
  const { data: pagesRaw = [], isLoading } = useQuery({
    queryKey: ["wiki_pages", currentCompany?.id],
    queryFn: async () => {
      if (!ready) return [];
      const { data, error } = await supabase
        .from("wiki_pages")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(parsePage);
    },
    enabled: ready,
  });

  // Only include non-deleted unless explicitly desired
  const pages: WikiPage[] = pagesRaw.filter((p: any) => !p.deleted_at);

  // --- Create page: set company_id & company-aware optimistic update ---
  const { mutateAsync: createPage } = useMutation({
    mutationFn: async (page: { title: string; folder_id?: string | null; category?: string }) => {
      const currentMaxOrder = pages?.length ? pages[pages.length - 1].display_order ?? 0 : 0;
      // Optimistic id
      const tempId = `temp-${crypto.randomUUID()}`;
      // Use tempId for optimistic update
      const optimisticPage = {
        id: tempId,
        title: page.title,
        folder_id: page.folder_id ?? null,
        category: page.category ?? null,
        content_blocks: [],
        created_by: profile?.id,
        updated_by: profile?.id,
        display_order: currentMaxOrder + 1,
        status: "draft",
        permissions: null,
        visibility_type: "people",
        archived: false,
        archived_at: null,
        deleted_at: null,
        emoji: null,
        company_id: currentCompany?.id, // <-- company_id added
      };
      // Add to the cache optimistically
      queryClient.setQueryData(["wiki_pages", currentCompany?.id], (prev: any) =>
        prev ? [...prev, optimisticPage] : [optimisticPage]
      );
      // Now do the actual API call
      const { data, error } = await supabase
        .from("wiki_pages")
        .insert({
          title: page.title,
          folder_id: page.folder_id ?? null,
          category: page.category ?? null,
          created_by: profile?.id,
          updated_by: profile?.id,
          display_order: currentMaxOrder + 1,
          company_id: currentCompany?.id, // Set company!
        })
        .select();
      if (error) {
        // Remove optimistic page if error
        queryClient.setQueryData(["wiki_pages", currentCompany?.id], (prev: any) =>
          prev ? prev.filter((p: any) => p.id !== tempId) : []
        );
        throw error;
      }
      // Swap optimistic id with real one
      const realPage = data?.[0] ? parsePage(data[0]) : undefined;
      if (realPage) {
        queryClient.setQueryData(["wiki_pages", currentCompany?.id], (prev: any) =>
          prev
            ? prev.map((p: any) =>
                p.id === tempId ? realPage : p
              )
            : []
        );
      }
      return realPage;
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
  });

  // --- Other mutations: always refetch by company-aware queryKey ---
  const { mutateAsync: renamePage } = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const { error } = await supabase
        .from("wiki_pages")
        .update({ title: newName })
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
  });

  const { mutateAsync: updatePage } = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PagePatch }) => {
      const updateObj: any = { ...patch };
      if (updateObj.content_blocks) {
        updateObj.content_blocks = JSON.stringify(updateObj.content_blocks);
      }
      if (updateObj.permissions) {
        updateObj.permissions = JSON.stringify(updateObj.permissions);
      }
      const { error } = await supabase
        .from("wiki_pages")
        .update(updateObj)
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
  });

  const { mutateAsync: updatePagesOrder } = useMutation({
    mutationFn: async (newOrder: string[]) => {
      const updates = newOrder.map((id, idx) =>
        supabase.from("wiki_pages").update({ display_order: idx }).eq("id", id).eq("company_id", currentCompany?.id)
      );
      const results = await Promise.all(updates.map(q => q));
      for (const res of results) {
        if (res.error) throw res.error;
      }
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
  });

  // ARCHIVE/RESTORE/DELETE/Permissions: add company_id filter on all relevant supabase calls
  const { mutateAsync: archivePage } = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("wiki_pages")
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["wiki_pages", currentCompany?.id] });
      const previousPages = queryClient.getQueryData(["wiki_pages", currentCompany?.id]);
      queryClient.setQueryData(["wiki_pages", currentCompany?.id], (old: any[]) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === id
            ? { ...p, archived: true, archived_at: new Date().toISOString() }
            : p
        );
      });
      return { previousPages };
    },
    onError: (err, { id }, context: any) => {
      if (context?.previousPages) {
        queryClient.setQueryData(["wiki_pages", currentCompany?.id], context.previousPages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] });
    },
  });

  const { mutateAsync: restorePage } = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("wiki_pages")
        .update({ archived: false, archived_at: null })
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["wiki_pages", currentCompany?.id] });
      const previousPages = queryClient.getQueryData(["wiki_pages", currentCompany?.id]);
      queryClient.setQueryData(["wiki_pages", currentCompany?.id], (old: any[]) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === id
            ? { ...p, archived: false, archived_at: null }
            : p
        );
      });
      return { previousPages };
    },
    onError: (err, { id }, context: any) => {
      if (context?.previousPages) {
        queryClient.setQueryData(["wiki_pages", currentCompany?.id], context.previousPages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] });
    },
  });

  const { mutateAsync: deletePage } = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("wiki_pages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
  });

  // Permission check helper
  function canDeleteProcess(role: string | undefined) {
    return role === "super_admin" || role === "director" || role === "manager";
  }

  // --- Optimistic update for permissions ---
  const { mutateAsync: setPagePermissions } = useMutation({
    mutationFn: async ({ id, permissions, visibilityType = "people" }: { id: string; permissions: Permissions, visibilityType?: string }) => {
      // Optimistic UI: update cache immediately
      const prevPages = queryClient.getQueryData(["wiki_pages", currentCompany?.id]);
      queryClient.setQueryData(["wiki_pages", currentCompany?.id], (oldPages: any[] = []) => (
        oldPages.map(p =>
          p.id === id
            ? { ...p, permissions, visibility_type: visibilityType }
            : p
        )
      ));

      try {
        const { error } = await supabase
          .from("wiki_pages")
          .update({ permissions: JSON.stringify(permissions), visibility_type: visibilityType })
          .eq("id", id)
          .eq("company_id", currentCompany?.id);
        if (error) throw error;

        // Remove team/role links if switching away
        if (visibilityType !== "teams") await supabase.from('wiki_page_team_visibility').delete().eq('wiki_page_id', id);
        if (visibilityType !== "roles") await supabase.from('wiki_page_role_visibility').delete().eq('wiki_page_id', id);
      } catch (err) {
        // Revert cache on error
        queryClient.setQueryData(["wiki_pages", currentCompany?.id], prevPages);
        throw err;
      }
    },
    onError: () =>
      queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
  });

  // --- Optimistic update for visibility + batch/bulk database ops ---
  const { mutateAsync: setPageVisibility } = useMutation({
    mutationFn: async ({ id, type, teams = [], positions = [] }: { id: string; type: string, teams?: string[], positions?: string[] }) => {
      // Optimistic UI: update cache immediately
      const prevPages = queryClient.getQueryData(["wiki_pages", currentCompany?.id]);
      queryClient.setQueryData(["wiki_pages", currentCompany?.id], (oldPages: any[] = []) => (
        oldPages.map(p =>
          p.id === id
            ? {
                ...p,
                visibility_type: type,
                permissions: null,
              }
            : p
        )
      ));
      try {
        if (type === "everyone") {
          await supabase.from("wiki_pages").update({ visibility_type: "everyone", permissions: null }).eq("id", id).eq("company_id", currentCompany?.id);
          await supabase.from('wiki_page_team_visibility').delete().eq('wiki_page_id', id);
          await supabase.from('wiki_page_role_visibility').delete().eq('wiki_page_id', id);
        } else if (type === "teams") {
          // Remove previous
          await supabase.from('wiki_page_team_visibility').delete().eq('wiki_page_id', id);
          // Bulk insert all selected teams (if any)
          if (teams.length) {
            await supabase.from('wiki_page_team_visibility').insert(
              teams.map(teamId => ({ wiki_page_id: id, team_id: teamId }))
            );
          }
          await supabase.from('wiki_page_role_visibility').delete().eq('wiki_page_id', id);
          await supabase.from("wiki_pages").update({ visibility_type: "teams", permissions: null }).eq("id", id).eq("company_id", currentCompany?.id);
        } else if (type === "roles") {
          await supabase.from('wiki_page_role_visibility').delete().eq('wiki_page_id', id);
          // Bulk insert positions (as positions, role field = "")
          if (positions.length) {
            await supabase.from('wiki_page_role_visibility').insert(
              positions.map(positionId => ({ wiki_page_id: id, position_id: positionId, role: "" }))
            );
          }
          await supabase.from('wiki_page_team_visibility').delete().eq('wiki_page_id', id);
          await supabase.from("wiki_pages").update({ visibility_type: "roles", permissions: null }).eq("id", id).eq("company_id", currentCompany?.id);
        }
      } catch (err) {
        // Revert cache on error
        queryClient.setQueryData(["wiki_pages", currentCompany?.id], prevPages);
        throw err;
      }
    },
    onError: () =>
      queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["wiki_pages", currentCompany?.id] }),
  });

  // Helper: is shared (unchanged)
  function isPageShared(page: WikiPage, userId: string | null) {
    if (!page.visibility_type || page.visibility_type === "people")
      return !!(page.permissions?.view?.some((id: string) => id !== userId) || page.permissions?.edit?.some((id: string) => id !== userId));
    if (page.visibility_type === "everyone") return true;
    if (page.visibility_type === "teams" || page.visibility_type === "roles") return true;
    return false;
  }

  return {
    pages,
    isLoading,
    createPage,
    renamePage,
    deletePage,
    updatePage,
    updatePagesOrder,
    archivePage,
    restorePage,
    setPagePermissions,
    setPageVisibility,
    isPageShared,
    canDeleteProcess,
  };
}
