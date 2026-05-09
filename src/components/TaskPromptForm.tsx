import React, { useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AgentProfile } from '@/lib/types';
import { useJobs } from '@/lib/jobContext';
import { Send, Loader2, Upload } from 'lucide-react';

interface TaskPromptFormProps {
  agent: AgentProfile;
  onJobCreated: () => void;
}

const DEFAULT_PROMPT = "Summarize this document and explain its key concepts.";

export default function TaskPromptForm({ agent, onJobCreated }: TaskPromptFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { connected } = useWallet();
  const { createJob, isExecuting } = useJobs();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!connected || isExecuting) return;
    if (!file) {
      alert("Please upload a PDF document first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createJob(agent, DEFAULT_PROMPT, agent.priceSOL, file);
      onJobCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* File Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? 'border-primary bg-primary/10'
            : file
              ? 'border-neon-green bg-neon-green/5'
              : 'border-border bg-void hover:border-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
          disabled={isSubmitting}
        />
        {file ? (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-neon-green mx-auto" />
            <p className="font-mono text-sm text-foreground font-medium">{file.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB · Click or drop to replace
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="font-mono text-sm text-foreground">Drop your PDF here</p>
            <p className="font-mono text-[11px] text-muted-foreground">or click to browse</p>
          </div>
        )}
      </div>

      {/* Submit */}
      {connected ? (
        <button
          type="submit"
          disabled={!file || isSubmitting || isExecuting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-mono text-sm tracking-wider font-bold hover:shadow-neon transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Pay & Start Session — {agent.priceSOL} SOL
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="font-mono text-xs text-center text-muted-foreground">
            Connect your wallet to start
          </p>
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
        </div>
      )}
    </form>
  );
}
