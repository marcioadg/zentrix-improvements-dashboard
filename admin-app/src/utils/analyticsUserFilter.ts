import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Cache active user IDs to avoid repeated queries within same fetch cycle
const activeUserCache = new Map<string, { userIds: Set<string>; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds cache

/**
 * Fetches active user IDs for a company with caching.
 * Only returns users who have status = 'active' in company_members.
 */
export const getActiveUserIds = async (companyId: string): Promise<Set<string>> => {
  const cached = activeUserCache.get(companyId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.userIds;
  }

  try {
    const { data: activeMembers, error } = await supabase
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('user_id', 'is', null);

    if (error) {
      logger.error('Error fetching active users:', error);
      return new Set();
    }

    const userIds = new Set(activeMembers?.map(m => m.user_id).filter(Boolean) as string[]);
    
    // Cache the result
    activeUserCache.set(companyId, { userIds, timestamp: now });
    
    logger.log(`📊 Active users for company: ${userIds.size} users`);
    return userIds;
  } catch (err) {
    logger.error('Error in getActiveUserIds:', err);
    return new Set();
  }
};

/**
 * Fetches active user IDs for multiple companies with caching.
 * Only returns users who have status = 'active' in company_members.
 */
export const getActiveUserIdsForCompanies = async (companyIds: string[]): Promise<Set<string>> => {
  if (companyIds.length === 0) return new Set();
  
  // For single company, use existing function
  if (companyIds.length === 1) {
    return getActiveUserIds(companyIds[0]);
  }

  const now = Date.now();
  const allUserIds = new Set<string>();
  const uncachedCompanyIds: string[] = [];

  // Check cache for each company
  for (const companyId of companyIds) {
    const cached = activeUserCache.get(companyId);
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      cached.userIds.forEach(id => allUserIds.add(id));
    } else {
      uncachedCompanyIds.push(companyId);
    }
  }

  // Fetch uncached companies in one query
  if (uncachedCompanyIds.length > 0) {
    try {
      const { data: activeMembers, error } = await supabase
        .from('company_members')
        .select('user_id, company_id')
        .in('company_id', uncachedCompanyIds)
        .eq('status', 'active')
        .not('user_id', 'is', null);

      if (error) {
        logger.error('Error fetching active users for multiple companies:', error);
      } else {
        // Group by company and cache individually
        const byCompany = new Map<string, Set<string>>();
        activeMembers?.forEach(m => {
          if (m.user_id && m.company_id) {
            if (!byCompany.has(m.company_id)) {
              byCompany.set(m.company_id, new Set());
            }
            byCompany.get(m.company_id)!.add(m.user_id);
            allUserIds.add(m.user_id);
          }
        });

        // Cache results per company
        byCompany.forEach((userIds, companyId) => {
          activeUserCache.set(companyId, { userIds, timestamp: now });
        });

        // Cache empty sets for companies with no active members
        uncachedCompanyIds.forEach(companyId => {
          if (!byCompany.has(companyId)) {
            activeUserCache.set(companyId, { userIds: new Set(), timestamp: now });
          }
        });
      }
    } catch (err) {
      logger.error('Error in getActiveUserIdsForCompanies:', err);
    }
  }

  logger.log(`📊 Active users for ${companyIds.length} companies: ${allUserIds.size} users`);
  return allUserIds;
};

/**
 * Clears the cache for a specific company or all companies.
 */
export const clearActiveUserCache = (companyId?: string) => {
  if (companyId) {
    activeUserCache.delete(companyId);
  } else {
    activeUserCache.clear();
  }
};

/**
 * Filters meeting ratings object to only include ratings from active users.
 */
export const filterRatingsByActiveUsers = (
  ratingsObj: Record<string, number> | null,
  activeUserIds: Set<string>
): Record<string, number> => {
  if (!ratingsObj || typeof ratingsObj !== 'object') return {};
  
  const filteredRatings: Record<string, number> = {};
  for (const [userId, rating] of Object.entries(ratingsObj)) {
    if (activeUserIds.has(userId) && typeof rating === 'number' && rating > 0) {
      filteredRatings[userId] = rating;
    }
  }
  return filteredRatings;
};
