import React from "react";
import { CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessCategoryCardProps {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  status: 'complete' | 'in_progress' | 'missing';
  processCount: number;
  onSelect: () => void;
  onCreateProcess: () => void;
}

export default function ProcessCategoryCard({ 
  category, 
  status, 
  processCount, 
  onSelect, 
  onCreateProcess 
}: ProcessCategoryCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-status-success" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-status-warning" />;
      default:
        return <AlertCircle className="w-5 h-5 text-status-error" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Missing';
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`group relative rounded-lg border-2 p-6 transition-all duration-200 hover:shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none ${category.color}`}
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {getStatusIcon()}
      </div>

      {/* Category Icon & Name */}
      <div className="mb-4">
        <div className="text-3xl mb-2">{category.icon}</div>
        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
          {category.name}
        </h3>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Status:</span>
          <span className={`font-medium ${
            status === 'complete' ? 'text-status-success' :
            status === 'in_progress' ? 'text-status-warning' : 'text-status-error'
          }`}>
            {getStatusText()}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Processes:</span>
          <span className="font-medium">{processCount}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {processCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            View Processes
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={(e) => { e.stopPropagation(); onCreateProcess(); }}
          >
            <Plus className="w-4 h-4" />
            Create Process
          </Button>
        )}
      </div>
    </div>
  );
}