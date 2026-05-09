import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

const FLOW_STEPS = [
  {
    icon: User,
    label: 'Employer',
    detail: 'Defines task & locks SOL',
    color: 'text-foreground',
    bgColor: 'bg-secondary',
    borderColor: 'border-border',
  },
  {
    icon: Lock,
    label: 'PDA Escrow',
    detail: 'SOL locked on-chain',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
  {
    icon: Bot,
    label: 'AI Agent',
    detail: 'Executes task, generates proof',
    color: 'text-neon-green',
    bgColor: 'bg-neon-green/10',
    borderColor: 'border-neon-green/30',
  },
  {
    icon: CheckCircle2,
    label: 'Settlement',
    detail: 'SOL released with proof hash',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
];

export default function ArchitectureDiagram() {
  return (
    <section className="py-16 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="font-mono text-xs tracking-widest text-primary uppercase mb-2">
            Protocol Architecture
          </h2>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            Trustless Execution Flow
          </p>
        </div>

        {/* Flow diagram */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-0 max-w-4xl mx-auto">
          {FLOW_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className={`flex flex-col items-center p-5 rounded-lg border ${step.bgColor} ${step.borderColor} w-full md:w-44`}
                >
                  <Icon className={`h-7 w-7 ${step.color} mb-2`} />
                  <span className="font-mono text-xs font-bold text-foreground tracking-wider">
                    {step.label}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground text-center mt-1">
                    {step.detail}
                  </span>
                </motion.div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="hidden md:flex items-center px-2">
                    <ArrowRight className="h-4 w-4 text-primary/40" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Code snippet */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <div className="cyber-card rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/50">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-destructive/50" />
                <div className="h-2 w-2 rounded-full bg-primary/30" />
                <div className="h-2 w-2 rounded-full bg-neon-green/50" />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                lib.rs — Job Escrow Program
              </span>
            </div>
            <pre className="px-4 py-4 overflow-x-auto">
              <code className="font-mono text-[11px] leading-relaxed">
                <span className="text-primary">pub fn</span>{' '}
                <span className="text-neon-green">initialize_job</span>
                {'(\n  ctx: Context<InitializeJob>,\n  amount: u64,\n  task_hash: String,\n) -> Result<()> {\n  '}
                <span className="text-muted-foreground">// Lock SOL into PDA vault</span>
                {'\n  let job = &mut ctx.accounts.job;\n  job.employer = ctx.accounts.employer.key();\n  job.amount = amount;\n  job.status = JobStatus::Created;\n  job.task_hash = task_hash;\n  '}
                <span className="text-muted-foreground">// Transfer SOL to escrow</span>
                {'\n  transfer(cpi_ctx, amount)?;\n  Ok(())\n}'}
              </code>
            </pre>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
