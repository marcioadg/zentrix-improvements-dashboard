
export const getInitials = (fullName?: string, email?: string): string => {
  // First, try to get initials from full name
  if (fullName && fullName.trim()) {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return nameParts[0][0].toUpperCase();
  }
  
  // If no full name, try email but be more conservative
  if (email) {
    const emailPart = email.split('@')[0];
    
    // Don't return initials if the email part is too short or looks generated
    if (emailPart.length < 3) {
      return '??';
    }
    
    // Don't return initials if it contains numbers (likely generated)
    if (/[0-9]/.test(emailPart)) {
      return '??';
    }
    
    // Don't return initials if it has repetitive patterns
    const firstTwo = emailPart.slice(0, 2).toUpperCase();
    if (firstTwo[0] === firstTwo[1]) {
      return '??';
    }
    
    return firstTwo;
  }
  
  return '??';
};
