import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Job, JobStatus, ExecutionStep, AgentProfile } from './types';
import { executeAgentTask } from './agentService';

interface JobContextType {
  jobs: Job[];
  activeJob: Job | null;
  executionSteps: ExecutionStep[];
  isExecuting: boolean;
  createJob: (agent: AgentProfile, prompt: string, amount: number) => Promise<void>;
  cancelJob: (jobId: string) => void;
  clearActiveJob: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

const INITIAL_STEPS: ExecutionStep[] = [
  { id: 'validate', label: 'Validate Task', status: 'pending' },
  { id: 'init-agent', label: 'Initialize Agent', status: 'pending' },
  { id: 'process', label: 'Process Task', status: 'pending' },
  { id: 'proof', label: 'Generate Proof', status: 'pending' },
  { id: 'complete', label: 'Release Payment', status: 'pending' },
];

function generateJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateTxSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars[Math.floor(Math.random() * chars.length)];
  }
  return sig;
}

export function JobProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(INITIAL_STEPS);
  const [isExecuting, setIsExecuting] = useState(false);

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
      const jobId = generateJobId();
      const txSig = generateTxSignature();

      const newJob: Job = {
        id: jobId,
        employer: null,
        agent,
        amount,
        status: JobStatus.Created,
        taskHash: `0x${Date.now().toString(16)}`,
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
      setExecutionSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' as const, detail: undefined, timestamp: undefined })));
      setIsExecuting(true);

      try {
        // Update job status to processing
        setActiveJob((prev) => prev ? { ...prev, status: JobStatus.Processing } : null);

        const { result, resultHash, processingTime } = await executeAgentTask(
          agent,
          prompt,
          updateStep
        );

        const completeTxSig = generateTxSignature();

        const completedJob: Job = {
          ...newJob,
          status: JobStatus.Completed,
          result,
          resultHash,
          completedAt: Date.now(),
          completeTxSignature: completeTxSig,
        };

        setActiveJob(completedJob);
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? completedJob : j))
        );

        console.log(`[AIGENT] Job ${jobId} completed in ${processingTime}ms`);
      } catch (error) {
        console.error('[AIGENT] Job execution failed:', error);
        setActiveJob((prev) =>
          prev ? { ...prev, status: JobStatus.Cancelled } : null
        );
        updateStep(
          executionSteps.findIndex((s) => s.status === 'active'),
          'error',
          'Execution failed'
        );
      } finally {
        setIsExecuting(false);
      }
    },
    [updateStep, executionSteps]
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
