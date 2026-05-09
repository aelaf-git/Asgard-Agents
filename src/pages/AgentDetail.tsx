import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAgentById } from '@/lib/agents';
import { useJobs } from '@/lib/jobContext';
import TaskPromptForm from '@/components/TaskPromptForm';
import ExecutionTerminal from '@/components/ExecutionTerminal';
import {
  ArrowLeft,
  BookOpen,
  ChefHat,
  Code,
} from 'lucide-react';
import type { AgentProfile } from '@/lib/types';

const CATEGORY_CONFIG: Record<AgentProfile['category'], { icon: React.ElementType; color: string }> = {
  studying: { icon: BookOpen, color: 'text-primary' },
  cooking: { icon: ChefHat, color: 'text-amber-400' },
  coding: { icon: Code, color: 'text-neon-green' },
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agent = getAgentById(id || '');
  const { activeJob } = useJobs();
  const [showTerminal, setShowTerminal] = useState(false);

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-muted-foreground mb-4">Agent not found</p>
          <Link
            to="/"
            className="font-mono text-xs text-primary hover:underline tracking-wider uppercase"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const cat = CATEGORY_CONFIG[agent.category];
  const CatIcon = cat.icon;

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 pt-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 tracking-wider uppercase"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Agent Info + Form (or Terminal) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agent profile card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="cyber-card rounded-lg p-6"
            >
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 font-mono text-2xl font-bold text-primary">
                  {agent.avatar}
                  <div
                    className={`absolute -bottom-1 -right-1 status-dot ${
                      agent.status === 'online' ? 'status-dot-active' :
                      agent.status === 'busy' ? 'status-dot-pending' : 'status-dot-error'
                    }`}
                  />
                </div>
                <div>
                  <h1 className="font-mono text-lg font-bold tracking-wider text-foreground">
                    {agent.name}
                  </h1>
                  <p className="font-mono text-xs text-muted-foreground tracking-wider uppercase">
                    {agent.role}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-secondary-foreground leading-relaxed mb-5">
                {agent.description}
              </p>

              {/* Specialties */}
              <div className="mb-5">
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase block mb-2">
                  Specialties
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {agent.specialties.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded bg-secondary text-[11px] font-mono text-secondary-foreground border border-border"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Category badge */}
              <div className="flex items-center gap-1.5">
                <CatIcon className={`h-3.5 w-3.5 ${cat.color}`} />
                <span className="font-mono text-[11px] text-muted-foreground tracking-wider uppercase">
                  {agent.category} Agent
                </span>
              </div>
            </motion.div>

            {/* Task Form (when not showing terminal) */}
            {!showTerminal && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="cyber-card rounded-lg p-6"
              >
                <h2 className="font-mono text-xs tracking-widest text-primary uppercase mb-4">
                  Submit Task
                </h2>
                <TaskPromptForm agent={agent} onJobCreated={() => setShowTerminal(true)} />
              </motion.div>
            )}
          </div>

          {/* Right: Execution Terminal */}
          <div className="lg:col-span-3">
            {showTerminal || activeJob ? (
              <ExecutionTerminal onBack={() => setShowTerminal(false)} />
            ) : (
              <div className="cyber-card rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="relative mb-4">
                  <div className="h-16 w-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <CatIcon className="h-8 w-8 text-primary/40" />
                  </div>
                </div>
                <p className="font-mono text-sm text-muted-foreground text-center mb-1">
                  Awaiting Task Input
                </p>
                <p className="font-mono text-xs text-muted-foreground/60 text-center max-w-xs">
                  Submit a task prompt to activate {agent.name} and view the real-time
                  execution terminal with proof-of-work delivery.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
