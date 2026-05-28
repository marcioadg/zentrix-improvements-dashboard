import { logger } from '@/utils/logger';

export const getUserDisplayName = (user: {
  full_name?: string;
  email?: string;
  id?: string;
}): string => {
  logger.log('🔍 getUserDisplayName called with:', { 
    full_name: user?.full_name, 
    email: user?.email, 
    id: user?.id,
    user_type: typeof user,
    user_keys: user ? Object.keys(user) : 'null/undefined'
  });

  // Handle null/undefined user
  if (!user) {
    logger.log('⚠️ User object is null/undefined, falling back to Unknown User');
    return 'Unknown User';
  }

  // First priority: use full_name if it exists and is not empty
  if (user.full_name && typeof user.full_name === 'string' && user.full_name.trim().length > 0) {
    logger.log('✅ Using full_name:', user.full_name);
    return user.full_name.trim();
  }

  // Second priority: extract username from email
  if (user.email && typeof user.email === 'string' && user.email.includes('@')) {
    const username = user.email.split('@')[0];
    if (username && username.length > 0) {
      logger.log('📧 Using email username:', username);
      return username;
    }
  }

  // Third priority: use just the email if no @ symbol
  if (user.email && typeof user.email === 'string' && user.email.trim().length > 0) {
    logger.log('📧 Using full email:', user.email);
    return user.email.trim();
  }

  // Last resort with more detailed logging
  logger.log('❌ No valid name found, falling back to Unknown User for user:', {
    id: user.id,
    available_props: Object.keys(user),
    full_name_value: user.full_name,
    full_name_type: typeof user.full_name,
    email_value: user.email,
    email_type: typeof user.email
  });
  return 'Unknown User';
};

export const getUserDisplayInfo = (user: {
  full_name?: string;
  email?: string;
  id?: string;
}) => {
  const displayName = getUserDisplayName(user);
  const hasRealName = user?.full_name && typeof user.full_name === 'string' && user.full_name.trim().length > 0;
  
  logger.log('📋 getUserDisplayInfo result:', {
    userId: user?.id,
    displayName,
    hasRealName,
    subtitle: hasRealName ? user.email : undefined
  });
  
  return {
    displayName,
    hasRealName,
    subtitle: hasRealName ? user.email : undefined
  };
};
