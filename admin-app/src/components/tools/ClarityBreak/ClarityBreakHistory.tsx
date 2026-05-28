
import { useState } from 'react';
import { useClarityBreaks } from '@/hooks/useClarityBreaks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Clock, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '@/utils/logger';

interface ClarityBreakEntry {
  id: string;
  break_id: string;
  prompt: string;
  response?: string;
  created_at: string;
}

export default function ClarityBreakHistory({ clarityBreaksHook }: { clarityBreaksHook: ReturnType<typeof useClarityBreaks> }) {
  const { history, loading, getBreakEntries } = clarityBreaksHook;
  const [selectedBreak, setSelectedBreak] = useState<any>(null);
  const [entries, setEntries] = useState<ClarityBreakEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const handleViewDetails = async (clarityBreak: any) => {
    setSelectedBreak(clarityBreak);
    setLoadingEntries(true);
    
    try {
      const breakEntries = await getBreakEntries(clarityBreak.id);
      setEntries(breakEntries);
    } catch (error) {
      logger.error('Error loading break details:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  const exportSession = (clarityBreak: any) => {
    const content = `Clarity Break Session - ${format(new Date(clarityBreak.started_at), 'PPP')}

Duration: ${clarityBreak.duration_minutes} minutes
Started: ${format(new Date(clarityBreak.started_at), 'PPpp')}
${clarityBreak.ended_at ? `Ended: ${format(new Date(clarityBreak.ended_at), 'PPpp')}` : 'In Progress'}

Responses:
${entries.map(entry => `
${entry.prompt}
${entry.response || 'No response recorded'}
`).join('\n---\n')}

${clarityBreak.insights ? `\nKey Insights:\n${clarityBreak.insights}` : ''}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clarity-break-${format(new Date(clarityBreak.started_at), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <section className="rounded-lg p-6 bg-white border shadow">
        <h2 className="font-bold text-xl mb-3">Past Clarity Breaks</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg p-4 sm:p-6 bg-white border shadow">
      <h2 className="font-bold text-lg sm:text-xl mb-3">Past Clarity Breaks</h2>
      
      {history.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-2">No clarity breaks yet.</p>
          <p className="text-sm text-muted-foreground">
            Start your first session above to begin tracking your insights.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((clarityBreak) => (
            <div 
              key={clarityBreak.id} 
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">
                    {format(new Date(clarityBreak.started_at), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {clarityBreak.ended_at 
                      ? `${Math.round((new Date(clarityBreak.ended_at).getTime() - new Date(clarityBreak.started_at).getTime()) / 60000)}m`
                      : `${clarityBreak.duration_minutes}m planned`
                    }
                  </span>
                </div>
                
                <Badge 
                  variant={clarityBreak.ended_at ? "default" : "secondary"}
                  className="text-xs w-fit"
                >
                  {clarityBreak.ended_at ? "Completed" : "In Progress"}
                </Badge>
                
                {clarityBreak.insights && (
                  <div className="flex-1 min-w-0 mt-2 sm:mt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2 sm:truncate">
                      "{clarityBreak.insights}"
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 sm:ml-4 justify-end sm:justify-start">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button 
                            onClick={() => handleViewDetails(clarityBreak)}
                            className="p-2 rounded-md hover:bg-muted transition-colors"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-2">
                          <DialogHeader>
                            <DialogTitle className="text-sm sm:text-base">
                              Clarity Break - {format(new Date(clarityBreak.started_at), 'PPP')}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {loadingEntries ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>
                            </div>
                          ) : (
                            <div className="space-y-4 sm:space-y-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Duration:</span> {clarityBreak.duration_minutes} minutes
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span> {clarityBreak.ended_at ? "Completed" : "In Progress"}
                                </div>
                              </div>
                              
                              <div className="space-y-3 sm:space-y-4">
                                <h3 className="font-semibold text-sm sm:text-base">Responses:</h3>
                                {entries.map((entry) => (
                                  <div key={entry.id} className="border rounded-lg p-3 sm:p-4">
                                    <h4 className="font-medium mb-2 text-sm sm:text-base leading-relaxed">{entry.prompt}</h4>
                                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                                      {entry.response || "No response recorded"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              
                              {clarityBreak.insights && (
                                <div className="border rounded-lg p-3 sm:p-4">
                                  <h4 className="font-medium mb-2 text-sm sm:text-base">Key Insights:</h4>
                                  <p className="text-muted-foreground whitespace-pre-wrap text-sm">
                                    {clarityBreak.insights}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex justify-center sm:justify-end">
                                <Button 
                                  variant="outline"
                                  onClick={() => exportSession(clarityBreak)}
                                  className="w-full sm:w-auto"
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Export Session
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
