import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStrategicPlan } from '@/hooks/useStrategicPlan';
import { logger } from '@/utils/logger';

export interface MetricTarget {
  id: string;
  name: string;
  target: string;
}

export interface CoreValue {
  id: string;
  value: string;
  explanation: string;
}

export interface YearGoal {
  revenue: string;
  profit: string;
  deliverables: string | DeliverableItem[]; // Support both old string and new array format
  metricTargets?: MetricTarget[]; // Add support for metric targets
  targetDate?: Date;
}

export interface QuarterlyPriority {
  id: string;
  title: string;
  owner: string;
  deadline: string;
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  owner?: string;
}

export interface TeamAlignment {
  teamId: string;
  priorityIds: string[];
  status: 'aligned' | 'needs-attention' | 'blocked';
}

export interface SwotItem {
  id: string;
  text: string;
  order: number;
}

export interface SwotData {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

export interface StrategyData {
  purpose: string;
  coreValues: CoreValue[];
  longTermObjective: string;
  longTermTimeframe: number;
  threeYearMilestones: {
    revenue: string;
    profit: string;
    teamSize: string;
    keyDescriptors: string;
    metricTargets?: MetricTarget[];
    targetDate?: Date;
    whatItLooksLike?: Array<{
      id: string;
      text: string;
      checked: boolean;
    }>;
  };
  targetCustomer: {
    demographics: string;
    psychographics: string;
    behavior: string;
  };
  uniqueEdge: string;
  oneYearGoals: YearGoal;
  quarterlyPriorities: QuarterlyPriority[];
  issues: Issue[];
  teamAlignment: TeamAlignment[];
  swotData: SwotData;
  marketing?: {
    targetMarket: string;
    competitiveAdvantages: string | any[]; // Allow both string and array for migration
    process: string;
    guarantee: string;
  };
}

interface StrategyContextType {
  data: StrategyData;
  updateData: (updates: Partial<StrategyData>) => void;
  addCoreValue: (value: string, explanation: string) => void;
  removeCoreValue: (id: string) => void;
  updateCoreValue: (id: string, value: string, explanation?: string) => void;
  addQuarterlyPriority: (priority: Omit<QuarterlyPriority, 'id'>) => void;
  updateQuarterlyPriority: (id: string, updates: Partial<QuarterlyPriority>) => void;
  removeQuarterlyPriority: (id: string) => void;
  addIssue: (issue: Omit<Issue, 'id'>) => void;
  updateIssue: (id: string, updates: Partial<Issue>) => void;
  removeIssue: (id: string) => void;
  addSwotItem: (category: keyof SwotData, text: string) => void;
  updateSwotItem: (category: keyof SwotData, id: string, text: string) => void;
  removeSwotItem: (category: keyof SwotData, id: string) => void;
  reorderSwotItems: (category: keyof SwotData, itemIds: string[]) => void;
  saveStatus: 'saved' | 'draft' | 'saving' | 'error';
  savePlan: () => void;
  versions: any[];
  restoreVersion: (versionId: string) => void;
  isLoading: boolean;
  retryLastSave: () => void;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

const defaultData: StrategyData = {
  purpose: '',
  coreValues: [],
  longTermObjective: '',
  longTermTimeframe: 10,
  threeYearMilestones: {
    revenue: '',
    profit: '',
    teamSize: '',
    keyDescriptors: '',
  },
  targetCustomer: {
    demographics: '',
    psychographics: '',
    behavior: '',
  },
  uniqueEdge: '',
  oneYearGoals: {
    revenue: '',
    profit: '',
    deliverables: [],
  },
  quarterlyPriorities: [],
  issues: [],
  teamAlignment: [],
  swotData: {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  },
  marketing: {
    targetMarket: '',
    competitiveAdvantages: [] as any, // Allow both string and array for migration
    process: '',
    guarantee: '',
  },
};

export interface DeliverableItem {
  id: string;
  text: string;
}

export const StrategyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    strategicPlan, 
    versions, 
    isLoading, 
    saveStatus, 
    savePlan: savePlanToDb, 
    updatePlanData,
    restoreVersion,
    retryLastSave
  } = useStrategicPlan();
  
  const [data, setData] = useState<StrategyData>(defaultData);

  useEffect(() => {
    if (strategicPlan?.plan_data) {
      setData({
        ...strategicPlan.plan_data,
        swotData: strategicPlan.plan_data.swotData || defaultData.swotData,
      });
    }
  }, [strategicPlan]);

  // Simplified update function that handles all data changes
  const updateStrategy = (newData: StrategyData) => {
    logger.log('📝 StrategyContext: Updating strategy data');
    setData(newData);
    updatePlanData(newData);
  };

  const updateData = (updates: Partial<StrategyData>) => {
    const newData = { ...data, ...updates };
    updateStrategy(newData);
  };

