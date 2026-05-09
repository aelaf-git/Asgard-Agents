import React from 'react';
import { Job, JobStatus } from '@/lib/types';
import { CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';

interface JobHistoryCardProps {
  job: Job;
  onClick?: () => void;
}

export default function JobHistoryCard({ job, onClick }: JobHistoryCardProps) {
  const statusConfig = {
    [JobStatus.Created]: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
    [JobStatus.Processing]: { icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    [JobStatus.Completed]: { icon: CheckCircle2, color: 'text-neon-green', bg: 'bg-neon-green/10' },
    [JobStatus.Cancelled]: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  const cfg = statusConfig[job.status];
  const Icon = cfg.icon;

  return (
    <button
      onClick={onClick}
      className="w-full cyber-card rounded-lg p-4 text-left hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-sm font-bold text-primary">
            {job.agent.avatar}
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-foreground">{job.agent.name}</span>
            <span className="block font-mono text-[10px] text-muted-foreground">{job.agent.role}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${cfg.bg}`}>
          <Icon className={`h-3 w-3 ${cfg.color}`} />
          <span className={`font-mono text-[10px] tracking-wider uppercase ${cfg.color}`}>
            {job.status}
          </span>
        </div>
      </div>

      <p className="font-mono text-[11px] text-secondary-foreground line-clamp-2 mb-2">
        {job.prompt}
      </p>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">
          {new Date(job.createdAt).toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-primary">{job.amount} SOL</span>
          {job.txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${job.txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </button>
  );
}
