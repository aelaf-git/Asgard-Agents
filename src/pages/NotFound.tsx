import React from 'react';
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="h-8 w-8 text-primary/40" />
          </div>
        </div>
        <h1 className="font-mono text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="font-mono text-sm text-muted-foreground mb-6">
          Signal lost. This route does not exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-xs tracking-wider uppercase font-bold hover:shadow-neon transition-all"
        >
          Return to Base
        </Link>
      </div>
    </div>
  );
}
