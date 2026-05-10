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
  avatar: string;
  status: 'online' | 'busy' | 'offline';
  category: 'studying' | 'cooking' | 'coding';
  pubkey: string;
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

export interface RagProgress {
  step: string;
  pct: number;
}

export interface JobContextType {
  jobs: Job[];
  activeJob: Job | null;
  executionSteps: ExecutionStep[];
  isExecuting: boolean;
  uploadProgress: number | null;
  ragProgress: RagProgress | null;
  createJob: (agent: AgentProfile, prompt: string, amount: number, file?: File | null) => Promise<void>;
  clearActiveJob: () => void;
  finalizeJob: (approve: boolean) => Promise<void>;
}

export const INITIAL_STEPS: ExecutionStep[] = [
  { id: 'validate', label: 'Validate Task', status: 'pending' },
  { id: 'init-agent', label: 'Initialize Agent', status: 'pending' },
  { id: 'process', label: 'Process Task', status: 'pending' },
  { id: 'proof', label: 'Generate Proof', status: 'pending' },
  { id: 'complete', label: 'Release Payment', status: 'pending' },
];
