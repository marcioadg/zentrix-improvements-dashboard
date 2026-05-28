import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { BonusItem } from '@/hooks/useOfferBuilder';

interface BonusStackEngineProps {
  bonusItems: BonusItem[];
  onSave: (bonus: Omit<BonusItem, 'id' | 'sessionId'>) => void;
  onUpdate: (id: string, updates: Partial<BonusItem>) => void;
  onDelete: (id: string) => void;
}

const deliveryFormats = [
  'Digital Download',
  'Video Training',
  'Live Workshop',
  'PDF Guide',
  'Email Course',
  'One-on-One Call',
  'Group Coaching',
  'Software Access',
  'Template Pack',
  'Checklist'
];

const commonObjections = [
  'Too expensive',
  'Not enough time',
  'Tried before and failed',
  'Not sure it works for me',
  'Need to think about it',
  'Have to ask spouse/partner',
  'Not ready right now',
  'Already have something similar'
];

const urgencyTypes = [
  'Limited-time',
  'Early-bird',
  'First 50 only',
  'This week only',
  'Until midnight',
  'While supplies last'
];

export default function BonusStackEngine({ bonusItems, onSave, onUpdate, onDelete }: BonusStackEngineProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBonus, setNewBonus] = useState({
    name: '',
    description: '',
    deliveryFormat: '',
    valueAmount: 0,
    deliveryTiming: '',
    objectionHandled: '',
    urgencyType: '',
    justification: '',
    displayOrder: bonusItems.length
  });

  const handleAddBonus = () => {
    if (newBonus.name.trim()) {
      onSave(newBonus);
      setNewBonus({
        name: '',
        description: '',
        deliveryFormat: '',
        valueAmount: 0,
        deliveryTiming: '',
        objectionHandled: '',
        urgencyType: '',
        justification: '',
        displayOrder: bonusItems.length + 1
      });
      setShowAddForm(false);
    }
  };

  const totalBonusValue = bonusItems.reduce((sum, item) => sum + (item.valueAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-secondary-foreground">{bonusItems.length}</p>
              <p className="text-sm text-muted-foreground">Total Bonuses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-foreground">${totalBonusValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Bonus Value</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-foreground">
                {totalBonusValue > 0 ? `${(totalBonusValue / 1000).toFixed(1)}x` : '0x'}
              </p>
              <p className="text-sm text-muted-foreground">Value Multiplier</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Bonus */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Bonus Stack
            </CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bonus
            </Button>
          </div>
        </CardHeader>
        
        {showAddForm && (
          <CardContent className="border-t">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bonus-name">Bonus Name</Label>
                  <Input
                    id="bonus-name"
                    placeholder="Email Marketing Mastery Course"
                    value={newBonus.name}
                    onChange={(e) => setNewBonus({ ...newBonus, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus-value">Standalone Value ($)</Label>
                  <Input
                    id="bonus-value"
                    type="number"
                    placeholder="497"
                    value={newBonus.valueAmount || ''}
                    onChange={(e) => setNewBonus({ ...newBonus, valueAmount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-format">Delivery Format</Label>
                  <Select value={newBonus.deliveryFormat} onValueChange={(value) => setNewBonus({ ...newBonus, deliveryFormat: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryFormats.map((format) => (
                        <SelectItem key={format} value={format}>{format}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-timing">When Delivered</Label>
                  <Input
                    id="delivery-timing"
                    placeholder="Immediately after purchase"
                    value={newBonus.deliveryTiming}
                    onChange={(e) => setNewBonus({ ...newBonus, deliveryTiming: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objection-handled">Objection It Removes</Label>
                  <Select value={newBonus.objectionHandled} onValueChange={(value) => setNewBonus({ ...newBonus, objectionHandled: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select objection" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonObjections.map((objection) => (
                        <SelectItem key={objection} value={objection}>{objection}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency-type">Urgency Type</Label>
                  <Select value={newBonus.urgencyType} onValueChange={(value) => setNewBonus({ ...newBonus, urgencyType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bonus-description">Description</Label>
                <Textarea
                  id="bonus-description"
                  placeholder="A comprehensive course covering advanced email marketing strategies..."
                  value={newBonus.description}
                  onChange={(e) => setNewBonus({ ...newBonus, description: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bonus-justification">Bonus Justification Story</Label>
                <Textarea
                  id="bonus-justification"
                  placeholder="I spent $5,000 learning these email strategies from the top marketers..."
                  value={newBonus.justification}
                  onChange={(e) => setNewBonus({ ...newBonus, justification: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddBonus}>Add Bonus</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bonus Items List */}
      <div className="space-y-4">
        {bonusItems.map((bonus, index) => (
          <motion.div
            key={bonus.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">{bonus.name}</h4>
                      <Badge variant="secondary">${bonus.valueAmount?.toLocaleString() || 0} value</Badge>
                      {bonus.urgencyType && (
                        <Badge variant="outline">{bonus.urgencyType}</Badge>
                      )}
                    </div>
                    
                    {bonus.description && (
                      <p className="text-sm text-muted-foreground mb-2">{bonus.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {bonus.deliveryFormat && (
                        <p><span className="font-medium">Format:</span> {bonus.deliveryFormat}</p>
                      )}
                      {bonus.deliveryTiming && (
                        <p><span className="font-medium">When:</span> {bonus.deliveryTiming}</p>
                      )}
                      {bonus.objectionHandled && (
                        <p><span className="font-medium">Removes:</span> {bonus.objectionHandled}</p>
                      )}
                    </div>
                    
                    {bonus.justification && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        <span className="font-medium">Story:</span> {bonus.justification}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(bonus.id)}
                    className="text-destructive hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        
        {bonusItems.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bonuses added yet. Click "Add Bonus" to start building your irresistible stack.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}