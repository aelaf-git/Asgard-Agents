import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobs } from '@/lib/jobContext';
import { JobStatus } from '@/lib/types';
import { chatWithAgent } from '@/lib/agentService';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Terminal,
  Copy,
  ExternalLink,
  ArrowLeft,
  BookOpen,
  Send,
  User,
  Bot,
  RefreshCcw,
  FileText,
  Search,
  Layers,
  Database,
  MessageSquare,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && chart) {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        mermaid.render(id, chart).then((result) => {
          if (ref.current) ref.current.innerHTML = result.svg;
        }).catch(e => {
          if (ref.current) ref.current.innerHTML = `<pre class="text-destructive text-xs">${e.message}</pre>`;
        });
      } catch (error) { console.error(error); }
    }
  }, [chart]);
  return <div ref={ref} className="my-6 p-4 bg-void/50 rounded-lg border border-border overflow-x-auto flex justify-center w-full" />;
};

const MarkdownContent = ({ content }: { content: string }) => (
  <div className="prose prose-invert prose-sm max-w-none font-sans leading-relaxed">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isMermaid = match && match[1] === 'mermaid';
          if (isMermaid) return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
          const isBlock = match || String(children).includes('\n');
          return isBlock ? (
            <div className="bg-void p-4 rounded-lg my-3 overflow-x-auto border border-border/50">
              <code className={className} {...props}>{children}</code>
            </div>
          ) : (
            <code className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[11px]" {...props}>{children}</code>
          );
        },
        h1: ({node, ...props}) => { void node; return <h1 className="text-primary text-xl font-bold mt-4 mb-3 pb-2 border-b border-border/50" {...props} />; },
        h2: ({node, ...props}) => { void node; return <h2 className="text-foreground text-lg font-bold mt-4 mb-2" {...props} />; },
        h3: ({node, ...props}) => { void node; return <h3 className="text-foreground text-base font-semibold mt-3 mb-1" {...props} />; },
        ul: ({node, ...props}) => { void node; return <ul className="list-disc list-inside space-y-1 my-2 text-muted-foreground" {...props} />; },
        ol: ({node, ...props}) => { void node; return <ol className="list-decimal list-inside space-y-1 my-2 text-muted-foreground" {...props} />; },
        a: ({node, ...props}) => { void node; return <a className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />; },
        p: ({node, ...props}) => { void node; return <p className="my-2 leading-loose" {...props} />; },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

const STATUS_ICONS = {
  pending: Circle,
  active: Loader2,
  completed: CheckCircle2,
  error: XCircle,
};

const STATUS_COLORS = {
  pending: 'text-muted-foreground',
  active: 'text-primary',
  completed: 'text-neon-green',
  error: 'text-destructive',
};

interface ChatMessage {
  role: 'user' | 'teacher';
  content: string;
  streaming?: boolean;
}

interface ExecutionTerminalProps {
  onBack?: () => void;
}

