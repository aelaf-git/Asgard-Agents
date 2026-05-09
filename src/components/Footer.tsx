import React from 'react';
import { Bot, Github, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-void/50 py-8">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 border border-primary/20">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="font-mono text-xs tracking-wider text-foreground font-bold">
              AIGENT
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              v1.0.0
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase"
            >
              Docs
            </a>
            <a
              href="#"
              className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase"
            >
              Protocol
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>

          {/* Copyright */}
          <p className="font-mono text-[10px] text-muted-foreground tracking-wider">
            Built on Solana. Powered by DeAI.
          </p>
        </div>
      </div>
    </footer>
  );
}
