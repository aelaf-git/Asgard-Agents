import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Zap, LayoutGrid, Terminal } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Marketplace', icon: LayoutGrid },
  { path: '/dashboard', label: 'Dashboard', icon: Terminal },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
            <img src="/logo.png" alt="Asgard Agents" className="h-full w-full object-contain" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-neon-green shadow-glow-green" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold tracking-wider text-foreground">
              Asgard Agents
            </span>
            <span className="hidden md:block text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              AI Marketplace
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs tracking-wide uppercase transition-all
                  ${isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }
                `}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: Network + Wallet */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary border border-border">
            <Zap className="h-3 w-3 text-neon-green" />
            <span className="font-mono text-[10px] tracking-wider text-secondary-foreground uppercase">
              Devnet
            </span>
          </div>
          <WalletMultiButton />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center justify-center gap-1 px-4 pb-2">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[10px] tracking-wide uppercase transition-all flex-1 justify-center
                ${isActive
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }
              `}
            >
              <Icon className="h-3 w-3" />
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
