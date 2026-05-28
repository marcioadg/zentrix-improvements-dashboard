import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useClarityBreaks } from "@/hooks/useClarityBreaks";
import { useAutosaveText } from "@/hooks/useAutosaveText";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useTools } from "@/contexts/ToolsContext";
import { useToast } from "@/hooks/use-toast";
import { useClarityBreakTimer } from "@/contexts/ClarityBreakContext";
import ClarityBreakTimer from "./ClarityBreakTimer";
import PrivacyIndicator from "./PrivacyIndicator";
import ClarityBreakResume from "./ClarityBreakResume";
import { CheckCircle, Clock, ArrowLeft, PauseCircle } from "lucide-react";
import { logger } from '@/utils/logger';

const FORCED_PROMPTS = [
  "What is stopping us from 10X the business?",
  "Am I focusing on the most important things?",
  "Do I have the Right People in the Right Seats to grow?"
];

const RANDOMIZABLE_PROMPTS = [
  "What is the one \"people move\" that I must make this quarter?",
  "Is the Vision and Plan for the business/department on track?",
  "How strong is my bench?",
  "If I lose a key player, do I have someone ready to fill the seat?",
  "Are my processes working well?",
  "What seems overly complicated that must be simplified?",
  "Are we focusing on better, more, new, in this order?",
  "Do I understand what my direct reports truly love to do and are great at doing?",
  "Am I leveraging their strengths?",
  "What can I delegate to others in order to use my time more effectively?",
  "What can we do to be more proactive versus being reactive?",
  "What can I do to improve communication?",
  "What's my top priority this week? This month?",
  "What has been taking my attention?",
  "Where should my attention be?",
  "Where do I want to be spending my time?",
  "What seats am I sitting in that I enjoy?",
  "What seats am I sitting in that I don't like?",
  "What are my unique abilities?",
  "How can I coach my team towards growth?",
  "What should I be coaching team members on?",
  "What does my ideal EOS life look like?",
  "What is stopping me from living my ideal EOS life?",
  "What is a major hassle for my team that needs to be resolved?",
  "What is a major hassle for the organization that needs to be resolved?",
  "What is a major hassle for our customers that needs to be resolved?",
  "How can I show appreciation/give praise in more specific ways?",
  "What professional development do I/we need to grow into our future?",
  "VTO: Review your vision, goals, and key milestones to ensure alignment and clarity across the organization.",
  "Accountability Chart: Confirm that every seat has clear ownership and that roles match current and future needs.",
  "Scorecard: Evaluate key metrics to identify where performance is on track and where attention is needed.",
  "Delegate & Elevate: Identify low-value tasks you should delegate so you can focus on your unique abilities.",
  "Notes or key takeaways: Revisit insights from books, webinars, masterminds, or podcasts to spark new ideas and reinforce strategic thinking."
];

const TOTAL_QUESTIONS = 10;

// Function to get 7 random questions from the randomizable pool
function getRandomizedQuestions(): string[] {
  const shuffled = [...RANDOMIZABLE_PROMPTS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 7);
}

