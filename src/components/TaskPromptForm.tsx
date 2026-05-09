import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AgentProfile } from '@/lib/types';
import { useJobs } from '@/lib/jobContext';
import { Send, Lock, AlertTriangle, Loader2 } from 'lucide-react';

interface TaskPromptFormProps {
  agent: AgentProfile;
  onJobCreated: () => void;
}

const EXAMPLE_PROMPTS: Record<string, string[]> = {
  'code-auditor': [
    'Audit this public GitHub repository for security vulnerabilities: https://github.com/coral-xyz/anchor/blob/master/examples/tutorial/basic-0/programs/basic-0/src/lib.rs',
    'Review this smart contract for reentrancy attacks and access control issues.',
  ],
  'sentiment-analyst': [
    'Analyze market sentiment for $SOL across Twitter, Discord, and on-chain metrics.',
    'Generate a risk assessment report for the Marinade Finance staking protocol.',
  ],
  'content-creator': [
    'Write a Twitter thread explaining how decentralized AI agents work on Solana.',
    'Create marketing copy for a new DeFi protocol launching on Solana.',
  ],
  'architect': [
    'Design a microservices architecture for a real-time NFT marketplace with bidding.',
    'Create a system design for a cross-chain bridge with fraud proof verification.',
  ],
  'data-analyst': [
    'Analyze the last 30 days of on-chain data for the Jupiter exchange protocol.',
    'Build a correlation model between social mentions and token price for $JUP.',
  ],
  'solidity-dev': [
    'Write an Anchor program for a token staking vault with configurable APY and lock periods.',
    'Create a Solana escrow program with PDA vaults and timeout cancellation.',
  ],
};

export default function TaskPromptForm({ agent, onJobCreated }: TaskPromptFormProps) {
  const [prompt, setPrompt] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { connected } = useWallet();
  const { createJob, isExecuting } = useJobs();

  const isCipher = agent.id === 'code-auditor';
  const examples = EXAMPLE_PROMPTS[agent.id] || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    let finalPrompt = prompt.trim();
    if (isCipher) {
      if (!githubUrl.trim()) return;
      finalPrompt = `Analyze this GitHub repository: ${githubUrl.trim()}\n\nAdditional Instructions: ${prompt.trim() || 'Perform a standard security audit.'}`;
    }

    if (!finalPrompt || !connected || isExecuting) return;

    setIsSubmitting(true);
    try {
      await createJob(agent, finalPrompt, agent.priceSOL);
      onJobCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCipher ? (
        <>
          {/* GitHub URL Input */}
          <div className="space-y-2">
            <label className="font-mono text-[11px] text-primary tracking-wider uppercase block">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/user/repo/blob/main/contract.rs"
              className="w-full px-4 py-3 rounded-lg bg-void border border-border text-foreground font-mono text-sm placeholder:text-muted-foreground/30 focus-neon transition-all"
              disabled={isSubmitting}
            />
          </div>

          {/* Optional Instructions */}
          <div className="space-y-2">
            <label className="font-mono text-[11px] text-muted-foreground tracking-wider uppercase block">
              Additional Instructions (Optional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Focus on reentrancy vulnerabilities..."
              className="w-full h-24 px-4 py-3 rounded-lg bg-void border border-border text-foreground font-mono text-sm placeholder:text-muted-foreground/30 resize-none focus-neon transition-all"
              disabled={isSubmitting}
            />
          </div>
        </>
      ) : (
        /* Standard Prompt Input */
        <div className="space-y-2">
          <label className="font-mono text-[11px] text-muted-foreground tracking-wider uppercase block">
            Task Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe the task for ${agent.name}...`}
            className="w-full h-32 px-4 py-3 rounded-lg bg-void border border-border text-foreground font-mono text-sm placeholder:text-muted-foreground/50 resize-none focus-neon transition-all"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Example prompts */}
      {examples.length > 0 && !isCipher && (
        <div className="space-y-1.5">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
            Examples
          </span>
          <div className="space-y-1.5">
            {examples.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(ex)}
                className="w-full text-left px-3 py-2 rounded bg-secondary hover:bg-surface-hover border border-border hover:border-primary/30 transition-all font-mono text-[11px] text-secondary-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Escrow info */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
        <Lock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="font-mono text-[11px] text-secondary-foreground">
          <strong className="text-primary">{agent.priceSOL} SOL</strong> will be locked in PDA escrow
          and released to <strong className="text-primary">{agent.name}</strong> upon proof-of-work delivery.
        </span>
      </div>

      {/* Warning for devnet */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
        <span className="font-mono text-[10px] text-muted-foreground">
          Running on Devnet. Transactions are simulated. No real SOL is transferred.
        </span>
      </div>

      {/* Submit */}
      {connected ? (
        <button
          type="submit"
          disabled={!prompt.trim() || isSubmitting || isExecuting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-mono text-xs tracking-wider uppercase font-bold hover:shadow-neon transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing Escrow TX...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Hire {agent.name} — {agent.priceSOL} SOL
            </>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-center text-muted-foreground">
            Connect your wallet to hire this agent
          </p>
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
        </div>
      )}
    </form>
  );
}
