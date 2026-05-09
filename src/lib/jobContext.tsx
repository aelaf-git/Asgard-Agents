import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Job, JobStatus, ExecutionStep, AgentProfile, JobContextType, INITIAL_STEPS } from './types';
import { executeAgentTask } from './agentService';
import { useSolanaProgram } from '@/hooks/useSolanaProgram';
import { PublicKey } from '@solana/web3.js';

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(INITIAL_STEPS);
  const [isExecuting, setIsExecuting] = useState(false);
  const { sdk, publicKey } = useSolanaProgram();

  const updateStep = useCallback((index: number, status: ExecutionStep['status'], detail?: string) => {
    setExecutionSteps((prev) =>
      prev.map((step, i) =>
        i === index
          ? { ...step, status, detail, timestamp: Date.now() }
          : step
      )
    );
  }, []);

  const createJob = useCallback(
    async (agent: AgentProfile, prompt: string, amount: number) => {
      if (!sdk || !publicKey) {
        throw new Error("Wallet not connected");
      }

      const jobId = sdk.generateJobId();
      
      // We need a task hash (SHA-256). For now we'll use a simple mock hash or just the prompt length
      // In a real app, you'd use a real hash.
      const taskHash = `task_${Date.now().toString(16)}`; 

      setExecutionSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' as const, detail: undefined, timestamp: undefined })));
      setIsExecuting(true);

      try {
        // Step 0: Initialize Job on Solana
        updateStep(0, 'active', 'Initializing on-chain escrow...');
        
        const initResult = await sdk.initializeJob({
          amount,
          taskHash,
          agent: new PublicKey(agent.pubkey),
          timeoutSeconds: 3600, // 1 hour timeout
          jobId
        });

        if (!initResult.success) {
          throw new Error(initResult.error || "Failed to initialize job on Solana");
        }

        const txSig = initResult.data!.signature;
        updateStep(0, 'completed', `Escrow locked: ${txSig.slice(0, 8)}...`);

        const newJob: Job = {
          id: jobId,
          employer: publicKey,
          agent,
          amount,
          status: JobStatus.Processing,
          taskHash,
          resultHash: null,
          prompt,
          result: null,
          createdAt: Date.now(),
          completedAt: null,
          txSignature: txSig,
          completeTxSignature: null,
        };

        setJobs((prev) => [newJob, ...prev]);
        setActiveJob(newJob);

        // Call Backend Bridge
        const { result, resultHash, processingTime, signature } = await executeAgentTask(
          agent,
          prompt,
          jobId,
          publicKey.toString(),
          amount,
          updateStep
        );

        const completedJob: Job = {
          ...newJob,
          status: JobStatus.Completed,
          result,
          resultHash,
          completedAt: Date.now(),
          completeTxSignature: signature || null,
        };

        setActiveJob(completedJob);
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? completedJob : j))
        );

        console.log(`[AIGENT] Job ${jobId} completed and settled in ${processingTime}ms`);
      } catch (error) {
        console.error('[AIGENT] Job execution failed:', error);
        setActiveJob((prev) =>
          prev ? { ...prev, status: JobStatus.Cancelled } : null
        );
        
        // Find current active step and mark as error
        setExecutionSteps(prev => {
          const activeIndex = prev.findIndex(s => s.status === 'active');
          if (activeIndex !== -1) {
            return prev.map((s, i) => i === activeIndex ? { ...s, status: 'error', detail: error instanceof Error ? error.message : 'Execution failed' } : s);
          }
          return prev;
        });
      } finally {
        setIsExecuting(false);
      }
    },
    [sdk, publicKey, updateStep]
  );

  const cancelJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: JobStatus.Cancelled } : j
      )
    );
    if (activeJob?.id === jobId) {
      setActiveJob((prev) =>
        prev ? { ...prev, status: JobStatus.Cancelled } : null
      );
      setIsExecuting(false);
    }
  }, [activeJob]);

  const clearActiveJob = useCallback(() => {
    setActiveJob(null);
    setExecutionSteps(INITIAL_STEPS);
    setIsExecuting(false);
  }, []);

  return (
    <JobContext.Provider
      value={{
        jobs,
        activeJob,
        executionSteps,
        isExecuting,
        createJob,
        cancelJob,
        clearActiveJob,
      }}
    >
      {children}
    </JobContext.Provider>
  );
}

export function useJobs(): JobContextType {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
}
