import React, { useEffect, useState } from 'react';
import { VTOHero } from '@/components/vto-builder/VTOHero';
import { VTOSocialProof } from '@/components/vto-builder/VTOSocialProof';
import { VTOHowItWorks } from '@/components/vto-builder/VTOHowItWorks';
import { VTOLeadCapture } from '@/components/vto-builder/VTOLeadCapture';
import { VTOBuilderApp } from '@/components/vto-builder/VTOBuilderApp';
import { VTOFooter } from '@/components/vto-builder/VTOFooter';

const VTOBuilder: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [leadData, setLeadData] = useState<{
    name: string;
    email: string;
    company: string;
    companySize: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    root.setAttribute('data-theme', 'light');
    return () => {
      root.classList.remove('light');
      root.style.colorScheme = '';
      root.removeAttribute('data-theme');
    };
  }, []);

  const handleLeadSubmit = (data: typeof leadData) => {
    setLeadData(data);
    setIsUnlocked(true);
    // Scroll to builder
    setTimeout(() => {
      document.getElementById('vto-builder-app')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white text-foreground" style={{ colorScheme: 'light' }}>
      {!isUnlocked ? (
        <>
          <VTOHero />
          <VTOSocialProof />
          <VTOHowItWorks />
          <VTOLeadCapture onSubmit={handleLeadSubmit} />
          <VTOFooter />
        </>
      ) : (
        <div id="vto-builder-app">
          <VTOBuilderApp leadData={leadData!} />
        </div>
      )}
    </div>
  );
};

export default VTOBuilder;
