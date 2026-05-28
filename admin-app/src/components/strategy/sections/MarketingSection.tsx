
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';
import { NicheSection } from './NicheSection';
import { Plus, X, GripVertical, Shield, Link, Check } from 'lucide-react';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { logger } from '@/utils/logger';

interface CompetitiveAdvantage {
  id: string;
  text: string;
  order: number;
}

interface SortableAdvantageItemProps {
  advantage: CompetitiveAdvantage;
  onRemove: () => void;
  onUpdate: (id: string, text: string) => void;
  isSharedFromLeadership?: boolean;
}

const SortableAdvantageItem: React.FC<SortableAdvantageItemProps> = ({ advantage, onRemove, onUpdate, isSharedFromLeadership = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(advantage.text);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: advantage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(advantage.id, editValue.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(advantage.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-card rounded-lg border border-border group hover:border-border/80 transition-colors ${isSharedFromLeadership ? 'opacity-75' : ''}`}
    >
      <button
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        disabled={isSharedFromLeadership || isEditing}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      {isEditing && !isSharedFromLeadership ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          rows={1}
          className="flex-1 text-sm bg-transparent border-none outline-none p-0 m-0 resize-none overflow-hidden"
          style={{ height: 'auto', minHeight: '1.25rem' }}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
        />
      ) : (
        <>
          <span 
            className={`flex-1 text-sm ${!isSharedFromLeadership ? 'cursor-pointer hover:text-primary' : ''}`}
            onClick={() => !isSharedFromLeadership && setIsEditing(true)}
          >
            {advantage.text}
          </span>
          <div className="flex items-center gap-2">
            {isSharedFromLeadership && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Shield className="h-3 w-3 text-primary dark:text-blue-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>From leadership team</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <button
              onClick={onRemove}
              className={`text-destructive hover:text-red-800 transition-colors ${isSharedFromLeadership ? 'opacity-75' : ''}`}
              aria-label={isSharedFromLeadership ? "Hide leadership advantage" : "Remove advantage"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const MarketingSection: React.FC<{ teamId?: string | null }> = ({ teamId }) => {
  const { data, updateData, strategicPlan } = useSimpleStrategy();
  const { isLeadershipMember } = useLeadershipAccess(teamId);
  const [newAdvantage, setNewAdvantage] = useState('');

  // Check if sharing is active (leadership has sharing enabled AND current team is not leadership)
  const isSharedFromLeadership = !isLeadershipMember && strategicPlan?.company_shared;

  // Helper function for case/spacing insensitive comparison
  const normalize = (s?: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
  
  // Check if current values match leadership values
  const getLeadershipMarketing = () => {
    return strategicPlan?.leadership_reference?.marketing || {};
  };
  
  const leadershipMarketing = getLeadershipMarketing();
  
  const targetMarketMatchesLeadership = !isLeadershipMember && 
    !!normalize((data as any)?.marketing?.targetMarket) && 
    normalize((data as any)?.marketing?.targetMarket) === normalize(leadershipMarketing.targetMarket);

  const processMatchesLeadership = !isLeadershipMember && 
    !!normalize((data as any)?.marketing?.process) && 
    normalize((data as any)?.marketing?.process) === normalize(leadershipMarketing.process);

  const guaranteeMatchesLeadership = !isLeadershipMember && 
    !!normalize((data as any)?.marketing?.guarantee) && 
    normalize((data as any)?.marketing?.guarantee) === normalize(leadershipMarketing.guarantee);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateMarketing = (field: string, value: string | CompetitiveAdvantage[]) => {
    logger.log('📝 MarketingSection: Updating field:', field, 'with value:', value);
    updateData({
      marketing: {
        ...data.marketing,
        [field]: value,
      },
    });
  };

  // Convert old string format to new array format
  const getAdvantagesList = (): CompetitiveAdvantage[] => {
    const marketingData = data.marketing?.competitiveAdvantages;
    
    if (marketingData) {
      if (typeof marketingData === 'string') {
        // Migration: convert string to array format
        const stringAdvantages = marketingData.split('\n').filter(a => a.trim());
        const arrayAdvantages = stringAdvantages.map((text, index) => ({
          id: `advantage-${Date.now()}-${index}`,
          text: text.trim(),
          order: index,
        }));
        // Update to new format
        updateMarketing('competitiveAdvantages', arrayAdvantages);
        return arrayAdvantages;
      } else if (Array.isArray(marketingData)) {
        return (marketingData as CompetitiveAdvantage[]).sort((a, b) => a.order - b.order);
      }
    }
    return [];
  };

  const getFilteredAdvantages = () => {
    let advantages = getAdvantagesList();
    
    // Filter out shared advantages when sharing is OFF
    if (!strategicPlan?.company_shared && strategicPlan?.leadership_reference?.marketing?.competitiveAdvantages) {
      const leadershipAdvantages = Array.isArray(strategicPlan.leadership_reference.marketing.competitiveAdvantages) 
        ? strategicPlan.leadership_reference.marketing.competitiveAdvantages 
        : [];
      const leadershipIds = leadershipAdvantages.map(item => item.id);
      advantages = advantages.filter(advantage => !leadershipIds.includes(advantage.id));
    }
    
    return advantages;
  };

  const advantagesList = getFilteredAdvantages();

  const addAdvantage = () => {
    if (newAdvantage.trim()) {
      const newAdvantageItem: CompetitiveAdvantage = {
        id: `advantage-${Date.now()}`,
        text: newAdvantage.trim(),
        order: advantagesList.length,
      };
      const updatedAdvantages = [...advantagesList, newAdvantageItem];
      updateMarketing('competitiveAdvantages', updatedAdvantages);
      setNewAdvantage('');
    }
  };

  const removeAdvantage = (id: string) => {
    const updatedAdvantages = advantagesList.filter(advantage => advantage.id !== id);
    // Reorder the remaining advantages
    const reorderedAdvantages = updatedAdvantages.map((advantage, index) => ({
      ...advantage,
      order: index,
    }));
    updateMarketing('competitiveAdvantages', reorderedAdvantages);
  };

  const updateAdvantage = (id: string, text: string) => {
    const updatedAdvantages = advantagesList.map(advantage =>
      advantage.id === id ? { ...advantage, text } : advantage
    );
    updateMarketing('competitiveAdvantages', updatedAdvantages);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = advantagesList.findIndex(advantage => advantage.id === active.id);
      const newIndex = advantagesList.findIndex(advantage => advantage.id === over.id);

      const reorderedAdvantages = arrayMove(advantagesList, oldIndex, newIndex);
      // Update order property
      const updatedAdvantages = reorderedAdvantages.map((advantage, index) => ({
        ...advantage,
        order: index,
      }));

      updateMarketing('competitiveAdvantages', updatedAdvantages);
    }
  };

  return (
    <div className="space-y-6">
      {/* Niche section spans full width */}
      <NicheSection />

      {/* Two-column layout for the rest of the marketing fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="targetMarket" className="text-sm font-medium">
                Target Market
              </Label>
              {targetMarketMatchesLeadership && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Link className="h-3 w-3 text-primary dark:text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Matches leadership team target market</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Textarea
              id="targetMarket"
              value={data.marketing?.targetMarket || ''}
              onChange={(e) => updateMarketing('targetMarket', e.target.value)}
              placeholder="Who is your ideal customer?"
              autoResize
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitiveAdvantages" className="text-sm font-medium">
              3 Competitive Advantages
            </Label>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={isSharedFromLeadership ? undefined : handleDragEnd}
            >
              <SortableContext
                items={advantagesList.map(advantage => advantage.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {advantagesList.map((advantage) => {
                    // Determine if this specific item is from leadership
                    const isItemFromLeadership = isSharedFromLeadership && 
                      strategicPlan?.leadership_reference?.marketing?.competitiveAdvantages &&
                      Array.isArray(strategicPlan.leadership_reference.marketing.competitiveAdvantages) &&
                      strategicPlan.leadership_reference.marketing.competitiveAdvantages.some(item => item.id === advantage.id);
                    
                    return (
                      <SortableAdvantageItem
                        key={advantage.id}
                        advantage={advantage}
                        onRemove={() => removeAdvantage(advantage.id)}
                        onUpdate={updateAdvantage}
                        isSharedFromLeadership={isItemFromLeadership}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
            
            <div className="flex items-center gap-2">
              <Input
                value={newAdvantage}
                onChange={(e) => setNewAdvantage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAdvantage()}
                placeholder="Add a competitive advantage..."
                className="flex-1 border-0 border-b border-border/40 rounded-none bg-transparent px-0 py-2 focus-visible:ring-0 focus-visible:border-primary/60 placeholder:text-muted-foreground/40 text-sm"
              />
              <Button
                onClick={addAdvantage}
                disabled={!newAdvantage.trim()}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="process" className="text-sm font-medium">
                Our Process
              </Label>
              {processMatchesLeadership && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Link className="h-3 w-3 text-primary dark:text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Matches leadership team process</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Textarea
              id="process"
              value={data.marketing?.process || ''}
              onChange={(e) => updateMarketing('process', e.target.value)}
              placeholder="How do you deliver value to customers?"
              autoResize
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="guarantee" className="text-sm font-medium">
                Guarantee
              </Label>
              {guaranteeMatchesLeadership && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Link className="h-3 w-3 text-primary dark:text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Matches leadership team guarantee</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Textarea
              id="guarantee"
              value={data.marketing?.guarantee || ''}
              onChange={(e) => updateMarketing('guarantee', e.target.value)}
              placeholder="What guarantee do you offer to customers?"
              autoResize
            />
          </div>
        </div>
      </div>
    </div>
  );
};