export default function ClarityBreakView({ clarityBreaksHook }: { clarityBreaksHook: ReturnType<typeof useClarityBreaks> }) {
  // Timer context for persistence
  const { timerState, updateTimerState, clearTimerState, syncToDatabase } = useClarityBreakTimer();
  
  // Local UI state
  const [started, setStarted] = useState(timerState.isRunning);
  const [time, setTime] = useState(30); // minutes
  const [elapsed, setElapsed] = useState(timerState.elapsedSeconds);
  const [notes, setNotes] = useState(Array(TOTAL_QUESTIONS).fill(""));
  const [promptIndex, setPromptIndex] = useState(timerState.promptIndex);
  const [sessionId, setSessionId] = useState<string | null>(timerState.sessionId);
  const [insights, setInsights] = useState(timerState.insights);
  const [isCompleting, setIsCompleting] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const [overrideUntilTime, setOverrideUntilTime] = useState(0);
  const [savedPrompts, setSavedPrompts] = useState<Set<number>>(new Set());
  const [sessionPrompts, setSessionPrompts] = useState<string[]>(timerState.sessionPrompts);
  const [showingInsights, setShowingInsights] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(timerState.isPaused);
  const [pauseReason, setPauseReason] = useState<string>("");
  
  // Hooks for detecting navigation and visibility changes
  const isPageVisible = usePageVisibility();
  const location = useLocation();
  const toolsContext = useTools();
  const activeTool = toolsContext?.activeTool;
  const { toast } = useToast();
  const wasVisibleRef = useRef(isPageVisible);
  const previousLocationRef = useRef(location.pathname);
  const previousToolRef = useRef(activeTool);
  
  // Sync local state to context when critical values change
  useEffect(() => {
    if (started && sessionId) {
      updateTimerState({
        sessionId,
        isRunning: started,
        elapsedSeconds: elapsed,
        isPaused: isTimerPaused,
        promptIndex,
        notes: notes.reduce((acc, note, i) => ({ ...acc, [i]: note }), {}),
        insights,
        sessionPrompts,
      });
    }
  }, [elapsed, isTimerPaused, started, sessionId]);

  const { 
    incompleteSession, 
    createSession, 
    resumeSession, 
    abandonSession, 
    saveEntry, 
    completeSession 
  } = clarityBreaksHook;

  // Auto-pause timer when page visibility changes
  useEffect(() => {
    if (!started) return;

    // Page became hidden
    if (!isPageVisible && wasVisibleRef.current) {
      logger.log('📍 Page hidden - pausing Clarity Break timer');
      setIsTimerPaused(true);
      setPauseReason("page-hidden");
    }
    
    // Page became visible again
    if (isPageVisible && !wasVisibleRef.current) {
      logger.log('📍 Page visible - keeping timer paused until user resumes');
      // Keep paused - user needs to manually resume
    }

    wasVisibleRef.current = isPageVisible;
  }, [isPageVisible, started]);

  // Auto-pause timer on route change
  useEffect(() => {
    if (!started) return;

    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;

    // Detect route change away from Clarity Break
    if (currentPath !== previousPath) {
      const isOnClarityBreakRoute = currentPath === '/clarity-break' || 
                                     (currentPath === '/tools' && activeTool === 'clarity-break');
      
      if (!isOnClarityBreakRoute && previousPath !== currentPath) {
        logger.log('📍 Route changed away from Clarity Break - pausing timer');
        setIsTimerPaused(true);
        setPauseReason("route-change");
        toast({
          title: "Timer Paused",
          description: "Your Clarity Break timer has been paused. Return to resume.",
          variant: "destructive",
        });
      }

      previousLocationRef.current = currentPath;
    }
  }, [location.pathname, started, activeTool, toast]);

  // Auto-pause timer on tool switch
  useEffect(() => {
    if (!started) return;

    const currentTool = activeTool;
    const previousTool = previousToolRef.current;

    // Detect tool switch away from Clarity Break
    if (currentTool !== previousTool && currentTool !== 'clarity-break') {
      logger.log('📍 Tool switched away from Clarity Break - pausing timer');
      setIsTimerPaused(true);
      setPauseReason("tool-switch");
      toast({
        title: "Timer Paused",
        description: "Your Clarity Break timer has been paused. Return to resume.",
        variant: "destructive",
      });
    }

    // Tool switched back to Clarity Break - keep paused until user resumes
    if (currentTool === 'clarity-break' && previousTool !== 'clarity-break') {
      logger.log('📍 Returned to Clarity Break - timer remains paused');
    }

    previousToolRef.current = currentTool;
  }, [activeTool, started, toast]);

  // Cleanup: pause timer on component unmount
  useEffect(() => {
    return () => {
      if (started) {
        logger.log('📍 Component unmounting - pausing timer');
        setIsTimerPaused(true);
      }
    };
  }, [started]);

  // Auto-save current prompt response
  const { isSaving, hasUnsavedChanges } = useAutosaveText(
    notes[promptIndex],
    {
      delay: 2000,
      onSave: async (text) => {
        if (sessionId && text.trim() && sessionPrompts.length > 0) {
          await saveEntry(sessionId, sessionPrompts[promptIndex], text);
          setSavedPrompts(prev => new Set(prev).add(promptIndex));
        }
      },
      enabled: started && sessionId !== null && sessionPrompts.length > 0 && !showingInsights,
    }
  );

  async function savePreviousPrompt(currentIndex: number) {
    if (sessionId && notes[currentIndex] && notes[currentIndex].trim() && sessionPrompts.length > 0) {
      try {
        await saveEntry(sessionId, sessionPrompts[currentIndex], notes[currentIndex]);
        setSavedPrompts(prev => new Set(prev).add(currentIndex));
        logger.log(`Saved response for prompt ${currentIndex}: "${sessionPrompts[currentIndex]}"`);
      } catch (error) {
        logger.error(`Failed to save response for prompt ${currentIndex}:`, error);
      }
    }
  }

  async function saveAllResponses() {
    if (!sessionId || sessionPrompts.length === 0) return;
    
    const savePromises = notes.map(async (note, index) => {
      if (note && note.trim()) {
        try {
          await saveEntry(sessionId, sessionPrompts[index], note);
          setSavedPrompts(prev => new Set(prev).add(index));
          logger.log(`Saved response for prompt ${index}: "${sessionPrompts[index]}"`);
        } catch (error) {
          logger.error(`Failed to save response for prompt ${index}:`, error);
        }
      }
    });

    await Promise.all(savePromises);
  }

  async function startBreak() {
    // Generate session prompts: 3 forced + 7 randomized
    const randomQuestions = getRandomizedQuestions();
    const allPrompts = [...FORCED_PROMPTS, ...randomQuestions];
    setSessionPrompts(allPrompts);
    
    const session = await createSession(time, allPrompts);
    if (session) {
      setSessionId(session.id);
      setStarted(true);
      setElapsed(0);
      setPromptIndex(0);
      setNotes(Array(TOTAL_QUESTIONS).fill(""));
      setInsights("");
      setUserOverride(false);
      setOverrideUntilTime(0);
      setSavedPrompts(new Set());
      setShowingInsights(false);
      setIsTimerPaused(false);
      setPauseReason("");
      
      // Initialize context state
      updateTimerState({
        sessionId: session.id,
        isRunning: true,
        elapsedSeconds: 0,
        isPaused: false,
        promptIndex: 0,
        notes: {},
        insights: "",
        sessionPrompts: allPrompts,
      });
    }
  }

  async function handleResumeSession() {
    if (!incompleteSession) return;

    const resumeData = await resumeSession(incompleteSession);
    if (!resumeData) return;

    const { session, entries, sessionPrompts: resumedPrompts } = resumeData;
    
    // Calculate elapsed time since session started
    const startTime = new Date(session.started_at).getTime();
    const currentTime = new Date().getTime();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
    
    // Restore session state
    setSessionId(session.id);
    setTime(session.duration_minutes || 30);
    setSessionPrompts(resumedPrompts);
    setElapsed(elapsedSeconds);
    
    // Restore notes from entries
    const restoredNotes = Array(TOTAL_QUESTIONS).fill("");
    const savedIndices = new Set<number>();
    
    entries.forEach(entry => {
      const promptIndex = resumedPrompts.findIndex(p => p === entry.prompt);
      if (promptIndex !== -1 && entry.response) {
        restoredNotes[promptIndex] = entry.response;
        savedIndices.add(promptIndex);
      }
    });
    
    setNotes(restoredNotes);
    setSavedPrompts(savedIndices);
    
    // Calculate current prompt index based on time or saved responses
    const tenthTime = (session.duration_minutes || 30) * 60 / 10;
    const timeBasedIndex = Math.min(Math.floor(elapsedSeconds / tenthTime), TOTAL_QUESTIONS - 1);
    const responseBasedIndex = entries.length;
    
    // Use the higher of the two to determine where user should be
    const currentIndex = Math.max(timeBasedIndex, responseBasedIndex, 0);
    setPromptIndex(Math.min(currentIndex, TOTAL_QUESTIONS - 1));
    
    setStarted(true);
    setUserOverride(false);
    setOverrideUntilTime(0);
    setShowingInsights(false);
    setInsights("");
    setIsTimerPaused(false);
    setPauseReason("");
  }

  function handleNote(idx: number, value: string) {
    setNotes(n =>
      n.map((old, i) => (i === idx ? value : old))
    );
  }

  async function handleTimeUpdate(newElapsed: number) {
    setElapsed(newElapsed);
    
    // Auto-advance prompts every tenth of the time (10 questions), but only if user hasn't overridden
    const tenthTime = (time * 60) / 10;
    const naturalPromptIndex = Math.min(
      Math.floor(newElapsed / tenthTime),
      TOTAL_QUESTIONS - 1
    );
    
    // Only auto-advance if:
    // 1. User hasn't manually overridden navigation, OR
    // 2. We've progressed past the override time threshold
    // 3. We're not showing insights view
    if (!userOverride || newElapsed > overrideUntilTime) {
      if (naturalPromptIndex !== promptIndex && !showingInsights) {
        // Save current prompt before advancing
        await savePreviousPrompt(promptIndex);
        
        setPromptIndex(naturalPromptIndex);
        // Clear override since we've naturally progressed
        if (userOverride && newElapsed > overrideUntilTime) {
          setUserOverride(false);
          setOverrideUntilTime(0);
        }
      }
    }
  }

  async function handleManualPromptChange(newIndex: number) {
    // Save current prompt before switching
    if (!showingInsights) {
      await savePreviousPrompt(promptIndex);
    }
    
    setPromptIndex(newIndex);
    setShowingInsights(false);
    
    // Set user override to prevent auto-advance from interfering
    setUserOverride(true);
    
    // Calculate when to allow auto-advance to resume
    // Allow auto-advance to resume at the next natural prompt transition
    const tenthTime = (time * 60) / 10;
    const nextNaturalTransition = Math.ceil((elapsed + 1) / tenthTime) * tenthTime;
    setOverrideUntilTime(nextNaturalTransition);
  }

  async function proceedToInsights() {
    // Save current prompt before moving to insights
    await savePreviousPrompt(promptIndex);
    setShowingInsights(true);
  }

  async function handleComplete() {
    if (!sessionId) return;
    
    setIsCompleting(true);
    
    // Save all responses before completing
    await saveAllResponses();
    
    // Complete the session with insights
    await completeSession(sessionId, insights);
    
    // Clear context timer state
    clearTimerState();
    
    // Reset local state
    setStarted(false);
    setSessionId(null);
    setElapsed(0);
    setPromptIndex(0);
    setNotes(Array(TOTAL_QUESTIONS).fill(""));
    setInsights("");
    setUserOverride(false);
    setOverrideUntilTime(0);
    setSavedPrompts(new Set());
    setSessionPrompts([]);
    setIsCompleting(false);
    setShowingInsights(false);
    setIsTimerPaused(false);
    setPauseReason("");
  }

  async function handleAbandonSession() {
    if (incompleteSession) {
      await abandonSession(incompleteSession.id);
    }
  }

  return (
    <section className="rounded-lg p-4 sm:p-6 lg:p-8 bg-card border border-border min-h-[400px] sm:min-h-[500px] flex flex-col relative">
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
        <PrivacyIndicator />
      </div>

      {/* Pause indicator banner */}
      {started && isTimerPaused && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
          <PauseCircle className="w-5 h-5 text-warning dark:text-orange-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Timer Paused</p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {pauseReason === "page-hidden" && "Your timer was paused when you switched tabs"}
              {pauseReason === "route-change" && "Your timer was paused when you navigated away"}
              {pauseReason === "tool-switch" && "Your timer was paused when you switched tools"}
              {!pauseReason && "Your timer is paused"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setIsTimerPaused(false);
              setPauseReason("");
              logger.log('📍 Timer manually resumed by user');
            }}
            className="shrink-0"
          >
            Resume
          </Button>
        </div>
      )}

      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          {incompleteSession ? (
            <ClarityBreakResume
              session={incompleteSession}
              onResumeSession={handleResumeSession}
              onAbandonSession={handleAbandonSession}
              onStartNewSession={startBreak}
              time={time}
              setTime={setTime}
            />
          ) : (
            <>
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-center text-foreground">Start a Clarity Break</h2>
              <div className="flex gap-2 sm:gap-3 items-center mb-5 justify-center">
                <input
                  type="number"
                  min={15}
                  max={120}
                  step={15}
                  value={time}
                  onChange={e => setTime(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-3 py-2 w-16 sm:w-20 text-center text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  aria-label="Break duration in minutes"
                />
                <span className="text-muted-foreground text-sm">minutes</span>
              </div>
              <Button size="default" onClick={startBreak} className="w-full sm:w-auto">Start Clarity Break</Button>
              
              <div className="mt-6 sm:mt-8 text-center max-w-2xl px-2">
                <h3 className="font-medium mb-4 text-sm sm:text-base">During your session, you'll reflect on:</h3>
                
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 text-left">
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground mb-2 text-sm sm:text-base">Core Questions (Always Asked):</h4>
                    <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      {FORCED_PROMPTS.map((prompt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary font-medium flex-shrink-0 text-xs bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">{idx + 1}</span>
                          <span className="text-sm">{prompt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground mb-2 text-sm sm:text-base">Additional Questions (7 randomized):</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      Selected randomly from {RANDOMIZABLE_PROMPTS.length} strategic questions covering:
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">People & Leadership Development</div>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">Process & Operational Excellence</div>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">Strategic Focus & Priorities</div>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">Time Management & Delegation</div>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">EOS Tools & Implementation</div>
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">Team Development & Communication</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : showingInsights ? (
        <div className="flex-1 flex flex-col gap-4">
          <ClarityBreakTimer
            totalMinutes={time}
            onTimeUpdate={handleTimeUpdate}
            onComplete={handleComplete}
            isActive={started && !isTimerPaused}
            initialElapsed={elapsed}
          />

          <div className="flex-1 flex flex-col gap-4">
            <div className="text-center px-2">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-primary">Session Complete! 🎉</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                You've completed all {TOTAL_QUESTIONS} questions. Take a moment to capture your key insights and action items.
              </p>
            </div>

            <div className="flex flex-col px-2">
              <label className="text-base sm:text-lg font-semibold mb-3">Key Insights & Action Items:</label>
              <Textarea
                className="min-h-[300px] sm:min-h-[400px]"
                value={insights}
                onChange={e => setInsights(e.target.value)}
                placeholder="What are your main takeaways from this session? What specific actions will you take based on your reflections?"
              />
            </div>

            <div className="flex gap-1 sm:gap-2 justify-center flex-wrap px-2">
              {Array.from({ length: TOTAL_QUESTIONS }, (_, idx) => (
                <Button 
                  key={idx} 
                  onClick={() => handleManualPromptChange(idx)} 
                  variant="outline"
                  size="sm"
                  className={`${notes[idx] || savedPrompts.has(idx) ? "ring-2 ring-green-200" : ""} relative min-w-[32px] sm:min-w-[40px] text-xs sm:text-sm`}
                >
                  {idx + 1}
                  {(notes[idx] || savedPrompts.has(idx)) && (
                    <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 ml-0 sm:ml-1" />
                  )}
                </Button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center px-2">
              <Button 
                variant="outline"
                onClick={() => setShowingInsights(false)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Questions</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={isCompleting}
                size="lg"
                className="w-full sm:w-auto"
              >
                {isCompleting ? "Completing..." : "Complete Session"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          <ClarityBreakTimer
            totalMinutes={time}
            onTimeUpdate={handleTimeUpdate}
            onComplete={handleComplete}
            isActive={started && !isTimerPaused}
            initialElapsed={elapsed}
          />

          <div className="flex-1 flex flex-col gap-4">
            <div className="text-center px-2">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">
                  Question {promptIndex + 1} of {TOTAL_QUESTIONS}
                </span>
                {promptIndex < 3 && (
                  <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                    Core Question
                  </span>
                )}
              </div>
              <div className="text-lg sm:text-xl mb-4 text-primary font-medium leading-relaxed">
                {sessionPrompts[promptIndex] || "Loading question..."}
              </div>
            </div>

            <div className="flex flex-col px-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                <label className="font-medium text-sm sm:text-base">Your response:</label>
                {hasUnsavedChanges && (
                  <span className="text-xs text-warning flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isSaving ? "Saving..." : "Unsaved changes"}
                  </span>
                )}
                {savedPrompts.has(promptIndex) && !hasUnsavedChanges && (
                  <span className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Saved
                  </span>
                )}
              </div>
              <Textarea
                className="min-h-[200px] sm:min-h-[300px]"
                value={notes[promptIndex]}
                onChange={e => handleNote(promptIndex, e.target.value)}
                placeholder="Take your time to reflect and write your thoughts..."
              />
            </div>

            <div className="flex gap-1 sm:gap-2 justify-center flex-wrap px-2">
              {Array.from({ length: TOTAL_QUESTIONS }, (_, idx) => (
                <Button 
                  key={idx} 
                  onClick={() => handleManualPromptChange(idx)} 
                  variant={idx === promptIndex ? "default" : "outline"}
                  size="sm"
                  className={`${notes[idx] || savedPrompts.has(idx) ? "ring-2 ring-green-200" : ""} relative min-w-[32px] sm:min-w-[40px] text-xs sm:text-sm`}
                >
                  {idx + 1}
                  {(notes[idx] || savedPrompts.has(idx)) && (
                    <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 ml-0 sm:ml-1" />
                  )}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 justify-center px-2">
              <Button 
                onClick={proceedToInsights}
                className="flex items-center gap-2 w-full sm:w-auto"
                variant="outline"
              >
                Complete & Add Insights
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
