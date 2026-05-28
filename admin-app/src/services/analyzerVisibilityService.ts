// This service is now integrated into useAnalyzerPermissions hook
// Keeping this file for potential future use or reference

export interface PersonVisibility {
  userId: string;
  visibleToCount: number;
  visibilityLabel: string;
  visibleToRoles: string[];
}

export class AnalyzerVisibilityService {
  // This functionality has been moved to useAnalyzerPermissions hook
  // for better performance and integration with the existing permission system
}
