/**
 * AIGENT Escrow SDK
 * 
 * TypeScript SDK for interacting with the AIGENT Job Escrow Solana program.
 * Handles job creation (initialize_job), completion (complete_job),
 * and cancellation (cancel_job) with PDA escrow vaults.
 */

import { BN, Program, Provider } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import IDL from "../idl/workspaceIDL.json";

// ============================================================================
// Type Definitions (from IDL)
// ============================================================================

export interface ConfigData {
  bump: number;
  authority: PublicKey;
  isActive: boolean;
  isPaused: boolean;
  feeBps: number;
  reserve: PublicKey;
  version: number;
}

export interface JobAccountData {
  employer: PublicKey;
  agent: PublicKey;
  amount: BN;
  status: { created?: object; completed?: object; cancelled?: object };
  taskHash: string;
  resultHash: string;
  createdAt: BN;
  timeout: BN;
  bump: number;
}

export interface InitializeJobParams {
  amount: number; // SOL amount
  taskHash: string;
  agent: PublicKey;
  timeoutSeconds: number;
  jobId: string;
}

export interface CompleteJobParams {
  resultHash: string;
  jobId: string;
  employerPubkey: PublicKey;
}

export interface CancelJobParams {
  jobId: string;
}

export interface SDKResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// SDK Class
// ============================================================================

export class AigentEscrowSDK {
  private readonly provider: Provider;
  private readonly program: Program<any>;

  constructor(provider: Provider) {
    this.provider = provider;
    this.program = new Program(IDL as any, this.provider);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private safeBN(value: any, defaultValue: number | string = 0): BN {
    if (value === null || value === undefined) return new BN(defaultValue);
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return new BN(defaultValue);
      return new BN(Math.floor(value).toString());
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return new BN(defaultValue);
      try {
        const num = parseFloat(trimmed);
        if (isNaN(num)) return new BN(defaultValue);
        return new BN(Math.floor(num).toString());
      } catch {
        return new BN(defaultValue);
      }
    }
    if (value instanceof BN) return value;
    return new BN(defaultValue);
  }

