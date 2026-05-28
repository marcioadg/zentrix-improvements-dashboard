import React, { useState } from "react";
import { BookOpen, Plus, Users, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ProcessDetailView from "@/components/process/ProcessDetailView";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { ProcessLoadingSkeleton } from "@/components/process/ProcessPageSkeleton";
import { logger } from '@/utils/logger';

const PROCESS_CATEGORIES = [
  { id: 'sales', name: 'Sales' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'operations', name: 'Operations' },
  { id: 'hr', name: 'HR/People' },
  { id: 'finance', name: 'Finance' },
  { id: 'customer_success', name: 'Customer Success' },
  { id: 'other', name: 'Other' }
];

/**
 * Redesigned Process Documentation page with expandable categories and process lists
 */
export default function Process() {
  const { pages, createPage, isLoading } = useWikiPages();
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [showSimplifiedView, setShowSimplifiedView] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryStatuses, setCategoryStatuses] = useState<Record<string, 'complete' | 'in_progress' | 'missing'>>({});
  const [documentationProgress, setDocumentationProgress] = useState(0);

  // Show loading skeleton while wiki pages are loading
  if (isLoading) {
    return <ProcessLoadingSkeleton />;
  }

  // Calculate total processes for display
  const totalProcesses = pages.length;

  // Get manual status for each category (defaults to 'missing' if not set)
  const getCategoryStatus = (categoryId: string) => {
    return categoryStatuses[categoryId] || 'missing';
  };

  // Update category status manually
  const updateCategoryStatus = (categoryId: string, status: 'complete' | 'in_progress' | 'missing') => {
    setCategoryStatuses(prev => ({
      ...prev,
      [categoryId]: status
    }));
  };

  const getStatusIcon = (status: string) => {
    // No icons for any status - clean minimalist design
    return null;
  };

  const handleCreateProcess = async (categoryId: string) => {
    const categoryName = PROCESS_CATEGORIES.find(cat => cat.id === categoryId)?.name || 'Process';
    
    // Check if this will be the first process in this category
    const currentCategoryProcesses = getCategoryProcesses(categoryId);
    const willBeFirstProcess = currentCategoryProcesses.length === 0;
    
    logger.log('Creating process:', {
      categoryId,
      categoryName,
      currentProcessCount: currentCategoryProcesses.length,
      willBeFirstProcess,
      currentStatus: categoryStatuses[categoryId]
    });
    
    const newPage = await createPage({ 
      title: `${categoryName} Process - Untitled`,
      category: categoryId // Set the category field
    });
    if (newPage?.id) {
      logger.log('Process created successfully, checking automation...');
      // Auto-update status to "in progress" when first process is created
      if (willBeFirstProcess && (categoryStatuses[categoryId] === 'missing' || categoryStatuses[categoryId] === undefined)) {
        logger.log('Triggering status update to in_progress for category:', categoryId);
        updateCategoryStatus(categoryId, 'in_progress');
      } else {
        logger.log('Automation not triggered:', {
          willBeFirstProcess,
          currentStatus: categoryStatuses[categoryId]
        });
      }
      setSelectedProcessId(newPage.id);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryProcesses = (categoryId: string) => {
    // Now use the proper category field instead of title matching
    const processes = pages.filter(page => page.category === categoryId);
    logger.log(`getCategoryProcesses for ${categoryId}:`, processes);
    return processes;
  };

  // If a specific process is selected, show detail view
  if (selectedProcessId) {
    return (
      <ProcessDetailView
        processId={selectedProcessId}
        onBack={() => setSelectedProcessId(null)}
        showSimplifiedView={showSimplifiedView}
        onToggleSimplifiedView={() => setShowSimplifiedView(!showSimplifiedView)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-6 py-6">
        {/* Header Section */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Your Core Processes</h1>
          </div>
          <p className="text-[13px] text-muted-foreground mb-8">
            Document once. Follow every time.
          </p>
          
          {/* Progress Section */}
          <div className="max-w-md mx-auto bg-card rounded-[6px] p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Documentation Progress</span>
              <span className="text-2xl font-semibold text-foreground">{documentationProgress}%</span>
            </div>
            <div className="relative mb-2">
              <Progress value={documentationProgress} className="h-3" />
              {/* Visual circle indicator */}
              <div 
                className="absolute top-1/2 w-5 h-5 bg-primary border-2 border-white rounded-full shadow-lg transform -translate-y-1/2 cursor-pointer transition-all hover:scale-110"
                style={{ left: `calc(${documentationProgress}% - 10px)` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={documentationProgress}
                onChange={(e) => setDocumentationProgress(Number(e.target.value))}
                className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
                title={`${documentationProgress}% complete`}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {totalProcesses} processes • Click and drag to set progress
            </p>
          </div>
        </header>

        {/* Process Categories - Expandable List */}
        <div className="bg-card rounded-[6px] shadow-sm border overflow-hidden mb-8">
          <div className="p-6 border-b">
            <h2 className="text-[16px] font-semibold text-foreground">Process Categories</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Click on any category to view and manage its processes
            </p>
          </div>
          
          <div className="divide-y">
            {PROCESS_CATEGORIES.map((category) => {
              const status = getCategoryStatus(category.id);
              const categoryProcesses = getCategoryProcesses(category.id);
              const isExpanded = expandedCategories.has(category.id);
              
              return (
                <div key={category.id} className="transition-colors hover:bg-accent/30">
                  {/* Category Header */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <h3 className="font-medium text-[13px] text-foreground">
                          {category.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{categoryProcesses.length} process{categoryProcesses.length !== 1 ? 'es' : ''}</span>
                        <button
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80 ${
                            status === 'complete' ? 'bg-status-success/10 text-status-success' :
                            status === 'in_progress' ? 'bg-muted text-muted-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Cycle through statuses
                            const nextStatus = status === 'missing' ? 'in_progress' : 
                                             status === 'in_progress' ? 'complete' : 'missing';
                            updateCategoryStatus(category.id, nextStatus);
                          }}
                          title="Click to change status"
                        >
                          {status === 'complete' ? 'Complete' : 
                           status === 'in_progress' ? 'In Progress' : 'Missing'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateProcess(category.id);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                  
                  {/* Expanded Process List */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-accent/10">
                      {categoryProcesses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="mb-3">No processes created yet</p>
                          <Button 
                            variant="outline" 
                            onClick={() => handleCreateProcess(category.id)}
                            className="gap-2 h-8 w-8 p-0"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {categoryProcesses.map((process) => (
                            <div 
                              key={process.id}
                              className="flex items-center justify-between p-3 bg-background border rounded-lg hover:shadow-sm transition-all cursor-pointer group"
                              onClick={() => setSelectedProcessId(process.id)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium group-hover:text-primary transition-colors">
                                  {process.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {process.updated_at && (
                                  <span>
                                    Updated {new Date(process.updated_at).toLocaleDateString()}
                                  </span>
                                )}
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Training & Compliance Section */}
        <div className="bg-card rounded-[6px] p-6 shadow-sm border">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-[16px] font-semibold text-foreground">Training & Compliance</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROCESS_CATEGORIES.slice(0, 6).map((category) => {
              const categoryPages = pages.filter(page => 
                page.title.toLowerCase().includes(category.id.replace('_', ' '))
              );
              const trainedPercentage = Math.floor(Math.random() * 100); // Mock data
              
              return (
                <div key={`training-${category.id}`} className="p-4 rounded-lg border bg-background">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{category.name}</span>
                    </div>
                    {Math.random() > 0.7 && (
                      <div title="Quarterly review due">
                        <RotateCcw className="w-4 h-4 text-warning" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Team trained</span>
                      <span className="font-medium">{trainedPercentage}%</span>
                    </div>
                    <Progress value={trainedPercentage} className="h-2" />
                    
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="text-xs">
                        Mark as Read
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        Take Quiz
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <Button 
            onClick={() => handleCreateProcess('other')} 
            size="lg" 
            className="gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Process
          </Button>
        </div>
      </div>
    </div>
  );
}