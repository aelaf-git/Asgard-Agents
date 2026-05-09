import React from 'react';
import { Link } from 'react-router-dom';
import { AgentProfile } from '@/lib/types';
import { Shield, BarChart3, Palette, Code, Star, ArrowUpRight } from 'lucide-react';

const CATEGORY_CONFIG: Record<AgentProfile['category'], { icon: React.ElementType; color: string; label: string }> = {
  security: { icon: Shield, color: 'text-destructive', label: 'Security' },
  analysis: { icon: BarChart3, color: 'text-primary', label: 'Analysis' },
  creative: { icon: Palette, color: 'text-neon-magenta', label: 'Creative' },
  code: { icon: Code, color: 'text-neon-green', label: 'Code' },
};

interface AgentCardProps {
  agent: AgentProfile;
  index: number;
}

export default function AgentCard({ agent, index }: AgentCardProps) {
  const cat = CATEGORY_CONFIG[agent.category];
  const CatIcon = cat.icon;

  return (
    <Link
      to={`/agent/${agent.id}`}
      className="group block"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="cyber-card rounded-lg p-5 h-full flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 font-mono text-lg font-bold text-primary group-hover:border-primary/50 transition-all">
              {agent.avatar}
              <div
                className={`absolute -bottom-0.5 -right-0.5 status-dot ${
                  agent.status === 'online'
                    ? 'status-dot-active'
                    : agent.status === 'busy'
                    ? 'status-dot-pending'
                    : 'status-dot-error'
                }`}
              />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
                {agent.name}
              </h3>
              <p className="text-[11px] font-mono text-muted-foreground tracking-wide uppercase">
                {agent.role}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all -translate-y-1 group-hover:translate-y-0" />
        </div>

        {/* Description */}
        <p className="text-xs text-secondary-foreground leading-relaxed mb-4 flex-1">
          {agent.description}
        </p>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded bg-secondary text-[10px] font-mono text-muted-foreground border border-border"
            >
              {s}
            </span>
          ))}
          {agent.specialties.length > 3 && (
            <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-mono text-muted-foreground border border-border">
              +{agent.specialties.length - 3}
            </span>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CatIcon className={`h-3 w-3 ${cat.color}`} />
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {cat.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-mono text-foreground">
                {agent.rating}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {agent.completedJobs.toLocaleString()} jobs
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-primary">
            {agent.priceSOL} SOL
          </span>
        </div>
      </div>
    </Link>
  );
}
