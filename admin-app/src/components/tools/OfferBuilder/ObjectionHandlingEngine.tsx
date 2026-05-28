import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Download, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { ObjectionItem } from '@/hooks/useOfferBuilder';
import { logger } from '@/utils/logger';

interface ObjectionHandlingEngineProps {
  objections: ObjectionItem[];
  onSave: (objection: Omit<ObjectionItem, 'id' | 'sessionId'>) => void;
  onUpdate: (id: string, updates: Partial<ObjectionItem>) => void;
  onDelete: (id: string) => void;
}

const commonObjections = [
  { objection: 'Too expensive', suggestion: 'Payment plan option or ROI calculator' },
  { objection: 'Not enough time', suggestion: 'Time-saving automation features' },
  { objection: 'Tried before and failed', suggestion: 'Risk reversal guarantee' },
  { objection: 'Not sure it works for me', suggestion: 'Specific case study for their industry' },
  { objection: 'Need to think about it', suggestion: 'Limited-time bonus for quick action' },
  { objection: 'Have to ask spouse/partner', suggestion: 'Take-home materials for discussion' },
  { objection: 'Not ready right now', suggestion: 'Future-start option with current pricing' },
  { objection: 'Already have something similar', suggestion: 'Comparison chart showing advantages' }
];

export default function ObjectionHandlingEngine({ objections, onSave, onUpdate, onDelete }: ObjectionHandlingEngineProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newObjection, setNewObjection] = useState({
    objection: '',
    responseBonus: '',
    salesScript: '',
    isResolved: false,
    displayOrder: objections.length
  });

  const handleAddObjection = () => {
    if (newObjection.objection.trim()) {
      onSave(newObjection);
      setNewObjection({
        objection: '',
        responseBonus: '',
        salesScript: '',
        isResolved: false,
        displayOrder: objections.length + 1
      });
      setShowAddForm(false);
    }
  };

  const addCommonObjection = (commonObj: typeof commonObjections[0]) => {
    const newObj = {
      objection: commonObj.objection,
      responseBonus: commonObj.suggestion,
      salesScript: '',
      isResolved: false,
      displayOrder: objections.length
    };
    onSave(newObj);
  };

  const resolvedCount = objections.filter(obj => obj.isResolved).length;
  const completionRate = objections.length > 0 ? (resolvedCount / objections.length) * 100 : 0;

  const generateSwipeFile = () => {
    // This would generate a downloadable PDF with objection handling scripts
    logger.log('Generating objection swipe file...');
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-destructive">{objections.length}</p>
              <p className="text-sm text-muted-foreground">Total Objections</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{resolvedCount}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{completionRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Objections Quick Add */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Quick Add Common Objections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commonObjections.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.objection}</p>
                  <p className="text-xs text-muted-foreground">{item.suggestion}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCommonObjection(item)}
                  disabled={objections.some(obj => obj.objection === item.objection)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Objection Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Objections</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generateSwipeFile}>
                <Download className="h-4 w-4 mr-2" />
                Export Swipe File
              </Button>
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showAddForm && (
          <CardContent className="border-t">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objection-text">Objection</Label>
                <Input
                  id="objection-text"
                  placeholder="I need to check with my team first"
                  value={newObjection.objection}
                  onChange={(e) => setNewObjection({ ...newObjection, objection: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="response-bonus">Response/Bonus</Label>
                <Input
                  id="response-bonus"
                  placeholder="Team decision-making framework bonus"
                  value={newObjection.responseBonus}
                  onChange={(e) => setNewObjection({ ...newObjection, responseBonus: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sales-script">Sales Script</Label>
                <Textarea
                  id="sales-script"
                  placeholder="I completely understand. Most successful teams make decisions together..."
                  value={newObjection.salesScript}
                  onChange={(e) => setNewObjection({ ...newObjection, salesScript: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddObjection}>Add Objection</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Objections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Objection Handling Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {objections.map((objection, index) => (
              <motion.div
                key={objection.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={objection.isResolved}
                      onCheckedChange={(checked) => 
                        onUpdate(objection.id, { isResolved: checked as boolean })
                      }
                    />
                    <h4 className={`font-medium ${objection.isResolved ? 'line-through text-muted-foreground' : ''}`}>
                      {objection.objection}
                    </h4>
                    {objection.isResolved && (
                      <Badge variant="secondary">Resolved</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(objection.id)}
                    className="text-destructive hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Bonus/Feature Response</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {objection.responseBonus || 'No response defined'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sales Script</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {objection.salesScript || 'No script defined'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {objections.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No objections added yet. Start with common objections above or add custom ones.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}