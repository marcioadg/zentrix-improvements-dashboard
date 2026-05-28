import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Star, StarOff, Heart, UserPlus, Building, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { SectionType, MarketingBlock } from '@/hooks/useMarketingStrategy';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface LeadGettersGridProps {
  saveBlock: (
    sectionType: SectionType,
    blockId: string,
    blockTitle: string,
    blockData: Record<string, string>,
    visible?: boolean,
    focused?: boolean
  ) => void;
  getBlockData: (blockId: string) => MarketingBlock | undefined;
  blocks: MarketingBlock[];
}

const blockDefinitions = [
  {
    id: 'customers',
    title: 'Customers',
    icon: <Heart className="h-5 w-5" />,
    prompt: 'How do we get referrals from happy clients?',
    fields: [
      { name: 'script', label: 'Referral Ask Script', type: 'textarea' as const, placeholder: 'Your referral request template...' },
      { name: 'reward', label: 'Bonus/Reward (if any)', type: 'input' as const, placeholder: '$500 credit, free month, etc.' },
      { name: 'percentage', label: '% of Customers Referring', type: 'input' as const, placeholder: '15%' }
    ]
  },
  {
    id: 'affiliates',
    title: 'Affiliates',
    icon: <UserPlus className="h-5 w-5" />,
    prompt: 'Who would promote us for a cut?',
    fields: [
      { name: 'partners', label: 'List of Ideal Partners', type: 'textarea' as const, placeholder: 'Complementary businesses, influencers...' },
      { name: 'commission', label: 'Commission Offer', type: 'input' as const, placeholder: '30% of first month, $200 per sale...' },
      { name: 'funnel', label: 'Funnel Link or Dashboard', type: 'input' as const, placeholder: 'yoursite.com/partners' },
      { name: 'onboarding', label: 'Onboarding SOP', type: 'textarea' as const, placeholder: 'How you onboard new affiliates...' }
    ]
  },
  {
    id: 'employees',
    title: 'Employees',
    icon: <Building className="h-5 w-5" />,
    prompt: 'How do we turn our team into evangelists?',
    fields: [
      { name: 'incentives', label: 'Internal Rewards/Incentives', type: 'textarea' as const, placeholder: 'Bonuses, recognition, competitions...' },
      { name: 'templates', label: 'Social Sharing Templates', type: 'textarea' as const, placeholder: 'Pre-written posts for team to share...' },
      { name: 'engagement', label: '% Engaged in Promo', type: 'input' as const, placeholder: '80%' }
    ]
  },
  {
    id: 'agencies',
    title: 'Agencies',
    icon: <TrendingUp className="h-5 w-5" />,
    prompt: 'Who could we pay to send us leads or close deals?',
    fields: [
      { name: 'agency', label: 'Name of Agency', type: 'input' as const, placeholder: 'Growth Partners Inc.' },
      { name: 'focus', label: 'Channel Focus', type: 'input' as const, placeholder: 'Google Ads, SEO, cold outbound...' },
      { name: 'deliverables', label: 'Deliverables', type: 'textarea' as const, placeholder: 'X qualified leads/month, Y sales calls...' },
      { name: 'kpis', label: 'KPIs', type: 'input' as const, placeholder: 'CAC under $150, 20% close rate...' }
    ]
  }
];

