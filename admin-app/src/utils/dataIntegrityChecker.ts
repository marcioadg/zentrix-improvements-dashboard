
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

/**
 * Checks consistency between the user's primary company in profiles
 * and their company_memberships.
 *
 * Logs inconsistencies to the console.
 */
export async function checkProfileCompanyConsistency(userId: string) {
  // Fetch profile row (legacy source of truth)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id, role, email, full_name")
    .eq("id", userId)
    .single();

  // Fetch company_memberships rows
  const { data: memberships, error: memberError } = await supabase
    .from("company_members")
    .select("company_id, permission_level")
    .eq("user_id", userId);

  if (profileError || memberError) {
    logger.warn("[DataValidation] Error loading user data:", profileError, memberError);
    return true; // don't break—cannot validate
  }

  const legacyCompanyId = profile?.company_id ?? null;
  const membershipCompanyIds = memberships?.map((m) => m.company_id) ?? [];

  // Check if legacy profile.company_id exists in company_memberships
  if (legacyCompanyId && !membershipCompanyIds.includes(legacyCompanyId)) {
    logger.warn(
      `[DataValidation] User ${userId} has profile.company_id=${legacyCompanyId} but is not in company_members.`
    );
    return false;
  }

  // Check for company_memberships without legacy profile.company_id
  if (
    legacyCompanyId === null &&
    memberships &&
    memberships.length > 0
  ) {
    logger.warn(
      `[DataValidation] User ${userId} has company_members but no profile.company_id.`
    );
    return false;
  }

  // No issues found
  return true;
}

/**
 * Call this from your migration/validation scripts/tests as needed.
 */
export async function validateAllUsersCompanyConsistency() {
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id");

  if (error) {
    logger.error("[DataValidation] Failed to load users:", error);
    return;
  }
  const promises = users.map((u) => checkProfileCompanyConsistency(u.id));
  return Promise.all(promises);
}
