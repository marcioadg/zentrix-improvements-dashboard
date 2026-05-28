
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMultiCompany } from "@/contexts/MultiCompanyContext";
import { filterGeneralTeam } from '@/utils/teamFilters';

export function useTeamsList() {
  const { currentCompany } = useMultiCompany();
  const [teams, setTeams] = useState([]);
  
  useEffect(() => {
    if (!currentCompany?.id) {
      setTeams([]);
      return;
    }
    
    (async () => {
      let { data, error } = await supabase
        .from("teams")
        .select("id, name, company_id")
        .eq("company_id", currentCompany?.id)
        .order("name");
      setTeams(filterGeneralTeam(data || []));
    })();
  }, [currentCompany?.id]);
  
  return { teams };
}
