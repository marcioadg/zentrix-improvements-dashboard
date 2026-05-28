import React from 'react';
import { CustomTabs, CustomTabsContent, CustomTabsList, CustomTabsTrigger } from '@/components/ui/custom-tabs';
import { LifeRating } from './LifeRating';
import { LifeHistory } from './LifeHistory';
import { LifeInsights } from './LifeInsights';
import { EOSLifeProvider } from '@/contexts/EOSLifeContext';

const EOSLifeView: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('rate');

  return (
    <EOSLifeProvider>
      <div className="w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
            EOS Life Tracker
          </h1>
          <p className="text-[13px] text-muted-foreground">
            Track your progress across the 5 core areas of life to achieve balance and fulfillment.
          </p>
        </div>

        <CustomTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CustomTabsList className="mb-6">
            <CustomTabsTrigger value="rate">Rate Today</CustomTabsTrigger>
            <CustomTabsTrigger value="history">History</CustomTabsTrigger>
            <CustomTabsTrigger value="insights">Insights</CustomTabsTrigger>
          </CustomTabsList>

          <CustomTabsContent value="rate">
            <LifeRating />
          </CustomTabsContent>

          <CustomTabsContent value="history">
            <LifeHistory />
          </CustomTabsContent>

          <CustomTabsContent value="insights">
            <LifeInsights />
          </CustomTabsContent>
        </CustomTabs>
      </div>
    </EOSLifeProvider>
  );
};

export default EOSLifeView;