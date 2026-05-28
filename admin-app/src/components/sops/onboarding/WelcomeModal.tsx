import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Users, Share2, Sparkles } from 'lucide-react';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';

interface WelcomeModalProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onGetStarted, onSkip }) => {
  const { currentCompany } = useMultiCompanyAccess();

  const features = [
    {
      icon: <FileText className="h-8 w-8" />,
      title: 'Rich Documentation',
      description: 'Create beautiful docs with blocks, databases, and more',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Real-time Collaboration',
      description: 'Work together with your team in real-time',
    },
    {
      icon: <Share2 className="h-8 w-8" />,
      title: 'Easy Sharing',
      description: 'Share pages publicly or with your team',
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: 'Pre-built Templates',
      description: 'Get started quickly with ready-to-use templates',
    },
  ];

  return (
    <Dialog open onOpenChange={onSkip}>
      <DialogContent className="max-w-4xl mb-20 sm:mb-0">
        <div className="py-8 px-4 text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="text-6xl mb-4">📚</div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome to {currentCompany?.name || 'Your'} SOPs
            </h1>
            <p className="text-xl text-muted-foreground">
              Your workspace for creating and managing standard operating procedures
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 border rounded-lg text-left hover:border-primary transition-colors"
              >
                <div className="text-primary mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onSkip}>
              Skip Tour
            </Button>
            <Button onClick={onGetStarted} size="lg">
              Get Started
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
