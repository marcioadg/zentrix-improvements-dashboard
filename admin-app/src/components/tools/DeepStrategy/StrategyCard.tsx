import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';

interface StrategyCardProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  response: string;
  onResponseChange: (response: string) => void;
}

export default function StrategyCard({
  question,
  questionNumber,
  totalQuestions,
  response,
  onResponseChange,
}: StrategyCardProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (value: string) => {
    onResponseChange(value);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card 
        className={`p-6 transition-all duration-300 ${
          isFocused ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
      >
        <div className="space-y-4">
          {/* Question Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  {questionNumber}
                </span>
                <span className="text-sm text-muted-foreground">
                  {questionNumber} of {totalQuestions}
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-relaxed">
                {question}
              </h3>
            </div>
          </div>

          {/* Response Field */}
          <div className="space-y-2">
            <Textarea
              placeholder="Share your thoughts and insights here..."
              value={response}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`min-h-[120px] transition-all duration-300 ${
                isFocused ? 'ring-1 ring-primary' : ''
              }`}
              autoResize
            />
            
            {/* Progress Indicator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {response.trim() ? (
                  <span className="text-success font-medium">✓ Answered</span>
                ) : (
                  <span>Pending response</span>
                )}
              </span>
              <span>{response.length} characters</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}