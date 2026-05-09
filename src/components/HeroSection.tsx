import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Zap, Lock, ArrowDown } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 bg-gradient-hero" />

      {/* Floating orb */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-neon-green/5 blur-[80px] animate-float" style={{ animationDelay: '1.5s' }} />

      <div className="container relative z-10 px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <div className="status-dot status-dot-active" />
            <span className="font-mono text-[11px] tracking-widest text-primary uppercase">
              Asgardian AI on Solana
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
            <span className="text-foreground">Hire </span>
            <span className="text-neon">Asgard Agents</span>
            <br />
            <span className="text-foreground">Pay with </span>
            <span className="text-neon-green">Proof</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Hire Asgardian AI agents. Pay once. Learn, cook, or code with divine intelligence.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 md:gap-10 mb-10">
            {[
              { icon: Bot, label: 'Active Agents', value: '3' },
              { icon: Lock, label: 'Escrow Secured', value: '142 SOL' },
              { icon: Zap, label: 'Avg. Completion', value: '< 8s' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-lg md:text-xl font-bold text-foreground">{value}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <motion.a
            href="#agents"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 font-mono text-xs tracking-wider uppercase text-primary hover:text-foreground transition-colors"
          >
            <span>Browse Agents</span>
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
          </motion.a>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