  private safeBNToNumber(value: any, defaultValue: number = 0): number {
    try {
      return value && typeof value.toNumber === 'function' ? value.toNumber() : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private async getPDA(
    seeds: (string | PublicKey | Buffer | Uint8Array)[],
    programId?: PublicKey
  ): Promise<[PublicKey, number]> {
    const seedBuffers = seeds.map((seed) => {
      if (typeof seed === 'string') return Buffer.from(seed, 'utf8');
      if (seed instanceof PublicKey) return seed.toBuffer();
      if (seed instanceof Uint8Array) return Buffer.from(seed);
      return seed;
    });
    return PublicKey.findProgramAddressSync(seedBuffers, programId || this.program.programId);
  }

  private solToLamports(sol: number): BN {
    return this.safeBN(Math.floor(sol * LAMPORTS_PER_SOL));
  }

  private lamportsToSol(lamports: BN): number {
    return this.safeBNToNumber(lamports, 0) / LAMPORTS_PER_SOL;
  }

  private async testConnection(): Promise<boolean> {
    try {
      if (!this.provider?.connection) return false;
      const { value } = await this.provider.connection.getLatestBlockhashAndContext('finalized');
      return !!(value && value.blockhash);
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Job PDA Derivation
  // ============================================================================

  /**
   * Derive the Job account PDA
   * Seeds: ["job", employer, job_id]
   */
  async getJobPDA(employer: PublicKey, jobId: string): Promise<[PublicKey, number]> {
    return this.getPDA(["job", employer, jobId]);
  }

  /**
   * Derive the Vault account PDA
   * Seeds: ["vault", job_account]
   */
  async getVaultPDA(jobPDA: PublicKey): Promise<[PublicKey, number]> {
    return this.getPDA(["vault", jobPDA]);
  }

  /**
   * Generate a unique job ID
   */
  generateJobId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ============================================================================
  // Instructions
  // ============================================================================

  /**
   * Initialize a new job with SOL locked in escrow
   * Employer creates a job and transfers SOL to a PDA vault
   */
  async initializeJob(params: InitializeJobParams): Promise<SDKResult<{ signature: string; jobAddress: string; vaultAddress: string }>> {
    if (!this.provider.publicKey) return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection())) return { success: false, error: "Network unavailable" };

      // Validate
      if (params.amount <= 0) return { success: false, error: "Amount must be greater than 0" };
      if (!params.taskHash || params.taskHash.length > 64) return { success: false, error: "Task hash must be 1-64 characters" };
      if (params.timeoutSeconds <= 0) return { success: false, error: "Timeout must be positive" };

      const amountLamports = this.solToLamports(params.amount);
      const timeoutBN = this.safeBN(params.timeoutSeconds);

      const [jobPDA] = await this.getJobPDA(this.provider.publicKey, params.jobId);
      const [vaultPDA] = await this.getVaultPDA(jobPDA);

      const tx = await this.program.methods
        .initializeJob(amountLamports, params.taskHash, params.agent, timeoutBN, params.jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          employer: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return {
        success: true,
        data: {
          signature: tx,
          jobAddress: jobPDA.toString(),
          vaultAddress: vaultPDA.toString(),
        },
      };
    } catch (error) {
      console.error("[Asgard SDK] initializeJob failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Job initialization failed" };
    }
  }

  /**
   * Complete a job as the designated agent
   * Agent submits result hash and receives escrowed SOL
   */
  async completeJob(params: CompleteJobParams): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey) return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection())) return { success: false, error: "Network unavailable" };

      if (!params.resultHash || params.resultHash.length > 64) {
        return { success: false, error: "Result hash must be 1-64 characters" };
      }

      const [jobPDA] = await this.getJobPDA(params.employerPubkey, params.jobId);
      const [vaultPDA] = await this.getVaultPDA(jobPDA);

      const tx = await this.program.methods
        .completeJob(params.resultHash, params.jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          agent: this.provider.publicKey,
          employer: params.employerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      console.error("[Asgard SDK] completeJob failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Job completion failed" };
    }
  }

  /**
   * Cancel a job as the employer (only after timeout)
   * Employer reclaims SOL from escrow vault
   */
  async cancelJob(params: CancelJobParams): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey) return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection())) return { success: false, error: "Network unavailable" };

      const [jobPDA] = await this.getJobPDA(this.provider.publicKey, params.jobId);
      const [vaultPDA] = await this.getVaultPDA(jobPDA);

      const tx = await this.program.methods
        .cancelJob(params.jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          employer: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      console.error("[Asgard SDK] cancelJob failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Job cancellation failed" };
    }
  }

  // ============================================================================
  // Account Fetchers
  // ============================================================================

  /**
   * Fetch a specific job account
   */
  async fetchJob(employer: PublicKey, jobId: string): Promise<SDKResult<JobAccountData>> {
    try {
      const [jobPDA] = await this.getJobPDA(employer, jobId);
      const jobAccount = await this.program.account.jobAccount.fetch(jobPDA);
      return { success: true, data: jobAccount as JobAccountData };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        return { success: false, error: "Job not found" };
      }
      return { success: false, error: "Failed to fetch job" };
    }
  }

  /**
   * Fetch all jobs in the program
   */
  async fetchAllJobs(): Promise<SDKResult<Array<{ publicKey: PublicKey; account: JobAccountData }>>> {
    try {
      if (!(await this.testConnection())) return { success: false, error: "Network unavailable" };

      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
      const fetchPromise = this.program.account.jobAccount.all();

      let allJobs: any[];
      try {
        allJobs = await Promise.race([fetchPromise, timeout]) as any[];
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes('timeout')) {
          return { success: false, error: "Request timed out" };
        }
        throw raceError;
      }

      if (!allJobs?.length) return { success: true, data: [] };

      return {
        success: true,
        data: allJobs.map((j: any) => ({ publicKey: j.publicKey, account: j.account })),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        return { success: true, data: [] };
      }
      return { success: false, error: "Failed to fetch jobs" };
    }
  }

  /**
   * Fetch all jobs by a specific employer
   */
  async fetchJobsByEmployer(employer?: PublicKey): Promise<SDKResult<Array<{ publicKey: PublicKey; account: JobAccountData }>>> {
    const target = employer || this.provider.publicKey;
    if (!target) return { success: false, error: "No employer provided and wallet not connected" };

    try {
      const result = await this.fetchAllJobs();
      if (!result.success) return result;

      const filtered = (result.data || []).filter(
        (j) => j.account.employer?.toString() === target.toString()
      );
      return { success: true, data: filtered };
    } catch {
      return { success: false, error: "Failed to fetch employer jobs" };
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Fetch SOL balance
   */
  async fetchSolBalance(account?: PublicKey): Promise<SDKResult<number>> {
    const target = account || this.provider.publicKey;
    if (!target) return { success: false, error: "No account provided" };

    try {
      const balance = await this.provider.connection.getBalance(target);
      return { success: true, data: balance / LAMPORTS_PER_SOL };
    } catch {
      return { success: false, error: "Failed to fetch balance" };
    }
  }

  /**
   * Get the job status as a human-readable string
   */
  getJobStatusString(status: JobAccountData['status']): string {
    if (status.created) return 'Created';
    if (status.completed) return 'Completed';
    if (status.cancelled) return 'Cancelled';
    return 'Unknown';
  }

  /**
   * Get the program ID
   */
  getProgramId(): PublicKey {
    return this.program.programId;
  }
}
