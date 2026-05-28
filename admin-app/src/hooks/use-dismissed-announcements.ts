import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";

export function useDismissedAnnouncements() {
  return useQuery({
    queryKey: ["dismissed-announcements"],
    queryFn: async () => {
      logger.debug("Fetching dismissed announcements");
      const { data, error } = await supabase
        .from("dismissed_feature_announcements")
        .select("announcement_href");
      
      if (error) {
        logger.error("Error fetching dismissed announcements", { error: error.message });
        throw error;
      }
      
      const dismissedHrefs = data.map(item => item.announcement_href);
      logger.debug("Dismissed announcements loaded", { count: dismissedHrefs.length });
      return dismissedHrefs;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
}

export function useDismissAnnouncement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (announcementHref: string) => {
      logger.debug("Dismissing announcement");
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error("User not authenticated");
        throw new Error("User not authenticated");
      }
      
      const { data, error } = await supabase
        .from("dismissed_feature_announcements")
        .insert({
          announcement_href: announcementHref,
          user_id: user.id,
        })
        .select();
      
      if (error) {
        logger.error("Error dismissing announcement", { error: error.message });
        throw error;
      }
      
      logger.debug("Announcement dismissed successfully");
      return data;
    },
    onSuccess: (_, announcementHref) => {
      logger.debug("Updating cache for dismissed announcement");
      // Optimistically update the cache
      queryClient.setQueryData(["dismissed-announcements"], (old: string[] = []) => [
        ...old,
        announcementHref
      ]);
    },
    onError: (error) => {
      logger.error("Failed to dismiss announcement", { error: error.message });
    },
  });
}