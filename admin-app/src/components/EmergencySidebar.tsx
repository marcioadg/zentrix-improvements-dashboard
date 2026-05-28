
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Metrics', href: '/metrics' },
  { name: 'Tasks', href: '/tasks' },
  { name: 'Goals', href: '/goals' },
  { name: 'Issues', href: '/issues' },
  { name: 'Meetings', href: '/meetings' },
  { name: 'People', href: '/people' },
  { name: 'Process', href: '/process' },
  { name: 'Strategy', href: '/strategy' },
  { name: 'Org Chart', href: '/org-chart' },
  { name: 'Tools', href: '/tools' },
  { name: 'Zentrix AI', href: '/zentrixai' },
  { name: 'Settings', href: '/settings' }
];

export const EmergencySidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div style={{
      width: '250px',
      height: '100vh',
      backgroundColor: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      padding: '16px',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          Emergency Navigation
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Temporary sidebar while debugging
        </p>
      </div>
      
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name} style={{ marginBottom: '4px' }}>
                <Link
                  to={item.href}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: isActive ? 'hsl(var(--primary-foreground))' : 'var(--text-muted)',
                    backgroundColor: isActive ? 'hsl(var(--primary))' : 'transparent',
                    transition: 'all 0.2s',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div style={{ 
        position: 'absolute', 
        bottom: '16px', 
        left: '16px', 
        right: '16px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border)',
        paddingTop: '12px'
      }}>
        Emergency Sidebar Active
        <br />
        Check console for debug info
      </div>
    </div>
  );
};
