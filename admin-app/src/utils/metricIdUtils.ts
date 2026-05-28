
export const cleanMetricId = (id: string): string => {
  if (!id) return id;
  // Remove test prefix that breaks UUID format
  return id.replace(/^test-/, '');
};
