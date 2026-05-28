import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Star, StarOff, Users, MessageSquare, Camera, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { SectionType, MarketingBlock } from '@/hooks/useMarketingStrategy';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface CoreFourGridProps {
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
    id: 'warm-outreach',
    title: 'Warm Outreach',
    icon: <Users className="h-5 w-5" />,
    prompt: 'Who already knows you and could buy or refer?',
    fields: [
      { name: 'channels', label: 'Channels Used', type: 'input' as const, placeholder: 'DM, email, text, calls...' },
      { name: 'dailyTarget', label: 'Daily Outreach Target', type: 'input' as const, placeholder: '20 people' },
      { name: 'scripts', label: 'Scripts/Templates', type: 'textarea' as const, placeholder: 'Your go-to outreach messages...' }
    ]
  },
  {
    id: 'cold-outreach',
    title: 'Cold Outreach',
    icon: <MessageSquare className="h-5 w-5" />,
    prompt: "Who's never heard of you — and how will you contact them?",
    fields: [
      { name: 'platforms', label: 'Platforms/Tools', type: 'input' as const, placeholder: 'Apollo, Clay, Instantly, LinkedIn...' },
      { name: 'persona', label: 'Target Persona', type: 'input' as const, placeholder: 'CEOs of 10-50 person companies...' },
      { name: 'script', label: 'Cold Script/Hook', type: 'textarea' as const, placeholder: 'Your proven cold outreach template...' },
      { name: 'volume', label: 'Volume per Week', type: 'input' as const, placeholder: '500 emails, 100 LinkedIn messages...' }
    ]
  },
  {
    id: 'free-content',
    title: 'Post Free Content',
    icon: <Camera className="h-5 w-5" />,
    prompt: 'What content will you post and where?',
    fields: [
      { name: 'platforms', label: 'Platforms', type: 'input' as const, placeholder: 'Instagram, TikTok, YouTube, LinkedIn...' },
      { name: 'cadence', label: 'Content Cadence', type: 'input' as const, placeholder: '1 post daily, 3 videos/week...' },
      { name: 'cta', label: 'CTA Strategy', type: 'input' as const, placeholder: 'Link in bio, DM for details...' },
      { name: 'hooks', label: 'Top Hooks/Formats', type: 'textarea' as const, placeholder: 'Your best performing content ideas...' }
    ]
  },
  {
    id: 'paid-ads',
    title: 'Run Paid Ads',
    icon: <DollarSign className="h-5 w-5" />,
    prompt: 'Where will you buy attention, and what will they see?',
    fields: [
      { name: 'platform', label: 'Platform', type: 'input' as const, placeholder: 'Meta, Google, TikTok, YouTube...' },
      { name: 'budget', label: 'Budget', type: 'input' as const, placeholder: '$1000/month' },
      { name: 'offer', label: 'Offer Shown', type: 'input' as const, placeholder: 'Free consultation, lead magnet...' },
      { name: 'hook', label: 'Primary Hook/Headline', type: 'textarea' as const, placeholder: 'Your best performing ad copy...' }
    ]
  }
];

export default function CoreFourGrid({ saveBlock, getBlockData, blocks }: CoreFourGridProps) {
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
    await saveBlock('core-four', blockId, title, data, visible, focused);
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