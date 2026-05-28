
import React from 'react';
import { logger } from '@/utils/logger';
import { EmergencySidebar } from './EmergencySidebar';
import { CreateDropdown } from './CreateDropdown';
import { JoinMeetingButton } from './JoinMeetingButton';
import { ThemeToggle } from './ThemeToggle';


interface AppLayoutEmergencyProps {
  children: React.ReactNode;
}

export function AppLayoutEmergency({ children }: AppLayoutEmergencyProps) {
  logger.warn('Using emergency layout due to sidebar issues');

  const handleCreateTask = () => logger.debug('Create task - emergency mode');
  const handleCreateGoal = () => logger.debug('Create goal - emergency mode');
  const handleCreateMetric = () => logger.debug('Create metric - emergency mode');
  const handleCreateHeadline = () => logger.debug('Create headline - emergency mode');
  const handleCreateIssue = () => logger.debug('Create issue - emergency mode');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <EmergencySidebar />
      <div style={{ flex: 1, marginLeft: '250px', display: 'flex', flexDirection: 'column' }}>
        {/* Emergency header */}
        <header style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--card-bg)',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
            color: 'var(--error)',
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            Emergency Mode - Sidebar Debug Active
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle />
            <JoinMeetingButton />
            <CreateDropdown
              onCreateTask={handleCreateTask}
              onCreateGoal={handleCreateGoal}
              onCreateMetric={handleCreateMetric}
              onCreateHeadline={handleCreateHeadline}
              onCreateIssue={handleCreateIssue}
            />
          </div>
        </header>
        
        <main style={{ 
          flex: 1, 
          padding: '24px',
          backgroundColor: 'var(--card-bg)',
          overflow: 'auto'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>
      
    </div>
  );
}
