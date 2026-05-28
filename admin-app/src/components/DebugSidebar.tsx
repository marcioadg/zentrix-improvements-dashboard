
import React from 'react';

export const DebugSidebar: React.FC = () => {
  return (
    <div style={{
      width: '250px',
      height: '100vh',
      backgroundColor: 'var(--surface-raised)',
      border: '2px solid red',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 1000,
      padding: '20px',
      color: 'black'
    }}>
      <h3>Debug Sidebar</h3>
      <p>If you can see this, the sidebar space is working.</p>
      <ul>
        <li>Dashboard</li>
        <li>Metrics</li>
        <li>Tasks</li>
        <li>Goals</li>
        <li>Issues</li>
        <li>Meetings</li>
        <li>People</li>
        <li>Settings</li>
      </ul>
    </div>
  );
};
