import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { useJobs } from '@/lib/jobContext';
import ExecutionTerminal from '@/components/ExecutionTerminal';
import JobHistoryCard from '@/components/JobHistoryCard';
import { Terminal, Wallet, Bot, Zap, Clock, CircleDollarSign } from 'lucide-react';
import { JobStatus } from '@/lib/types';

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const { jobs, activeJob, clearActiveJob } = useJobs();

  const completedJobs = jobs.filter((j) => j.status === JobStatus.Completed);
  const totalSpent = completedJobs.reduce((sum, j) => sum + j.amount, 0);

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 pt-4">
        {/* Dashboard header */}
        <div className="mb-8">
          <h1 className="font-mono text-xs tracking-widest text-primary uppercase mb-1">
            Execution Dashboard
          </h1>
          <p className="text-xl md:text-2xl font-bold text-foreground">
            Mission Control
          </p>
        </div>

        {/* Wallet Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="cyber-card rounded-lg p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                connected
                  ? 'bg-neon-green/10 border-neon-green/30'
                  : 'bg-secondary border-border'
              }`}>
                <Wallet className={`h-5 w-5 ${connected ? 'text-neon-green' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className={`status-dot ${connected ? 'status-dot-active' : 'status-dot-error'}`} />
                  <span className="font-mono text-xs font-bold text-foreground tracking-wider">
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {publicKey && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-6)}
                  </span>
                )}
              </div>
            </div>
            <WalletMultiButton />
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {
              icon: Bot,
              label: 'Total Jobs',
              value: jobs.length.toString(),
              color: 'text-primary',
              bg: 'bg-primary/10',
              borderColor: 'border-primary/20',
            },
            {
              icon: Zap,
              label: 'Completed',
              value: completedJobs.length.toString(),
              color: 'text-neon-green',
              bg: 'bg-neon-green/10',
              borderColor: 'border-neon-green/20',
            },
            {
              icon: CircleDollarSign,
              label: 'Total Spent',
              value: `${totalSpent.toFixed(2)} SOL`,
              color: 'text-primary',
              bg: 'bg-primary/10',
              borderColor: 'border-primary/20',
            },
            {
              icon: Clock,
              label: 'Avg Time',
              value: completedJobs.length > 0 ? '~7s' : '--',
              color: 'text-muted-foreground',
              bg: 'bg-secondary',
              borderColor: 'border-border',
            },
          ].map(({ icon: Icon, label, value, color, bg, borderColor }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`cyber-card rounded-lg p-4 border ${borderColor}`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded ${bg} mb-2`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <span className="font-mono text-lg font-bold text-foreground block">{value}</span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
                {label}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Active Execution Terminal */}
          <div className="lg:col-span-3">
            <h2 className="font-mono text-xs tracking-widest text-primary uppercase mb-3">
              Active Execution
            </h2>
            <ExecutionTerminal />
          </div>

          {/* Job History */}
          <div className="lg:col-span-2">
            <h2 className="font-mono text-xs tracking-widest text-primary uppercase mb-3">
              Job History
            </h2>
            {jobs.length === 0 ? (
              <div className="cyber-card rounded-lg p-8 text-center">
                <Terminal className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-mono text-xs text-muted-foreground">
                  No jobs yet. Hire an agent to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {jobs.map((job) => (
                  <JobHistoryCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
