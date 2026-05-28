import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEOSLife, EOSLifeRating, EOS_LIFE_CATEGORIES } from '@/hooks/useEOSLife';
import { Slider } from '@/components/ui/slider';
import { logger } from '@/utils/logger';

export const LifeRating: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [ratings, setRatings] = useState<EOSLifeRating>({
    do_what_you_love: 5,
    with_people_you_love: 5,
    make_huge_difference: 5,
    be_compensated_appropriately: 5,
    time_for_passions: 5,
  });
  const [notes, setNotes] = useState('');
  const { sessions, isLoading, saveSession } = useEOSLife();

  // Calculate overall average in real-time
  const overallAverage = useMemo(() => {
    const ratingsArray = Object.values(ratings);
    return (ratingsArray.reduce((sum, rating) => sum + rating, 0) / ratingsArray.length).toFixed(1);
  }, [ratings]);

  // Load existing session for selected date
  useEffect(() => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const existingSession = sessions.find(session => session.session_date === dateString);
    
    if (existingSession) {
      setRatings(existingSession.ratings);
      setNotes(existingSession.notes || '');
    } else {
      // Reset to default values for new date
      setRatings({
        do_what_you_love: 5,
        with_people_you_love: 5,
        make_huge_difference: 5,
        be_compensated_appropriately: 5,
        time_for_passions: 5,
      });
      setNotes('');
    }
  }, [selectedDate, sessions]);

  const handleRatingChange = (category: keyof EOSLifeRating, value: number[]) => {
    setRatings(prev => ({
      ...prev,
      [category]: value[0]
    }));
  };

  const handleSave = async () => {
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      await saveSession(dateString, ratings, notes);
    } catch (error) {
      logger.error('Error saving session:', error);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-success';
    if (rating >= 6) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Overall Score Display */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className={cn("text-6xl font-bold mb-2", getRatingColor(parseFloat(overallAverage)))}>
              {overallAverage}
            </div>
            <p className="text-lg text-muted-foreground">Overall Life Score</p>
          </div>
        </CardContent>
      </Card>

      {/* Rating Categories */}
      <div className="grid gap-4">
        {EOS_LIFE_CATEGORIES.map((category) => (
          <Card key={category.key} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{category.label}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <span className={cn("text-2xl font-bold", getRatingColor(ratings[category.key]))}>
                    {ratings[category.key]}
                  </span>
                </div>
                <Slider
                  value={[ratings[category.key]]}
                  onValueChange={(value) => handleRatingChange(category.key, value)}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 - Poor</span>
                  <span>5 - Average</span>
                  <span>10 - Excellent</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Notes & Reflections</CardTitle>
          <CardDescription>
            Add any thoughts, wins, challenges, or plans for improvement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What went well today? What could be improved? What are you grateful for?"
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={isLoading} 
        size="lg"
        className="w-full"
      >
        <Save className="mr-2 h-4 w-4" />
        {isLoading ? 'Saving...' : 'Save Life Rating'}
      </Button>
    </div>
  );
};