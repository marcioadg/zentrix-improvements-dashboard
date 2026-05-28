import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Trophy } from 'lucide-react';
import { useTrainingProgress } from '@/hooks/useTrainingProgress';
import { Badge } from '@/components/ui/badge';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  lessonSlug: string;
  pathSlug: string;
}

export const Quiz: React.FC<QuizProps> = ({ questions, lessonSlug, pathSlug }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const { completeLesson, getLessonProgress } = useTrainingProgress();

  const lessonProgress = getLessonProgress(lessonSlug);
  const isCompleted = lessonProgress?.status === 'completed';

  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    if (!submitted) {
      setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const score = calculateScore();
    
    // Mark lesson as complete with quiz score
    completeLesson({ 
      lessonSlug, 
      pathSlug,
      quizScore: score 
    });
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const allAnswered = questions.every(q => answers[q.id] !== undefined);
  const score = submitted ? calculateScore() : 0;
  const passed = score >= 70;

  return (
    <div className="space-y-6">
      {questions.map((question, qIndex) => {
        const userAnswer = answers[question.id];
        const isCorrect = submitted && userAnswer === question.correctAnswer;
        const isWrong = submitted && userAnswer !== question.correctAnswer && userAnswer !== undefined;

        return (
          <Card key={question.id} className={submitted ? (isCorrect ? 'border-green-500' : isWrong ? 'border-red-500' : '') : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-4">
                <Badge variant="secondary" className="mt-1">Q{qIndex + 1}</Badge>
                <h3 className="text-h5 flex-grow">{question.question}</h3>
                {submitted && (
                  isCorrect ? 
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" /> : 
                    isWrong ? <XCircle className="h-6 w-6 text-destructive flex-shrink-0" /> : null
                )}
              </div>

              <RadioGroup
                value={userAnswer?.toString()}
                onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                disabled={submitted}
              >
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const isThisCorrect = submitted && optionIndex === question.correctAnswer;
                    const isThisSelected = userAnswer === optionIndex;

                    return (
                      <div
                        key={optionIndex}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 ${
                          submitted ? (
                            isThisCorrect ? 'bg-success/5 dark:bg-green-950/20 border-green-500' :
                            isThisSelected && !isThisCorrect ? 'bg-destructive/5 dark:bg-red-950/20 border-red-500' :
                            'bg-muted/30'
                          ) : (
                            isThisSelected ? 'bg-primary/5 border-primary' : 'bg-background hover:bg-muted/30'
                          )
                        }`}
                      >
                        <RadioGroupItem 
                          value={optionIndex.toString()} 
                          id={`${question.id}-${optionIndex}`}
                          className="mt-1"
                        />
                        <Label 
                          htmlFor={`${question.id}-${optionIndex}`}
                          className="flex-grow cursor-pointer text-body leading-relaxed"
                        >
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>

              {submitted && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-body-sm text-foreground">
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Quiz Footer */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          {!submitted ? (
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-muted-foreground">
                Answer all questions to submit
              </p>
              <Button 
                onClick={handleSubmit}
                disabled={!allAnswered}
              >
                Submit Quiz
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-h4 flex items-center gap-2 mb-1">
                    {passed ? (
                      <>
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        <span>Congratulations!</span>
                      </>
                    ) : (
                      <span>Keep Learning!</span>
                    )}
                  </h3>
                  <p className="text-body-sm text-muted-foreground">
                    {passed 
                      ? 'You passed the quiz with a great score.'
                      : 'Review the material and try again. You need 70% to pass.'}
                  </p>
                </div>
                <Badge 
                  variant={passed ? 'default' : 'secondary'}
                  className="text-2xl px-4 py-2"
                >
                  {score}%
                </Badge>
              </div>

              {!passed && (
                <Button onClick={handleRetry} variant="outline" className="w-full">
                  Retry Quiz
                </Button>
              )}

              {passed && isCompleted && (
                <div className="flex items-center gap-2 justify-center text-success dark:text-green-400 pt-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-body-sm font-medium">Lesson Completed</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};