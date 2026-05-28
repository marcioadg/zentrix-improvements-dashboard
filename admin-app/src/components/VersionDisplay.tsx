
import React from 'react';

interface VersionDisplayProps {
  className?: string;
  detailed?: boolean;
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({ 
  className, 
  detailed = false 
}) => {
  // Get version info from environment variables
  const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
  const baseVersion = import.meta.env.VITE_BASE_VERSION || '1.0.0';
  const gitHash = import.meta.env.VITE_GIT_HASH || 'unknown';
  const gitBranch = import.meta.env.VITE_GIT_BRANCH || 'unknown';
  const buildTime = import.meta.env.VITE_BUILD_TIME;
  const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP;
  
  // Format the display version
  const formatVersion = () => {
    // Simple format for normal display
    if (buildTime && gitHash !== 'unknown') {
      const date = new Date(buildTime);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = date.toISOString().slice(11, 16).replace(':', '');
      return `v${baseVersion}-${gitHash}-${dateStr}.${timeStr}`;
    }
    
    if (buildTimestamp) {
      const date = new Date(parseInt(buildTimestamp));
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = date.toISOString().slice(11, 16).replace(':', '');
      return `v${baseVersion}-${dateStr}.${timeStr}`;
    }
    
    return `v${version}`;
  };

  if (detailed) {
    // Remove 'v' prefix if version already has it to avoid 'vv'
    const displayVersion = version.startsWith('v') ? version : `v${version}`;
    return (
      <div className={`text-[11px] text-muted-foreground select-none ${className || ''}`}>
        {displayVersion}
      </div>
    );
  }

  return (
    <div className={`text-[11px] text-muted-foreground select-none ${className || ''}`}>
      Beta Version
    </div>
  );
};

export default VersionDisplay;