export default function LeadGettersGrid({ saveBlock, getBlockData, blocks }: LeadGettersGridProps) {
  const [localData, setLocalData] = useState<Record<string, Record<string, string>>>({});
  const [localSettings, setLocalSettings] = useState<Record<string, { visible: boolean; focused: boolean }>>({});

  // Initialize local state from saved blocks
  useEffect(() => {
    const newLocalData: Record<string, Record<string, string>> = {};
    const newLocalSettings: Record<string, { visible: boolean; focused: boolean }> = {};
    
    blockDefinitions.forEach(def => {
      const savedBlock = getBlockData(def.id);
      newLocalData[def.id] = savedBlock?.blockData || {};
      newLocalSettings[def.id] = {
        visible: savedBlock?.visible ?? true,
        focused: savedBlock?.focused ?? false,
      };
    });
    
    setLocalData(newLocalData);
    setLocalSettings(newLocalSettings);
  }, [blocks, getBlockData]);

  // Debounced save function
  const [debouncedSave] = useDebouncedCallback(async (
    blockId: string,
    title: string,
    data: Record<string, string>,
    visible: boolean,
    focused: boolean
  ) => {
    await saveBlock('lead-getters', blockId, title, data, visible, focused);
  }, 1000);

  const updateBlockData = (blockId: string, field: string, value: string) => {
    const newData = { ...localData[blockId], [field]: value };
    setLocalData(prev => ({ ...prev, [blockId]: newData }));
    
    const blockDef = blockDefinitions.find(def => def.id === blockId);
    if (blockDef) {
      const settings = localSettings[blockId] || { visible: true, focused: false };
      debouncedSave(blockId, blockDef.title, newData, settings.visible, settings.focused);
    }
  };

  const toggleVisibility = (blockId: string) => {
    const newSettings = { 
      ...localSettings[blockId], 
      visible: !localSettings[blockId]?.visible 
    };
    setLocalSettings(prev => ({ ...prev, [blockId]: newSettings }));
    
    const blockDef = blockDefinitions.find(def => def.id === blockId);
    if (blockDef) {
      debouncedSave(blockId, blockDef.title, localData[blockId] || {}, newSettings.visible, newSettings.focused);
    }
  };

  const toggleFocus = (blockId: string) => {
    // Only one block can be focused at a time
    const newLocalSettings = { ...localSettings };
    
    // Clear focus from all blocks
    Object.keys(newLocalSettings).forEach(id => {
      newLocalSettings[id] = { ...newLocalSettings[id], focused: false };
    });
    
    // Set focus on the selected block
    newLocalSettings[blockId] = { 
      ...newLocalSettings[blockId], 
      focused: !localSettings[blockId]?.focused 
    };
    
    setLocalSettings(newLocalSettings);
    
    // Save all affected blocks
    blockDefinitions.forEach(def => {
      const settings = newLocalSettings[def.id];
      debouncedSave(def.id, def.title, localData[def.id] || {}, settings.visible, settings.focused);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {blockDefinitions.map((blockDef, index) => {
        const data = localData[blockDef.id] || {};
        const settings = localSettings[blockDef.id] || { visible: true, focused: false };
        
        return (
          <motion.div
            key={blockDef.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${!settings.visible ? 'opacity-50' : ''} ${settings.focused ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {blockDef.icon}
                    {blockDef.title}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {settings.focused && (
                      <Badge variant="secondary" className="text-xs">
                        Focus This Month
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFocus(blockDef.id)}
                    >
                      {settings.focused ? <Star className="h-4 w-4 text-yellow-500" /> : <StarOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisibility(blockDef.id)}
                    >
                      {settings.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {blockDef.prompt}
                </p>
              </CardHeader>
              
              {settings.visible && (
                <CardContent className="space-y-4">
                  {blockDef.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={`${blockDef.id}-${field.name}`} className="text-sm font-medium">
                        {field.label}
                      </Label>
                      {field.type === 'input' ? (
                        <Input
                          id={`${blockDef.id}-${field.name}`}
                          placeholder={field.placeholder}
                          value={data[field.name] || ''}
                          onChange={(e) => updateBlockData(blockDef.id, field.name, e.target.value)}
                          className="text-sm"
                        />
                      ) : (
                        <Textarea
                          id={`${blockDef.id}-${field.name}`}
                          placeholder={field.placeholder}
                          value={data[field.name] || ''}
                          onChange={(e) => updateBlockData(blockDef.id, field.name, e.target.value)}
                          className="text-sm min-h-[80px]"
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}