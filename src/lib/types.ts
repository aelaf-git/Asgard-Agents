import { PublicKey } from '@solana/web3.js';

export enum JobStatus {
  Created = 'Created',
  Processing = 'Processing',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  description: string;
  specialties: string[];
  priceSOL: number;
  rating: number;
  completedJobs: number;
  avatar: string;
  status: 'online' | 'busy' | 'offline';
  category: 'code' | 'creative' | 'analysis' | 'security';
}

export interface Job {
  id: string;
  employer: PublicKey | null;
  agent: AgentProfile;
  amount: number;
  status: JobStatus;
  taskHash: string;
  resultHash: string | null;
  prompt: string;
  result: string | null;
  createdAt: number;
  completedAt: number | null;
  txSignature: string | null;
  completeTxSignature: string | null;
}

export interface ExecutionStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
  timestamp?: number;
}
