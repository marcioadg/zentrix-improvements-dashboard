const PAGE_SIZE = 1000;
const MAX_PAGES = 100; // Safety limit: 100,000 rows max

/**
 * Fetches all rows from a Supabase query by paginating through results.
 * This bypasses the PostgREST max_rows limit (typically 1000).
 * 
 * @param buildQuery - A function that returns a Supabase query builder with .range() method
 * @returns All rows concatenated from all pages
 */
export async function fetchAllPages<T>(
  buildQuery: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }> }
): Promise<T[]> {
  const allResults: T[] = [];
  let offset = 0;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    const query = buildQuery();
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allResults.push(...data);

    // If we got fewer results than PAGE_SIZE, we've reached the end
    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
    pageCount++;
  }

  return allResults;
}
