import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useMultiCompanyAccess } from "@/hooks/useMultiCompanyAccess";

type Folder = {
  id: string;
  name: string;
  parent_folder_id?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export function useWikiFolders() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompanyAccess();

  // Fetch folders
  const ready = !!currentCompany?.id;

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["wiki_folders", currentCompany?.id],
    queryFn: async () => {
      if (!ready) return [];
      const { data, error } = await supabase
        .from("wiki_folders")
        .select("*")
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: ready,
  });

  // Create folder
  const { mutateAsync: createFolder } = useMutation({
    mutationFn: async (folder: { name: string; parent_folder_id?: string | null }) => {
      const { data, error } = await supabase
        .from("wiki_folders")
        .insert({
          name: folder.name,
          parent_folder_id: folder.parent_folder_id ?? null,
          created_by: profile?.id,
          company_id: currentCompany?.id, // Set company!
        })
        .select();
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki_folders", currentCompany?.id] }),
  });

  // Rename folder
  const { mutateAsync: renameFolder } = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      const { error } = await supabase
        .from("wiki_folders")
        .update({ name: newName })
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki_folders", currentCompany?.id] }),
  });

  // Delete folder
  const { mutateAsync: deleteFolder } = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from("wiki_folders")
        .delete()
        .eq("id", id)
        .eq("company_id", currentCompany?.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wiki_folders", currentCompany?.id] }),
  });

  return {
    folders,
    isLoading,
    createFolder,
    renameFolder,
    deleteFolder,
  };
}
