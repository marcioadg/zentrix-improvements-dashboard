
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMultiCompanyAccess } from "@/hooks/useMultiCompanyAccess";

export function useUserList() {
  const { currentCompany } = useMultiCompanyAccess();
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!currentCompany?.id) {
      setUsers([]);
      return;
    }
    (async () => {
      let { data, error } = await supabase
        .rpc("get_company_accessible_users", { 
          target_company_id: currentCompany?.id,
          include_inactive: false // Exclude inactive users from regular list operations
        });
      setUsers(data || []);
    })();
  }, [currentCompany?.id]);
  return { users };
}
