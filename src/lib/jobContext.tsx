import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Job, JobStatus, ExecutionStep, AgentProfile, JobContextType, RagProgress, INITIAL_STEPS } from './types';
import { executeAgentTask, finalizeAgentJob } from './agentService';
import { useSolanaProgram } from '@/hooks/useSolanaProgram';
import { PublicKey } from '@solana/web3.js';

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(INITIAL_STEPS);
  const [isExecuting, setIsExecuting] = useState(false);
  const [ragProgress, setRagProgress] = useState<RagProgress | null>(null);
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
    async (agent: AgentProfile, prompt: string, amount: number, file: File | null = null) => {
      if (!sdk || !publicKey) throw new Error("Wallet not connected");

      const jobId = sdk.generateJobId();
      const taskHash = `task_${Date.now().toString(16)}`; 

      setExecutionSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' as const, detail: undefined, timestamp: undefined })));
      setIsExecuting(true);

      try {
        updateStep(0, 'active', 'Initializing on-chain escrow...');
        const initResult = await sdk.initializeJob({
          amount,
          taskHash,
          agent: new PublicKey(agent.pubkey),
          timeoutSeconds: 3600,
          jobId
        });

        if (!initResult.success) throw new Error(initResult.error || "Escrow failed");
        updateStep(0, 'completed', `Escrow locked: ${initResult.data!.signature.slice(0, 8)}...`);

        const newJob: Job = {
          id: jobId,
          employer: publicKey,
          agent,
          amount,
          status: JobStatus.Processing,
          taskHash,
          resultHash: null,
          prompt,
          result: "",
          createdAt: Date.now(),
          completedAt: null,
          txSignature: initResult.data!.signature,
          completeTxSignature: null,
        };

        setJobs((prev) => [newJob, ...prev]);
        setActiveJob(newJob);

        const { result, resultHash } = await executeAgentTask(
          agent,
          prompt,
          jobId,
          publicKey.toString(),
          amount,
          file,
          updateStep,
          (chunk) => {
            setActiveJob(prev => prev ? { ...prev, result: (prev.result || "") + chunk } : null);
          },
          (progress) => setRagProgress(progress)
        );

        setRagProgress(null);

        const reviewJob: Job = {
          ...newJob,
          result,
          resultHash,
          status: JobStatus.Completed,
        };

        setActiveJob(reviewJob);
        setJobs((prev) => prev.map((j) => (j.id === jobId ? reviewJob : j)));

        // Auto-approve escrow for Teacher agent immediately after indexing
        if (agent.id === 'odin') {
          try {
            const signature = await import('./agentService').then(m => m.finalizeAgentJob(jobId, publicKey.toString(), true));
            const finalizedJob: Job = {
              ...reviewJob,
              completeTxSignature: signature,
              completedAt: Date.now(),
            };
            setActiveJob(finalizedJob);
            setJobs((prev) => prev.map((j) => (j.id === jobId ? finalizedJob : j)));
          } catch (e) {
            console.warn('[Asgard] Auto-approve for Odin failed (devnet may be offline):', e);
            // Non-fatal — teacher chat will still work
          }
        }

      } catch (error) {
        console.error('[Asgard] Job failed:', error);
        setIsExecuting(false);
      } finally {
        setIsExecuting(false);
      }
    },
    [sdk, publicKey, updateStep]
  );

  const finalizeJob = useCallback(async (approve: boolean) => {
    if (!activeJob || !publicKey) return;
    
    setIsExecuting(true);
    try {
      const signature = await finalizeAgentJob(activeJob.id, publicKey.toString(), approve);
      
      const finalizedJob: Job = {
        ...activeJob,
        status: approve ? JobStatus.Completed : JobStatus.Cancelled,
        completeTxSignature: signature,
        completedAt: Date.now()
      };

      setActiveJob(finalizedJob);
      setJobs(prev => prev.map(j => j.id === activeJob.id ? finalizedJob : j));
    } catch (error) {
      console.error('[Asgard] Finalization failed:', error);
      alert(`Finalization failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  }, [activeJob, publicKey]);

  const cancelJob = useCallback((jobId: string) => {
    console.log("Cancel job requested for:", jobId);
    // ... logic
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
          ragProgress,
          createJob,
          cancelJob,
          clearActiveJob,
          finalizeJob,
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
