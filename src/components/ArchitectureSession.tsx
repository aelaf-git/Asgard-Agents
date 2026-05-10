import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobs } from '@/lib/jobContext';
import { JobStatus } from '@/lib/types';
import { parseArchitecture } from '@/lib/architectureParser';
import { chatWithAgentFull } from '@/lib/agentService';
import type { Architecture } from '@/types/architecture';
import { MermaidRenderer } from './MermaidRenderer';
import {
  ArrowLeft,
  RefreshCcw,
  Layout,
  Cpu,
  Database,
  Cloud,
  ShieldCheck,
  Zap,
  Layers,
  Info,
  Terminal,
  Activity,
  Box,
  AlertTriangle,
  Send,
  Loader2,
  Cctv,
} from 'lucide-react';

interface ArchitectureSessionProps {
  onBack?: () => void;
  onNewSession: () => void;
}

interface ChatMsg {
  role: 'user' | 'heimdall';
  content: string;
}

// ─── Heimdall Chat Card ──────────────────────────────────────
function HeimdallChatCard({ msg }: { msg: ChatMsg }) {
  return (
    <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role === 'heimdall' && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center mt-1 shadow-sm">
          <Cctv className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
        msg.role === 'user'
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-secondary/60 text-foreground rounded-tl-sm border border-border/40'
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</p>
      </div>
      {msg.role === 'user' && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center mt-1 border border-border">
          <Cctv className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function ArchitectureSession({ onBack, onNewSession }: ArchitectureSessionProps) {
  const { activeJob } = useJobs();
  const [arch, setArch] = useState<Architecture | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeJob?.status === JobStatus.Completed && activeJob.result && !arch && !parseFailed) {
      const parsed = parseArchitecture(activeJob.result);
      if (parsed) {
        setArch(parsed);
      } else {
        console.error('[ArchitectureSession] parseArchitecture returned null for:', activeJob.result.slice(0, 500));
        setParseFailed(true);
      }
    }
  }, [activeJob?.status, activeJob?.result, arch, parseFailed]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = useCallback(async () => {
    const q = chatInput.trim();
    if (!q || isChatting || !activeJob) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: q }]);
    setIsChatting(true);

    try {
      let streamed = false;
      await chatWithAgentFull(activeJob.agent.id, q, activeJob.id, (chunk) => {
        streamed = true;
        setChatMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'heimdall') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          } else {
            updated.push({ role: 'heimdall', content: chunk });
          }
          return updated;
        });
      });
      setChatMessages(prev => {
        const hasHeimdall = prev.some(m => m.role === 'heimdall');
        if (!streamed && !hasHeimdall) {
          return [...prev, { role: 'heimdall', content: '' }];
        }
        return prev;
      });
    } catch (err) {
      console.error('[Heimdall] Chat error:', err);
    } finally {
      setIsChatting(false);
      chatInputRef.current?.focus();
    }
  }, [chatInput, isChatting, activeJob]);

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  };

  if (!activeJob) return null;

  if (activeJob.status !== JobStatus.Completed || (!arch && !parseFailed)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in duration-500">
        <div className="relative">
          <motion.div
            className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <Activity className="h-20 w-20 text-primary relative animate-pulse" />
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Heimdall is Constructing Blueprint...</h2>
          <p className="font-mono text-sm text-muted-foreground max-w-sm mx-auto">
            Synthesizing system requirements and optimizing architectural layers.
          </p>
        </div>
      </div>
    );
  }

  if (parseFailed) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center cyber-card border-destructive/20 rounded-3xl bg-destructive/5">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-destructive">Blueprint Corruption</h2>
        <div className="text-[10px] text-muted-foreground font-mono leading-relaxed bg-void/50 p-6 rounded-2xl mb-8 overflow-y-auto max-h-[200px] text-left border border-destructive/10">
          {activeJob.result || "No data received from Heimdall."}
        </div>
        <button onClick={onNewSession} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold tracking-widest uppercase shadow-lg">
          Re-initialize Session
        </button>
      </div>
    );
  }

  if (!arch) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-12 animate-in fade-in duration-1000">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="group flex items-center gap-3 font-mono text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all">
          <div className="h-8 w-8 rounded-full border border-border group-hover:border-primary/40 flex items-center justify-center transition-all">
            <ArrowLeft size={14} />
          </div>
          CLOSE BLUEPRINT
        </button>
        <button onClick={onNewSession} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-all font-mono text-[11px] text-muted-foreground hover:text-primary">
          <RefreshCcw size={14} />
          NEW SYSTEM
        </button>
      </div>

      {/* Project Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-void to-void border border-primary/20 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <Layers size={300} className="text-primary" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Zap size={12} className="text-primary" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Asgardian Architect Active</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight leading-tight">
            {arch.project_name}
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl font-sans leading-relaxed border-l-2 border-primary/30 pl-6">
            {arch.summary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Tech Radar Sidepane */}
        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-10">
          <div className="cyber-card rounded-2xl p-6 bg-secondary/20 border-border/40">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-6">
              <Cpu size={14} />
              Core Tech Radar
            </h3>
            <div className="space-y-4">
              {arch.tech_stack.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-void/40 border border-border/40 hover:border-primary/40 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-primary/70 uppercase tracking-widest">{item.layer}</span>
                    <Box size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-foreground mb-1">{item.tech}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="cyber-card rounded-2xl p-6 bg-primary/5 border border-primary/20">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-4">
              <ShieldCheck size={14} />
              Security Guards
            </h3>
            <ul className="space-y-2">
              {arch.security.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-[12px] text-foreground/80 leading-snug">
                  <span className="text-primary">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* System Blueprint Main Pane */}
        <main className="lg:col-span-8 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Layout className="text-primary" />
                System Blueprint
              </h2>
            </div>
            <MermaidRenderer chart={arch.diagram} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-secondary/10 border border-border/40">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-4">
                <Database size={14} />
                Frontend & Backend
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Frontend Layer</p>
                  <p className="text-sm font-bold">{arch.components.frontend.framework} — {arch.components.frontend.styling}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Backend Logic</p>
                  <p className="text-sm font-bold">{arch.components.backend.runtime} ({arch.components.backend.api})</p>
                </div>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-secondary/10 border border-border/40">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-4">
                <Cloud size={14} />
                Data & Infrastructure
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Primary DB</p>
                  <p className="text-sm font-bold">{arch.components.database.primary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Infrastructure</p>
                  <p className="text-sm font-bold">{arch.components.infrastructure.provider}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Terminal className="text-primary" />
              Implementation Roadmap
            </h2>
            <div className="space-y-4">
              {arch.roadmap.map((phase, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-secondary/10 border border-border/40 flex gap-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h4 className="font-bold text-lg">{phase.phase}</h4>
                    <div className="flex flex-wrap gap-2">
                      {phase.tasks.map((task, tidx) => (
                        <span key={tidx} className="px-3 py-1 rounded-full bg-void/60 border border-border/40 text-[11px] text-muted-foreground">
                          {task}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 rounded-3xl bg-primary/5 border border-primary/20">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-4">
              <Info size={14} />
              Architectural Trade-offs
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed font-sans">
              {arch.trade_offs}
            </p>
          </section>

          {/* ─── Live Architecture Advisor Chat ─────────────── */}
          <section className="pt-12 space-y-8 border-t border-border/40">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Live Architecture Advisor</h3>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              <AnimatePresence>
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 rounded-3xl bg-primary/5 border border-primary/20 backdrop-blur-sm"
                  >
                    <HeimdallChatCard msg={msg} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {chatMessages.length === 0 && (
                <p className="font-mono text-xs text-muted-foreground py-4">
                  Ask questions about the architecture — trade-offs, scaling, alternatives...
                </p>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-neon-green rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition duration-500" />
              <div className="relative flex gap-3 p-2 rounded-2xl bg-void border border-border group-focus-within:border-primary/50 transition-all">
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask Heimdall about the architecture..."
                  rows={1}
                  disabled={isChatting}
                  className="flex-1 px-4 py-3 bg-transparent border-none text-foreground text-sm placeholder:text-muted-foreground/30 focus:ring-0 resize-none font-sans"
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || isChatting}
                  className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:shadow-neon transition-all disabled:opacity-40"
                >
                  {isChatting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
