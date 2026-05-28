import React, { Component, ReactNode } from 'react';
import { RefreshCw, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class OrgChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-foreground">Org chart couldn't load</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                There was a problem rendering the organizational chart.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