// ─────────────────────────────────────────────
// ODIN CHAT UI
// ─────────────────────────────────────────────
function TeacherChatUI({ onBack, onNewSession }: { onBack?: () => void; onNewSession: () => void }) {
  const { activeJob } = useJobs();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // Seed the first message from the initial job result
  useEffect(() => {
    if (activeJob?.result && !initialized.current) {
      initialized.current = true;
      setMessages([{ role: 'teacher', content: activeJob.result }]);
    }
  }, [activeJob?.result]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !activeJob) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setMessages(prev => [...prev, { role: 'teacher', content: '', streaming: true }]);
    setIsStreaming(true);

    try {
      await chatWithAgent(activeJob.agent.id, userMsg, activeJob.id, (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'teacher') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      });
    } catch (err) {
      console.error('[Odin] Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'teacher') {
          updated[updated.length - 1] = { ...last, content: '*(Error: Could not reach the Teacher. Please try again.)*', streaming: false };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m));
      inputRef.current?.focus();
    }
  }, [input, isStreaming, activeJob]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!activeJob) return null;

  return (
    <div className="flex flex-col h-[80vh] min-h-[600px] cyber-card rounded-xl overflow-hidden border border-primary/20"
         style={{ background: 'linear-gradient(160deg, hsl(230 20% 6%) 0%, hsl(240 15% 8%) 100%)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-neon">
              <BookOpen className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm tracking-wide">Teacher</p>
            </div>
          </div>
        </div>
        <button
          onClick={onNewSession}
          className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-primary border border-border hover:border-primary/40 px-2.5 py-1.5 rounded transition-all"
        >
          <RefreshCcw className="h-3 w-3" />
          New Session
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
            <BookOpen className="h-10 w-10 text-primary/30" />
            <p className="text-muted-foreground font-mono text-sm">Your PDF is being indexed…</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'teacher' && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center mt-1 shadow-sm">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}

              <div className={`max-w-[82%] rounded-2xl px-5 py-4 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-secondary/60 text-foreground rounded-tl-sm border border-border/40'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <>
                    <MarkdownContent content={msg.content} />
                    {msg.streaming && (
                      <span className="inline-block h-4 w-0.5 bg-primary animate-pulse ml-1 rounded" />
                    )}
                  </>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center mt-1 border border-border">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-border/60 bg-secondary/20">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your document… (Enter to send, Shift+Enter for new line)"
            rows={2}
            disabled={isStreaming}
            className="flex-1 px-4 py-3 rounded-xl bg-void border border-border text-foreground text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all font-sans leading-relaxed disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:shadow-neon transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STANDARD AGENT TERMINAL
// ─────────────────────────────────────────────
function StandardTerminal({ onBack }: { onBack?: () => void }) {
  const { activeJob, executionSteps, isExecuting, clearActiveJob, finalizeJob } = useJobs();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeJob?.status === JobStatus.Completed && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeJob?.status]);

  if (!activeJob) return null;

  return (
    <div className="space-y-4">
      <div className="cyber-card rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/40" />
              <div className="h-2.5 w-2.5 rounded-full bg-neon-green/60" />
            </div>
            <span className="font-mono text-[11px] text-muted-foreground tracking-wider">
              ASGARD TERMINAL — {activeJob.agent.name}
            </span>
          </div>
          <span className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded border ${
            activeJob.status === JobStatus.Completed ? 'text-neon-green border-neon-green/30 bg-neon-green/10'
            : activeJob.status === JobStatus.Processing ? 'text-primary border-primary/30 bg-primary/10'
            : activeJob.status === JobStatus.Cancelled ? 'text-destructive border-destructive/30 bg-destructive/10'
            : 'text-muted-foreground border-border bg-secondary'
          }`}>
            {activeJob.status}
          </span>
        </div>

        <div className="px-4 py-3 border-b border-border bg-void/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">Agent</span>
              <span className="font-mono text-xs text-foreground">{activeJob.agent.name}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">Amount</span>
              <span className="font-mono text-xs text-primary">{activeJob.amount} SOL</span>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">Task Hash</span>
              <span className="font-mono text-[11px] text-muted-foreground">{activeJob.taskHash.slice(0, 12)}...</span>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">Escrow TX</span>
              <span className="font-mono text-[11px] text-muted-foreground">{activeJob.txSignature?.slice(0, 12)}...</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          <AnimatePresence mode="sync">
            {executionSteps.map((step, i) => {
              const Icon = STATUS_ICONS[step.status];
              const color = STATUS_COLORS[step.status];
              return (
                <motion.div key={step.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <Icon className={`h-4 w-4 ${color} ${step.status === 'active' ? 'animate-spin' : ''}`} />
                    {i < executionSteps.length - 1 && (
                      <div className={`w-px h-6 mt-1 ${step.status === 'completed' ? 'bg-neon-green/30' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs tracking-wide ${step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {step.label}
                      </span>
                      {step.timestamp && (
                        <span className="font-mono text-[10px] text-muted-foreground">{new Date(step.timestamp).toLocaleTimeString()}</span>
                      )}
                    </div>
                    {step.detail && <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{step.detail}</p>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {activeJob.status === JobStatus.Completed && activeJob.result && (
        <motion.div ref={resultRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="cyber-card rounded-lg overflow-hidden border-neon-green/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-neon-green/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neon-green" />
              <span className="font-mono text-xs font-bold tracking-wider text-neon-green uppercase">Proof of Work Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigator.clipboard.writeText(activeJob.result || '')} className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all font-mono text-[10px]">
                <Copy className="h-3 w-3" /> Copy
              </button>
              {activeJob.completeTxSignature && (
                <a href={`https://explorer.solana.com/tx/${activeJob.completeTxSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all font-mono text-[10px]">
                  <ExternalLink className="h-3 w-3" /> TX
                </a>
              )}
            </div>
          </div>

          <div className="px-4 py-2 border-b border-border bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">Payment Released</span>
              <span className="font-mono text-xs font-bold text-neon-green">{activeJob.amount} SOL → {activeJob.agent.name}</span>
            </div>
          </div>

          <div className="px-6 py-6 max-h-[600px] overflow-y-auto custom-scrollbar bg-secondary/10">
            <MarkdownContent content={activeJob.result || ''} />
          </div>

          <div className="px-4 py-2 border-t border-border bg-void/50">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">Result Hash</span>
              <span className="font-mono text-[11px] text-primary">{activeJob.resultHash}</span>
            </div>
          </div>

          {activeJob.completeTxSignature ? (
            <div className="px-4 py-4 border-t border-border bg-secondary/20">
              <button onClick={clearActiveJob} className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-primary text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:shadow-neon transition-all">
                <Terminal className="h-3.5 w-3.5" /> Start New Audit
              </button>
            </div>
          ) : (
            <div className="px-4 py-4 border-t border-border bg-secondary/20 grid grid-cols-2 gap-3">
              <button onClick={() => finalizeJob(false)} className="flex items-center justify-center gap-2 py-2.5 rounded bg-destructive/10 text-destructive border border-destructive/30 font-mono text-xs font-bold tracking-widest uppercase hover:bg-destructive hover:text-white transition-all">
                <XCircle className="h-3.5 w-3.5" /> Reject & Refund
              </button>
              <button onClick={() => finalizeJob(true)} className="flex items-center justify-center gap-2 py-2.5 rounded bg-neon-green text-black font-mono text-xs font-bold tracking-widest uppercase hover:shadow-neon transition-all">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Pay
              </button>
            </div>
          )}
        </motion.div>
      )}

      {isExecuting && (
        <div className="text-center py-2">
          <span className="font-mono text-xs text-primary cursor-blink">{activeJob.agent.name} is processing your task</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// RAG PROCESSING OVERLAY
// ─────────────────────────────────────────────
const RAG_STEPS = [
  { icon: FileText, label: 'Reading PDF', pct: 10 },
  { icon: Layers, label: 'Splitting text', pct: 35 },
  { icon: Database, label: 'Building index', pct: 60 },
  { icon: Search, label: 'Generating answer', pct: 85 },
  { icon: MessageSquare, label: 'Complete', pct: 100 },
];

function RagProcessingOverlay({ progress }: { progress: { step: string; pct: number } }) {
  const currentStep = RAG_STEPS.findIndex(s => s.pct === Math.min(...RAG_STEPS.filter(x => progress.pct <= x.pct).map(x => x.pct)));

  return (
    <div className="cyber-card rounded-xl overflow-hidden border border-primary/20"
         style={{ background: 'linear-gradient(160deg, hsl(230 20% 6%) 0%, hsl(240 15% 8%) 100%)' }}>
      <div className="px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold text-foreground text-sm">Odin is studying your document</p>
            <p className="font-mono text-[11px] text-muted-foreground">This takes a few seconds</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-void border border-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-neon-green"
              initial={{ width: 0 }}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="font-mono text-xs text-primary text-right">{progress.pct}%</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {RAG_STEPS.map((step, i) => {
            const isDone = progress.pct >= step.pct;
            const isCurrent = !isDone && (i === 0 || progress.pct > RAG_STEPS[i - 1].pct);
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-all ${
                  isDone
                    ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
                    : isCurrent
                      ? 'bg-primary/10 border-primary/30 text-primary animate-pulse'
                      : 'bg-secondary border-border text-muted-foreground'
                }`}>
                  <step.icon className="h-3.5 w-3.5" />
                </div>
                <span className={`font-mono text-xs transition-all ${
                  isDone
                    ? 'text-neon-green line-through opacity-70'
                    : isCurrent
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="text-xs ml-auto text-primary">
                    {progress.step}
                  </span>
                )}
                {isDone && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-neon-green ml-auto" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT COMPONENT — Branches based on agent type
// ─────────────────────────────────────────────
export default function ExecutionTerminal({ onBack }: ExecutionTerminalProps) {
  const { activeJob, clearActiveJob, ragProgress } = useJobs();

  if (!activeJob) {
    return (
      <div className="cyber-card rounded-lg p-8 text-center">
        <Terminal className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-mono text-sm text-muted-foreground">No active job</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">Hire an agent to see the execution terminal</p>
      </div>
    );
  }

  const isTeacher = activeJob.agent.id === 'odin';

  if (isTeacher) {
    // Show RAG progress while indexing, then switch to chat
    if (ragProgress && activeJob.status !== JobStatus.Completed) {
      return <RagProcessingOverlay progress={ragProgress} />;
    }

    const handleNewSession = () => {
      clearActiveJob();
      if (onBack) onBack();
    };
    return <TeacherChatUI onBack={onBack} onNewSession={handleNewSession} />;
  }

  return <StandardTerminal onBack={onBack} />;
}
