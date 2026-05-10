import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobs } from '@/lib/jobContext';
import { JobStatus } from '@/lib/types';
import { chatWithAgentFull } from '@/lib/agentService';
import { parseRecipe, parseFollowUp, getStepIcon } from '@/lib/recipeParser';
import type { Recipe, FollowUp, RecipeStep } from '@/types/recipe';
import {
  ArrowLeft,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  ChefHat,
  AlertTriangle,
  Lightbulb,
  Timer,
  Check,
  Send,
  Loader2,
  Utensils,
  Scale,
  RotateCcw,
  Sparkles,
  Zap,
  Info,
  Flame,
  Wine,
  BookOpen,
} from 'lucide-react';

interface CookingSessionProps {
  onBack?: () => void;
  onNewSession: () => void;
}

// --- Internal Components ---

const TimerWidget = ({ duration }: { duration: string }) => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parseDuration = (d: string) => {
    const m = d.match(/(\d+)\s*min/i);
    const h = d.match(/(\d+)\s*hr/i);
    return ((h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0)) * 60;
  };

  const total = useMemo(() => parseDuration(duration), [duration]);
  const remaining = Math.max(total - seconds, 0);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const toggle = () => {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setSeconds(0);
  };

  if (total === 0) return null;

  const display = `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 bg-void/40 border border-primary/20 rounded-xl px-4 py-2">
      <button 
        onClick={toggle}
        className={`transition-colors ${running ? 'text-destructive animate-pulse' : 'text-primary hover:text-primary-foreground'}`}
      >
        <Timer size={18} />
      </button>
      <span className="font-mono text-sm font-bold tabular-nums w-12 text-foreground">{display}</span>
      {seconds > 0 && (
        <button onClick={reset} className="text-muted-foreground hover:text-foreground">
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
};

const RecipeHeader = ({ recipe }: { recipe: Recipe }) => (
  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary/50 via-void to-void border border-primary/10 p-8 mb-8 shadow-2xl">
    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
      <ChefHat size={200} className="text-primary" />
    </div>
    
    <div className="relative z-10 space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Zap size={12} className="text-primary" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Asgardian Copilot Active</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
          recipe.difficulty === 'Easy' ? 'text-neon-green border-neon-green/30 bg-neon-green/10' :
          recipe.difficulty === 'Medium' ? 'text-primary border-primary/30 bg-primary/10' :
          'text-destructive border-destructive/30 bg-destructive/10'
        }`}>
          {recipe.difficulty}
        </span>
      </div>

      <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight leading-none max-w-4xl">
        {recipe.title}
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl font-sans leading-relaxed italic border-l-2 border-primary/30 pl-6 py-2">
        "{recipe.description}"
      </p>

      <div className="flex flex-wrap gap-8 pt-4">
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Prep Time</p>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <span className="text-sm font-bold">{recipe.prep_time}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Cook Time</p>
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            <span className="text-sm font-bold">{recipe.cook_time}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Total</p>
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-neon-green" />
            <span className="text-sm font-bold">{recipe.total_time}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Servings</p>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <span className="text-sm font-bold">{recipe.servings}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const IngredientChecklist = ({ 
  ingredients, 
  completed, 
  onToggle 
}: { 
  ingredients: Recipe['ingredients'], 
  completed: string[], 
  onToggle: (item: string) => void 
}) => (
  <div className="cyber-card rounded-2xl p-6 bg-secondary/20 border-border/40">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
        <Scale size={14} />
        Provisioning
      </h3>
      <span className="text-[10px] font-mono text-muted-foreground">
        {completed.length}/{ingredients.length} Collected
      </span>
    </div>
    <div className="space-y-2">
      {ingredients.map((ing, idx) => {
        const isDone = completed.includes(ing.item);
        return (
          <button
            key={idx}
            onClick={() => onToggle(ing.item)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border group ${
              isDone 
                ? 'bg-primary/5 border-primary/20 opacity-40' 
                : 'bg-void/40 border-border/40 hover:border-primary/60'
            }`}
          >
            <div className={`h-5 w-5 rounded-lg flex items-center justify-center transition-all border-2 ${
              isDone ? 'bg-primary border-primary text-primary-foreground' : 'bg-void border-border group-hover:border-primary/40'
            }`}>
              {isDone && <Check size={12} strokeWidth={4} />}
            </div>
            <div className="flex-1 text-left">
              <p className={`text-sm font-bold leading-tight ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {ing.item}
              </p>
              <p className="text-[10px] font-mono text-primary/70">
                {ing.amount}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

const CookingStepCard = ({ step, index, total }: { step: RecipeStep, index: number, total: number }) => {
  const icon = getStepIcon(step.title, step.instruction);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-6">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/40 text-primary-foreground flex items-center justify-center text-3xl font-black shadow-neon ring-4 ring-primary/10">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-3xl font-bold text-foreground tracking-tight leading-tight">{step.title}</h2>
            <span className="text-5xl filter drop-shadow-lg" role="img" aria-label="step-icon">{icon}</span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.3em]">Module {index + 1} / {total}</p>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-neon-green/30 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative p-10 rounded-3xl bg-secondary/40 border border-border/50 backdrop-blur-xl shadow-2xl min-h-[250px] flex flex-col justify-center">
          <p className="text-2xl md:text-3xl leading-relaxed text-foreground font-sans font-medium">
            {step.instruction}
          </p>
          
          {(step.duration || step.temperature) && (
            <div className="flex flex-wrap gap-4 mt-10 pt-10 border-t border-border/20">
              {step.duration && <TimerWidget duration={step.duration} />}
              {step.temperature && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                  <Flame size={18} />
                  <span className="font-mono text-xs font-bold uppercase">{step.temperature}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {step.warning && (
          <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 flex gap-5 items-start">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-destructive tracking-[0.2em] mb-1">Critical Caution</p>
              <p className="text-sm text-destructive-foreground/90 font-sans font-semibold">
                {step.warning}
              </p>
            </div>
          </div>
        )}

        {step.tips && step.tips.length > 0 && (
          <div className="p-6 rounded-2xl bg-neon-green/5 border border-neon-green/20 flex gap-5 items-start">
            <Sparkles className="h-6 w-6 text-neon-green flex-shrink-0 mt-1" />
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-neon-green tracking-[0.2em] mb-1">Culinary Mastery</p>
              {step.tips.map((tip, i) => (
                <p key={i} className="text-sm text-foreground/80 italic font-sans mb-1 last:mb-0">
                  "{tip}"
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Main Application ---

export default function CookingSession({ onBack, onNewSession }: CookingSessionProps) {
  const { activeJob } = useJobs();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedIngredients, setCompletedIngredients] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeJob?.status === JobStatus.Completed && activeJob.result && !recipe && !parseFailed) {
      try {
        const parsed = parseRecipe(activeJob.result);
        if (parsed) {
          setRecipe(parsed);
        } else {
          setParseFailed(true);
        }
      } catch (e) {
        console.error('[CookingSession] Parse error:', e);
        setParseFailed(true);
      }
    }
  }, [activeJob?.status, activeJob?.result, recipe, parseFailed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [followUps]);

  const toggleIngredient = (item: string) => {
    setCompletedIngredients(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleAsk = async () => {
    if (!input.trim() || isAsking || !activeJob) return;
    const q = input.trim();
    setInput('');
    setIsAsking(true);

    try {
      const full = await chatWithAgentFull(activeJob.agent.id, q, activeJob.id);
      const parsed = parseFollowUp(full);
      if (parsed) setFollowUps(prev => [...prev, parsed]);
    } catch (err) {
      console.error('[Idunn] Guidance error:', err);
    } finally {
      setIsAsking(false);
      inputRef.current?.focus();
    }
  };

  // Safe render wrap
  try {
    if (!activeJob) {
      return (
        <div className="flex flex-col items-center justify-center p-12 border border-border rounded-2xl bg-secondary/10">
          <ChefHat className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground font-mono text-sm">Waiting for job assignment...</p>
        </div>
      );
    }

    if (activeJob.status !== JobStatus.Completed || (!recipe && !parseFailed)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in duration-500">
          <div className="relative">
            <motion.div
              className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <ChefHat className="h-20 w-20 text-primary relative animate-bounce" />
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Analyzing Culinary Matrix...</h2>
            <p className="font-mono text-sm text-muted-foreground max-w-sm mx-auto">
              Idunn is optimizing the sequence for job #{activeJob.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="h-1.5 w-6 rounded-full bg-primary/30"
                animate={{ backgroundColor: ["rgba(var(--primary), 0.2)", "rgba(var(--primary), 1)", "rgba(var(--primary), 0.2)"] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      );
    }

    if (parseFailed) {
      return (
        <div className="max-w-2xl mx-auto p-12 text-center cyber-card border-destructive/20 rounded-3xl">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-6" />
          <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-destructive">Signal Decryption Failed</h2>
          <div className="text-[10px] text-muted-foreground font-mono leading-relaxed bg-void/50 p-6 rounded-2xl mb-8 overflow-y-auto max-h-[200px] text-left border border-destructive/10">
            {activeJob.result || "No signal received from Idunn."}
          </div>
          <div className="flex flex-col gap-3">
             <button onClick={onNewSession} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold tracking-widest uppercase shadow-lg hover:shadow-neon transition-all">
                Retry Generation
             </button>
             <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">
                Abort Mission
             </button>
          </div>
        </div>
      );
    }

    if (!recipe || !recipe.steps || recipe.steps.length === 0) {
      return (
        <div className="max-w-2xl mx-auto p-12 text-center cyber-card border-destructive/20 rounded-3xl">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-6" />
          <h2 className="text-xl font-bold mb-4 uppercase tracking-widest">Null Recipe Context</h2>
          <p className="text-sm text-muted-foreground mb-8 font-sans">The received payload contains no executable cooking steps. Please adjust your request and try again.</p>
          <button onClick={onNewSession} className="px-8 py-3 bg-secondary text-foreground border border-border rounded-xl font-bold tracking-widest uppercase">
            New Request
          </button>
        </div>
      );
    }

    const progress = Math.min(((currentStep + 1) / recipe.steps.length) * 100, 100);

    return (
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-12 animate-in fade-in duration-1000">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="group flex items-center gap-3 font-mono text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all">
            <div className="h-8 w-8 rounded-full border border-border group-hover:border-primary/40 flex items-center justify-center transition-all">
              <ArrowLeft size={14} />
            </div>
            CLOSE WORKFLOW
          </button>
          <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-all font-mono text-[11px] text-muted-foreground hover:text-primary">
            <RefreshCcw size={14} />
            RESET
          </button>
        </div>

        <RecipeHeader recipe={recipe} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Ingredient Sidepane */}
          <aside className="lg:col-span-4 order-2 lg:order-1 space-y-8 sticky top-10">
            <IngredientChecklist 
              ingredients={recipe.ingredients || []} 
              completed={completedIngredients} 
              onToggle={toggleIngredient} 
            />
            
            <div className="cyber-card rounded-2xl p-6 bg-void/40 border-border/30">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-4">
                <Utensils size={14} />
                Hardware
              </h3>
              <div className="flex flex-wrap gap-2">
                {(recipe.tools || []).map((tool, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-xl bg-secondary/30 border border-border/50 text-[10px] text-muted-foreground font-mono font-bold tracking-wider">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          {/* Guided Workflow */}
          <main className="lg:col-span-8 order-1 lg:order-2 space-y-10">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-mono font-black text-primary tracking-[0.4em] uppercase mb-1">Execution Status</p>
                  <p className="text-sm font-bold text-foreground">Operational Sequence In Progress</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-1">Efficiency</p>
                  <p className="text-sm font-bold text-neon-green">{Math.round(progress)}%</p>
                </div>
              </div>
              <div className="h-2 w-full bg-void rounded-full border border-border/40 p-0.5 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary via-primary to-neon-green rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <CookingStepCard 
                key={currentStep} 
                step={recipe.steps[currentStep]} 
                total={recipe.steps.length} 
              />
            </AnimatePresence>

            {/* Navigation Controls */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="flex-1 flex items-center justify-center gap-3 py-6 rounded-3xl bg-secondary/40 border border-border/50 font-mono text-xs font-bold tracking-[0.2em] uppercase transition-all hover:bg-secondary/60 disabled:opacity-20 disabled:cursor-not-allowed group"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Recall
              </button>
              <button
                onClick={() => setCurrentStep(prev => Math.min(recipe.steps.length - 1, prev + 1))}
                disabled={currentStep === recipe.steps.length - 1}
                className="flex-[2] flex items-center justify-center gap-3 py-6 rounded-3xl bg-primary text-primary-foreground font-mono text-xs font-bold tracking-[0.2em] uppercase shadow-2xl hover:shadow-neon hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
              >
                {currentStep === recipe.steps.length - 1 ? 'Operation Finalized' : 'Advance Sequence'}
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* AI Live Assistant - Follow Ups */}
            <div className="pt-12 space-y-8 border-t border-border/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Live Culinary Advisor</h3>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence>
                  {followUps.map((fu, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 rounded-3xl bg-primary/5 border border-primary/20 backdrop-blur-sm"
                    >
                      <FollowUpDisplay followUp={fu} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-neon-green rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
                <div className="relative flex gap-3 p-2 rounded-2xl bg-void border border-border group-focus-within:border-primary/50 transition-all">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAsk())}
                    placeholder="Need a substitution? Wine pairing? Culinary advice?"
                    rows={1}
                    disabled={isAsking}
                    className="flex-1 px-4 py-3 bg-transparent border-none text-foreground text-sm placeholder:text-muted-foreground/30 focus:ring-0 resize-none font-sans"
                  />
                  <button
                    onClick={handleAsk}
                    disabled={!input.trim() || isAsking}
                    className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:shadow-neon transition-all disabled:opacity-40"
                  >
                    {isAsking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  } catch (err) {
    console.error('[CookingSession] Fatal render error:', err);
    return (
      <div className="max-w-2xl mx-auto p-12 text-center cyber-card border-destructive/20 rounded-3xl bg-destructive/5">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-destructive">Kernel Panic</h2>
        <p className="text-sm text-muted-foreground mb-4">A critical error occurred in the cooking copilot render engine.</p>
        <div className="bg-void p-4 rounded-xl text-xs text-destructive font-mono text-left mb-8">
          {err instanceof Error ? err.message : String(err)}
        </div>
        <button onClick={onBack} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold tracking-widest uppercase">
          Emergency Exit
        </button>
      </div>
    );
  }
}

// Helper for Follow-up Display
function FollowUpDisplay({ followUp }: { followUp: FollowUp }) {
  const IconMap = {
    substitution: Scale,
    tip: Lightbulb,
    technique: BookOpen,
    pairing: Wine,
    answer: Info
  };
  
  const Icon = IconMap[followUp.type as keyof typeof IconMap] || Info;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {followUp.type === 'answer' ? 'Asgardian Intel' : followUp.type}
        </span>
      </div>
      
      {followUp.type === 'substitution' && (
        <p className="text-lg font-bold">
          Swap <span className="text-primary">{followUp.ingredient}</span> with <span className="text-neon-green">{followUp.alternative}</span> ({followUp.ratio})
        </p>
      )}
      
      {followUp.type === 'pairing' && (
        <div className="space-y-2">
          {followUp.wine && <p className="text-lg font-bold"><span className="text-primary">Wine Pairing:</span> {followUp.wine}</p>}
          {followUp.beer && <p className="text-lg font-bold"><span className="text-primary">Brew Pairing:</span> {followUp.beer}</p>}
        </div>
      )}

      {followUp.title && <h4 className="text-lg font-bold">{followUp.title}</h4>}
      
      {followUp.content && <p className="text-foreground/90 leading-relaxed font-sans">{followUp.content}</p>}
      
      {followUp.steps && followUp.steps.length > 0 && (
        <ol className="space-y-2 pl-4 border-l-2 border-primary/20 mt-4">
          {followUp.steps.map((s, i) => (
            <li key={i} className="text-sm font-mono text-muted-foreground">
              <span className="text-primary mr-2">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>
      )}
      
      {followUp.notes && <p className="text-xs italic text-muted-foreground mt-2 border-t border-border/20 pt-2">{followUp.notes}</p>}
    </div>
  );
}