  const savePlan = () => {
    savePlanToDb(data);
  };

  // Simplified helper functions that use the single update function
  const addCoreValue = (value: string, explanation: string = '') => {
    if (data.coreValues.length >= 7) return;
    const newValue: CoreValue = {
      id: Date.now().toString(),
      value,
      explanation,
    };
    const newData = {
      ...data,
      coreValues: [...data.coreValues, newValue],
    };
    updateStrategy(newData);
  };

  const removeCoreValue = (id: string) => {
    const newData = {
      ...data,
      coreValues: data.coreValues.filter(v => v.id !== id),
    };
    updateStrategy(newData);
  };

  const updateCoreValue = (id: string, value: string, explanation?: string) => {
    const newData = {
      ...data,
      coreValues: data.coreValues.map(v =>
        v.id === id ? { 
          ...v, 
          value,
          ...(explanation !== undefined && { explanation })
        } : v
      ),
    };
    updateStrategy(newData);
  };

  const addQuarterlyPriority = (priority: Omit<QuarterlyPriority, 'id'>) => {
    if (data.quarterlyPriorities.length >= 5) return;
    const newPriority: QuarterlyPriority = {
      ...priority,
      id: Date.now().toString(),
    };
    const newData = {
      ...data,
      quarterlyPriorities: [...data.quarterlyPriorities, newPriority],
    };
    updateStrategy(newData);
  };

  const updateQuarterlyPriority = (id: string, updates: Partial<QuarterlyPriority>) => {
    const newData = {
      ...data,
      quarterlyPriorities: data.quarterlyPriorities.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    };
    updateStrategy(newData);
  };

  const removeQuarterlyPriority = (id: string) => {
    const newData = {
      ...data,
      quarterlyPriorities: data.quarterlyPriorities.filter(p => p.id !== id),
    };
    updateStrategy(newData);
  };

  const addIssue = (issue: Omit<Issue, 'id'>) => {
    const newIssue: Issue = {
      ...issue,
      id: Date.now().toString(),
    };
    const newData = {
      ...data,
      issues: [...data.issues, newIssue],
    };
    updateStrategy(newData);
  };

  const updateIssue = (id: string, updates: Partial<Issue>) => {
    const newData = {
      ...data,
      issues: data.issues.map(i =>
        i.id === id ? { ...i, ...updates } : i
      ),
    };
    updateStrategy(newData);
  };

  const removeIssue = (id: string) => {
    const newData = {
      ...data,
      issues: data.issues.filter(i => i.id !== id),
    };
    updateStrategy(newData);
  };

  // SWOT functions
  const addSwotItem = (category: keyof SwotData, text: string) => {
    if (data.swotData[category].length >= 5) return;
    const maxOrder = Math.max(...data.swotData[category].map(item => item.order || 0), -1);
    const newItem: SwotItem = {
      id: Date.now().toString(),
      text,
      order: maxOrder + 1,
    };
    const newData = {
      ...data,
      swotData: {
        ...data.swotData,
        [category]: [...data.swotData[category], newItem],
      },
    };
    updateStrategy(newData);
  };

  const updateSwotItem = (category: keyof SwotData, id: string, text: string) => {
    const newData = {
      ...data,
      swotData: {
        ...data.swotData,
        [category]: data.swotData[category].map(item =>
          item.id === id ? { ...item, text } : item
        ),
      },
    };
    updateStrategy(newData);
  };

  const removeSwotItem = (category: keyof SwotData, id: string) => {
    const newData = {
      ...data,
      swotData: {
        ...data.swotData,
        [category]: data.swotData[category].filter(item => item.id !== id),
      },
    };
    updateStrategy(newData);
  };

  const reorderSwotItems = (category: keyof SwotData, itemIds: string[]) => {
    const newData = {
      ...data,
      swotData: {
        ...data.swotData,
        [category]: data.swotData[category]
          .map(item => ({
            ...item,
            order: itemIds.indexOf(item.id)
          }))
          .sort((a, b) => a.order - b.order),
      },
    };
    updateStrategy(newData);
  };

  return (
    <StrategyContext.Provider
      value={{
        data,
        updateData,
        addCoreValue,
        removeCoreValue,
        updateCoreValue,
        addQuarterlyPriority,
        updateQuarterlyPriority,
        removeQuarterlyPriority,
        addIssue,
        updateIssue,
        removeIssue,
        addSwotItem,
        updateSwotItem,
        removeSwotItem,
        reorderSwotItems,
        saveStatus,
        savePlan,
        versions,
        restoreVersion,
        isLoading,
        retryLastSave,
      }}
    >
      {children}
    </StrategyContext.Provider>
  );
};

export const useStrategy = () => {
  const context = useContext(StrategyContext);
  if (context === undefined) {
    throw new Error('useStrategy must be used within a StrategyProvider');
  }
  return context;
};
