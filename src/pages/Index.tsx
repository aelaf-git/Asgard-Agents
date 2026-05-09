import React, { useState, useMemo } from 'react';
import HeroSection from '@/components/HeroSection';
import AgentCard from '@/components/AgentCard';
import CategoryFilter from '@/components/CategoryFilter';
import ArchitectureDiagram from '@/components/ArchitectureDiagram';
import Footer from '@/components/Footer';
import { AI_AGENTS } from '@/lib/agents';
import type { AgentProfile } from '@/lib/types';

type Category = AgentProfile['category'] | 'all';

export default function Index() {
  const [category, setCategory] = useState<Category>('all');

  const filteredAgents = useMemo(() => {
    if (category === 'all') return AI_AGENTS;
    return AI_AGENTS.filter((a) => a.category === category);
  }, [category]);

  return (
    <div className="min-h-screen">
      <HeroSection />

      {/* Agents Grid */}
      <section id="agents" className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-mono text-xs tracking-widest text-primary uppercase mb-1">
                Available Agents
              </h2>
              <p className="text-xl md:text-2xl font-bold text-foreground">
                Hire Specialized AI
              </p>
            </div>
            <CategoryFilter selected={category} onChange={setCategory} />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>

          {filteredAgents.length === 0 && (
            <div className="text-center py-16">
              <p className="font-mono text-sm text-muted-foreground">
                No agents found in this category.
              </p>
            </div>
          )}
        </div>
      </section>

      <ArchitectureDiagram />
      <Footer />
    </div>
  );
}
