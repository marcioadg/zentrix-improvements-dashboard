
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export function useProcessCompletion(pageIds: string[]) {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const userId = profile?.id || null;

  // Fetch completions for current user over all pageIds
  const { data: completions = [], isLoading } = useQuery({
    queryKey: ["process_page_completions", userId],
    queryFn: async () => {
      if (!userId || !pageIds.length) return [];
      const { data, error } = await supabase
        .from("process_page_completion")
        .select("page_id, completed_at")
        .eq("user_id", userId)
        .in("page_id", pageIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && pageIds.length > 0,
  });

  const completedPageIds: string[] =
    completions.map((c: { page_id: string }) => c.page_id);

  // Mark as complete
  const { mutateAsync: markComplete, isPending: isMarking } = useMutation({
    mutationFn: async (pageId: string) => {
      if (!userId) throw new Error("No user");
      const { error } = await supabase
        .from("process_page_completion")
        .insert([{ user_id: userId, page_id: pageId }]);
      if (error && !error.message.includes("duplicate key")) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["process_page_completions", userId] }),
  });

  // Unmark completion
  const { mutateAsync: unmarkComplete, isPending: isUnmarking } = useMutation({
    mutationFn: async (pageId: string) => {
      if (!userId) throw new Error("No user");
      const { error } = await supabase
        .from("process_page_completion")
        .delete()
        .eq("user_id", userId)
        .eq("page_id", pageId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["process_page_completions", userId] }),
  });

  return {
    completedPageIds,
    isLoading,
    markComplete,
    unmarkComplete,
    isMarking,
    isUnmarking,
  };
}
