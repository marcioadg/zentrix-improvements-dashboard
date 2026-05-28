import React from 'react';

export const InternalDashboard: React.FC = () => {
  return (
    <div className="w-full h-full min-h-screen">
      <iframe
        src="/internal-dashboard.html"
        className="w-full border-0"
        style={{ height: '100vh', minHeight: '900px' }}
        title="Internal Marketing Funnel Dashboard"
      />
    </div>
  );
};

export default InternalDashboard;
