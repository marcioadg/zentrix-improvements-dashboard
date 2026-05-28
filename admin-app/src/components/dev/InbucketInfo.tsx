import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ExternalLink } from 'lucide-react';

export const InbucketInfo = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    return null;
  }

  const openInbucket = () => {
    window.open('http://127.0.0.1:54325', '_blank');
  };

  return (
    <Card className="mb-6 border-blue-200 bg-primary/5 dark:bg-blue-950 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary dark:text-blue-400" />
          <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
            Development Email Testing
          </CardTitle>
        </div>
        <CardDescription className="text-primary dark:text-blue-300">
          In development, emails are captured by Inbucket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-primary dark:text-blue-300">
          <p className="mb-2">
            All confirmation emails are sent to Inbucket (local email server for development).
          </p>
          <p className="mb-3">
            <strong>To view confirmation emails:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Click the button below to open Inbucket</li>
            <li>Look for emails sent to your address</li>
            <li>Click on the confirmation email</li>
            <li>Click the confirmation link in the email</li>
          </ol>
        </div>
        
        <Button 
          onClick={openInbucket}
          variant="outline"
          className="w-full border-blue-300 text-primary hover:bg-primary/10 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Inbucket (Local Email)
        </Button>
        
        <div className="text-xs text-primary dark:text-blue-400 mt-2">
          📍 URL: http://127.0.0.1:54325
        </div>
      </CardContent>
    </Card>
  );
};

export default InbucketInfo;