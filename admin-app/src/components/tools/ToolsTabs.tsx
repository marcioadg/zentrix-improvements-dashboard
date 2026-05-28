import React, { useState } from 'react';
import { CustomTabs, CustomTabsContent, CustomTabsList, CustomTabsTrigger } from '@/components/ui/custom-tabs';
import { ListChecks, Share2, Target, Megaphone, DollarSign, Heart, TrendingUp } from 'lucide-react';
import DelegateElevateGrid from '@/components/tools/DelegateElevate/DelegateElevateGrid';
import ClarityBreakView from '@/components/tools/ClarityBreak/ClarityBreakView';
import ClarityBreakHistory from '@/components/tools/ClarityBreak/ClarityBreakHistory';
import DeepStrategyView from '@/components/tools/DeepStrategy/DeepStrategyView';
import MarketingStrategyView from '@/components/tools/MarketingStrategy/MarketingStrategyView';
import OfferBuilderView from '@/components/tools/OfferBuilder/OfferBuilderView';
import EOSLifeView from '@/components/tools/EOSLife/EOSLifeView';
import ReplacementLadderView from '@/components/tools/ReplacementLadder/ReplacementLadderView';
import { useClarityBreaks } from '@/hooks/useClarityBreaks';

// Clean tools interface
export const ToolsTabs = () => {
  const [activeTab, setActiveTab] = useState('delegate-elevate');
  const clarityBreaksHook = useClarityBreaks();
  return <div className="h-full flex flex-col">
      <CustomTabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <CustomTabsList className="mb-4 sm:mb-6">
          <CustomTabsTrigger value="delegate-elevate" className="flex items-center text-xs sm:text-sm">
            <ListChecks className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Delegate & Elevate</span>
            <span className="sm:hidden">D&E</span>
          </CustomTabsTrigger>
          <CustomTabsTrigger value="clarity-break" className="flex items-center text-xs sm:text-sm">
            <Share2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Clarity Break</span>
            <span className="sm:hidden">Clarity</span>
          </CustomTabsTrigger>
          <CustomTabsTrigger value="deep-strategy" className="flex items-center text-xs sm:text-sm">
            <Target className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Deep Strategy</span>
            <span className="sm:hidden">Deep</span>
          </CustomTabsTrigger>
          <CustomTabsTrigger value="marketing-strategy" className="flex items-center text-xs sm:text-sm">
            <Megaphone className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Marketing Strategy</span>
            <span className="sm:hidden">Market</span>
          </CustomTabsTrigger>
          <CustomTabsTrigger value="the-offer" className="flex items-center text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">The Offer</span>
            <span className="sm:hidden">Offer</span>
          </CustomTabsTrigger>
          <CustomTabsTrigger value="eos-life" className="flex items-center text-xs sm:text-sm">
            <Heart className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">EOS Life</span>
            <span className="sm:hidden">Life</span>
          </CustomTabsTrigger>
          <CustomTabsTrigger value="replacement-ladder" className="flex items-center text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Replacement Ladder</span>
            <span className="sm:hidden">Replace</span>
          </CustomTabsTrigger>
        </CustomTabsList>

        <div className="flex-1 overflow-auto">
          <CustomTabsContent value="delegate-elevate" className="h-full mt-0">
            <div className="mb-4 md:mb-6">
              <h2 className="text-[20px] font-semibold text-foreground mb-1 md:mb-2">Delegate & Elevate</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Organize your tasks by how much you love them and how good you are at them
              </p>
            </div>
            <DelegateElevateGrid />
          </CustomTabsContent>
          
          <CustomTabsContent value="clarity-break" className="h-full mt-0">
            <div className="mb-4 md:mb-6">
              <h2 className="text-[20px] font-semibold text-foreground mb-1 md:mb-2">Clarity Break Journal</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Reflect, solve, and gain insight with guided clarity breaks
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:gap-8">
              <ClarityBreakView clarityBreaksHook={clarityBreaksHook} />
              <ClarityBreakHistory clarityBreaksHook={clarityBreaksHook} />
            </div>
          </CustomTabsContent>
          
          <CustomTabsContent value="deep-strategy" className="h-full mt-0">
            <div className="mb-4 md:mb-6">
              <h2 className="text-[20px] font-semibold text-foreground mb-1 md:mb-2">Deep Strategy</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Diagnose and sharpen your business strategy based on your current stage
              </p>
            </div>
            <DeepStrategyView />
          </CustomTabsContent>
          
          <CustomTabsContent value="marketing-strategy" className="h-full mt-0">
            <div className="mb-4 md:mb-6">
              <h2 className="text-[20px] font-semibold text-foreground mb-1 md:mb-2">Marketing Strategy</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Build your lead generation machine using the $100M Leads framework
              </p>
            </div>
            <MarketingStrategyView />
          </CustomTabsContent>
          
          <CustomTabsContent value="the-offer" className="h-full mt-0">
            <div className="mb-4 md:mb-6">
              <h2 className="text-[20px] font-semibold text-foreground mb-1 md:mb-2">The Offer</h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Create your Grand Slam Offer using Alex Hormozi's $100M Offers framework
              </p>
            </div>
            <OfferBuilderView />
          </CustomTabsContent>
          
          <CustomTabsContent value="eos-life" className="h-full mt-0">
            <EOSLifeView />
          </CustomTabsContent>
          
          <CustomTabsContent value="replacement-ladder" className="h-full mt-0">
            <ReplacementLadderView />
          </CustomTabsContent>
          
        </div>
      </CustomTabs>
    </div>;
};