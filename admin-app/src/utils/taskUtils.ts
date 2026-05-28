export const getDefaultDueDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 7); // Add exactly 7 days
  
  // Format as YYYY-MM-DD using local timezone to avoid timezone conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export const formatTaskDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const isTaskOverdue = (dueDate: string, isCompleted: boolean = false): boolean => {
  if (!dueDate || isCompleted) return false;
  
  const due = new Date(dueDate);
  const today = new Date();
  
  // Reset time to start of day for accurate comparison
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  return due < today;
};
