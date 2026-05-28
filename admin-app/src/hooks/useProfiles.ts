
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Added avatar_url to the profile interface and database query!
export interface ProfileSimple {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
}

export function useProfiles() {
  const queryClient = useQueryClient();

  // Retrieve all profiles including inactive users (needed for metric ownership display)
  const { data: profiles = [], isLoading } = useQuery<ProfileSimple[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role");
      if (error) throw error;
      return (data || []) as ProfileSimple[];
    },
    staleTime: 60 * 1000, // profiles need to be relatively fresh for team views
    refetchOnWindowFocus: false,
  });

  // Realtime listener: invalidate cache when new profiles are inserted
  useEffect(() => {
    const channel = supabase
      .channel("profiles-new-members")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["profiles"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { profiles, isLoading };
}
