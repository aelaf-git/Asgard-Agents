import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobs } from '@/lib/jobContext';
import { JobStatus } from '@/lib/types';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Terminal,
  Copy,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

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

interface ExecutionTerminalProps {
  onBack?: () => void;
}

export default function ExecutionTerminal({ onBack }: ExecutionTerminalProps) {
  const { activeJob, executionSteps, isExecuting } = useJobs();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeJob?.status === JobStatus.Completed && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeJob?.status]);

  if (!activeJob) {
    return (
      <div className="cyber-card rounded-lg p-8 text-center">
        <Terminal className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-mono text-sm text-muted-foreground">No active job</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          Hire an agent to see the execution terminal
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Terminal Header */}
      <div className="cyber-card rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/40" />
              <div className="h-2.5 w-2.5 rounded-full bg-neon-green/60" />
            </div>
            <span className="font-mono text-[11px] text-muted-foreground tracking-wider">
              AIGENT TERMINAL — {activeJob.agent.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded border ${
                activeJob.status === JobStatus.Completed
                  ? 'text-neon-green border-neon-green/30 bg-neon-green/10'
                  : activeJob.status === JobStatus.Processing
                  ? 'text-primary border-primary/30 bg-primary/10'
                  : activeJob.status === JobStatus.Cancelled
                  ? 'text-destructive border-destructive/30 bg-destructive/10'
                  : 'text-muted-foreground border-border bg-secondary'
              }`}
            >
              {activeJob.status}
            </span>
          </div>
        </div>

        {/* Job Info */}
        <div className="px-4 py-3 border-b border-border bg-void/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">
                Agent
              </span>
              <span className="font-mono text-xs text-foreground">{activeJob.agent.name}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">
                Amount
              </span>
              <span className="font-mono text-xs text-primary">{activeJob.amount} SOL</span>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">
                Task Hash
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {activeJob.taskHash.slice(0, 12)}...
              </span>
            </div>
            <div>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-0.5">
                Escrow TX
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {activeJob.txSignature?.slice(0, 12)}...
              </span>
            </div>
          </div>
        </div>

        {/* Execution Steps */}
        <div className="px-4 py-4 space-y-3">
          <AnimatePresence mode="sync">
            {executionSteps.map((step, i) => {
              const Icon = STATUS_ICONS[step.status];
              const color = STATUS_COLORS[step.status];
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex flex-col items-center">
                    <Icon
                      className={`h-4 w-4 ${color} ${step.status === 'active' ? 'animate-spin' : ''}`}
                    />
                    {i < executionSteps.length - 1 && (
                      <div
                        className={`w-px h-6 mt-1 ${
                          step.status === 'completed' ? 'bg-neon-green/30' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-xs tracking-wide ${
                          step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                      {step.timestamp && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(step.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    {step.detail && (
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                        {step.detail}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Result Card */}
      {activeJob.status === JobStatus.Completed && activeJob.result && (
        <motion.div
          ref={resultRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-card rounded-lg overflow-hidden border-neon-green/30"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-neon-green/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neon-green" />
              <span className="font-mono text-xs font-bold tracking-wider text-neon-green uppercase">
                Proof of Work Delivered
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(activeJob.result || '')}
                className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all font-mono text-[10px]"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
              {activeJob.completeTxSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${activeJob.completeTxSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all font-mono text-[10px]"
                >
                  <ExternalLink className="h-3 w-3" />
                  TX
                </a>
              )}
            </div>
          </div>

          {/* Payment confirmation */}
          <div className="px-4 py-2 border-b border-border bg-secondary/30">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
                Payment Released
              </span>
              <span className="font-mono text-xs font-bold text-neon-green">
                {activeJob.amount} SOL → {activeJob.agent.name}
              </span>
            </div>
          </div>

          {/* Result content */}
          <div className="px-4 py-4 max-h-[500px] overflow-y-auto">
            <pre className="font-mono text-xs text-secondary-foreground whitespace-pre-wrap leading-relaxed">
              {activeJob.result}
            </pre>
          </div>

          {/* Result hash */}
          <div className="px-4 py-2 border-t border-border bg-void/50">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                Result Hash
              </span>
              <span className="font-mono text-[11px] text-primary">
                {activeJob.resultHash}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Processing overlay text */}
      {isExecuting && (
        <div className="text-center py-2">
          <span className="font-mono text-xs text-primary cursor-blink">
            {activeJob.agent.name} is processing your task
          </span>
        </div>
      )}
    </div>
  );
}
