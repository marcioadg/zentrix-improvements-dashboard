
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Users, Heart, MessageCircle, ThumbsUp, Award, ChevronDown, ChevronUp, TrendingUp, Lightbulb, HelpCircle, Brain, Hand, BookUser } from 'lucide-react';

interface TeamBuildingSectionProps {
  teamId: string;
}

interface FeedbackItem {
  id: string;
  memberName: string;
  strengths: string;
  growthAreas: string;
}

export const TeamBuildingSection: React.FC<TeamBuildingSectionProps> = ({ teamId }) => {
  const [currentExercise, setCurrentExercise] = useState<'history' | 'feedback' | 'lifeline' | 'personality' | 'fingers' | 'userManual' | null>(null);
  const [personalHistories, setPersonalHistories] = useState<{[key: string]: string}>({});
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);

  const exercises = [
    {
      id: 'history',
      title: 'Personal Histories',
      duration: '45 min',
      description: 'Share personal stories to build trust and understanding',
      icon: Heart,
    },
    {
      id: 'feedback',
      title: 'Like & Wish',
      duration: '60-75 min',
      description: 'Give and receive appreciation and growth wishes',
      icon: Award,
    },
    {
      id: 'lifeline',
      title: 'Lifeline Exercise',
      duration: '45-60 min',
      description: 'Draw your life journey and identify crucible moments that shaped who you are',
      icon: TrendingUp,
    },
    {
      id: 'personality',
      title: 'Personality Profiling',
      duration: '60-90 min',
      description: 'Deep dive into personality tools to understand each other better',
      icon: Brain,
    },
    {
      id: 'fingers',
      title: '5 Fingers',
      duration: '15-20 min',
      description: 'Quick check-in using your hand as a guide',
      icon: Hand,
    },
    {
      id: 'userManual',
      title: 'Personal User Manual',
      duration: '20-30 min',
      description: 'Share how you work best to improve day-to-day collaboration',
      icon: BookUser,
    },
  ];

  const historyPrompts = [
    "Where did you grow up?",
    "How many siblings do you have?",
    "What was your first job?",
    "What was your biggest challenge growing up?",
    "What are you most proud of outside of work?",
    "What's something most people don't know about you?",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Team Building</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Strengthen team trust and communication through structured exercises. 
          This is dedicated time for vulnerability and connection.
        </p>
      </div>

      {/* Exercise Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {exercises.map((exercise) => {
          const Icon = exercise.icon;
          const isActive = currentExercise === exercise.id;
          return (
            <button
              key={exercise.id}
              onClick={() => setCurrentExercise(isActive ? null : exercise.id as 'history' | 'feedback' | 'lifeline' | 'personality' | 'fingers' | 'userManual')}
              className={`p-4 rounded-lg border text-left transition-all ${
                isActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{exercise.title}</h3>
                    <span className="text-xs text-muted-foreground">{exercise.duration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{exercise.description}</p>
                </div>
                {isActive ? (
                  <ChevronUp className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Personal Histories Exercise */}
      {currentExercise === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Personal Histories Exercise
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each team member takes turns answering these questions. The goal is to build trust 
              through vulnerability and understanding each other's backgrounds.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyPrompts.map((prompt, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">{index + 1}.</span>
                    <p className="text-sm font-medium">{prompt}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-900">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-pink-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Facilitation Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go around the room and have each person answer all questions before moving to the next person. 
                    Allow 5-7 minutes per person. Listen actively and ask follow-up questions to show genuine interest.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Exercise */}
      {currentExercise === 'feedback' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Like & Wish
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each team member receives feedback from others: what they like about them and what they wish for their growth.
              This builds awareness and trust.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-success/5 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-start gap-2">
                  <ThumbsUp className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Like</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "One thing I really like about working with you is..." <br />
                      "You're exceptionally good at..."
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-primary/5 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-2">
                  <Award className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Wish</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      "One thing I wish for you is..." <br />
                      "I'd love to see you..."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Process Steps */}
            <div className="space-y-3">
              <p className="font-medium">Process:</p>
              <div className="space-y-2">
                {[
                  "Select one team member to receive feedback (the 'subject')",
                  "Each other team member shares one thing they like about the subject",
                  "Each team member then shares one wish for the subject's growth",
                  "The subject listens without defending or explaining",
                  "The subject thanks the group and shares one key takeaway",
                  "Rotate to the next team member",
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Facilitation Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Allow approximately 10-15 minutes per person. Encourage specific, actionable feedback. 
                    Remind participants that growth areas should be delivered with care and positive intent.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifeline Exercise */}
      {currentExercise === 'lifeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Lifeline Exercise
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              This deep reflection exercise helps team members identify stories and "crucible moments" 
              that shaped who they are today, their values, and their motivations in learning and leading.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Setup Instructions */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-900">
              <p className="font-medium text-sm mb-2">Setup (Individual Work - 20 min)</p>
              <div className="space-y-3">
                {[
                  "Get a blank sheet of paper (A4 or letter size)",
                  "Draw a horizontal line across the middle of the page (this is your timeline)",
                  "At the left edge, draw a vertical line. Write 'happy, satisfied, fulfilled' at the top and 'unhappy, frustrated, unsatisfied' at the bottom",
                  "Write '0' (birth) at the left junction and your current age at the far right of the horizontal line",
                  "Plot significant events and relationships on the timeline, placing them above or below the line based on how you felt at the time",
                  "Connect the dots with a line to create your lifeline",
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Crucible Moments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <p className="font-medium">Identify Your Crucible Moments</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select 4 "turning points" from your lifeline — moments where you learned something 
                that fundamentally changed who you are as a person.
              </p>
              
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <p className="font-medium text-sm mb-3">For each crucible moment, answer:</p>
                <div className="space-y-2">
                  {[
                    "What was your insight from this crucible?",
                    "What resources helped you get through? (People, Ideas, Finances, Institutions, etc.)",
                    "How did you learn from this experience?",
                  ].map((question, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm">{question}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reflection Questions */}
            <div>
              <p className="font-medium mb-3">Final Reflection</p>
              <p className="text-sm text-muted-foreground mb-3">
                Look at your crucible moments as a whole and consider:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { q: "What do your crucible moments have in common?", color: "bg-primary/5 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" },
                  { q: "What differences were there in the support resources that helped you?", color: "bg-success/5 dark:bg-green-950/20 border-green-200 dark:border-green-900" },
                  { q: "How would you conclude that you learn important things?", color: "bg-secondary/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900" },
                ].map((item, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${item.color}`}>
                    <p className="text-sm font-medium">{item.q}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Facilitation Tip */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-900">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Facilitation Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    After individual work, have each person share 2-3 key crucible moments with the team 
                    (10-15 minutes per person). Focus on what they learned and how it shaped who they are today. 
                    This exercise builds deep trust and understanding. Adapted from The Entrepreneurs' Organisation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personality Profiling Exercise */}
      {currentExercise === 'personality' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-500" />
              Personality Profiling Deep Dive
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Use a personality profiling tool to help team members understand each other's 
              working styles, communication preferences, and natural tendencies.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-900">
              <p className="font-medium text-sm mb-3">Goal</p>
              <p className="text-sm text-muted-foreground">
                The purpose isn't to label people, but to create shared language and understanding. 
                When team members understand how each other thinks and operates, collaboration becomes smoother 
                and conflicts become easier to navigate.
              </p>
            </div>

            <div className="space-y-3">
              <p className="font-medium">Suggested Process:</p>
              <div className="space-y-2">
                {[
                  "Have all team members complete the assessment before the meeting",
                  "Share and discuss individual results with the group",
                  "Identify patterns and differences across the team",
                  "Discuss how to leverage differences as strengths",
                  "Create agreements on how to work better together",
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300 text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-900">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-violet-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Facilitation Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Popular tools include Predictive Index, Culture Index, Zentrix Insights, DISC, Myers-Briggs, Kolbe, or StrengthsFinder. 
                    Choose one that fits your team's culture. Focus on understanding, not judgment.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5 Fingers Exercise */}
      {currentExercise === 'fingers' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5 text-teal-500" />
              5 Fingers (Seated Version)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              A quick, meaningful check-in where each person uses their hand as a guide to share 
              what's on their mind and heart.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {[
                { finger: '👍 Thumb', prompt: 'Something I\'m proud of', color: 'bg-success/5 dark:bg-green-950/20 border-green-200 dark:border-green-900' },
                { finger: '👆 Index', prompt: 'Something I\'m pointing toward (a goal)', color: 'bg-primary/5 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' },
                { finger: '🖕 Middle', prompt: 'Something that\'s challenging me', color: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900' },
                { finger: '💍 Ring', prompt: 'Someone or something I\'m committed to', color: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900' },
                { finger: '🤙 Pinky', prompt: 'A small thing that makes me happy', color: 'bg-secondary/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900' },
              ].map((item, index) => (
                <div key={index} className={`p-4 rounded-lg border ${item.color}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.finger}</span>
                    <p className="text-sm font-medium">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-teal-50 dark:bg-teal-950/20 rounded-lg border border-teal-200 dark:border-teal-900">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-teal-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Facilitation Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Each person holds up their hand and goes through each finger one at a time. 
                    Allow 2-3 minutes per person. This is a great warm-up exercise or quick team pulse check.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal User Manual Exercise */}
      {currentExercise === 'userManual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookUser className="h-5 w-5 text-cyan-500" />
              Personal User Manual (Working with Me)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each person shares how they work best, helping the team improve day-to-day collaboration 
              by understanding each other's preferences and needs.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Topics to Share */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Communication Style",
                  prompt: "How do you prefer to communicate? (Email, Slack, calls, in-person)",
                  color: "bg-primary/5 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
                },
                {
                  title: "Best Time of Day",
                  prompt: "When are you at your best? Morning person or night owl?",
                  color: "bg-success/5 dark:bg-green-950/20 border-green-200 dark:border-green-900",
                },
                {
                  title: "How I Handle Stress",
                  prompt: "What does stress look like for you? How can others help?",
                  color: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
                },
                {
                  title: "Pet Peeves",
                  prompt: "What frustrates you or gets in the way of your best work?",
                  color: "bg-destructive/5 dark:bg-red-950/20 border-red-200 dark:border-red-900",
                },
                {
                  title: "What I Need to Thrive",
                  prompt: "What do you need from your team to do your best work?",
                  color: "bg-secondary/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900",
                },
              ].map((topic, index) => (
                <div key={index} className={`p-4 rounded-lg border ${topic.color}`}>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-300 text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{topic.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{topic.prompt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Process */}
            <div className="space-y-3">
              <p className="font-medium">Process:</p>
              <div className="space-y-2">
                {[
                  "Each person takes 3-5 minutes to share their 'user manual'",
                  "Cover all 5 topics: communication style, best time, stress response, pet peeves, and what you need",
                  "Others listen actively and may ask clarifying questions",
                  "Consider documenting these in a shared team space for future reference",
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Facilitation Tip */}
            <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg border border-cyan-200 dark:border-cyan-900">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-cyan-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Facilitation Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This exercise is especially valuable for new teams or when onboarding new members. 
                    The information shared here is practical and immediately actionable — encourage the team 
                    to reference these 'user manuals' in their daily interactions.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Exercise Selected */}
      {currentExercise === null && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select an exercise above to begin</p>
        </div>
      )}
    </div>
  );
};

export default TeamBuildingSection;
