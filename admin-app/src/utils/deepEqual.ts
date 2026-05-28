/**
 * Deep equality check utility for objects
 * Specifically optimized for company objects and context values
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

/**
 * Company-specific equality check for stable company references
 * Focuses on fields that matter for company identity
 */
export const companyEqual = (company1: any, company2: any): boolean => {
  if (company1 === company2) return true;
  if (!company1 || !company2) return company1 === company2;
  
  return company1.id === company2.id &&
         company1.name === company2.name &&
         company1.slug === company2.slug &&
         company1.role === company2.role;
};