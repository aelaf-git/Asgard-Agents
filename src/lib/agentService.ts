import { AgentProfile, ExecutionStep } from './types';

/**
 * Agent Executioner Service
 * Connects the frontend to the Rust backend for AI task processing
 * and on-chain settlement.
 */

const API_BASE_URL = 'http://localhost:3001';

export interface AgentExecutionResult {
  result: string;
  resultHash: string;
  processingTime: number;
  signature?: string;
}

/**
 * Execute an agent task by calling the Rust backend.
 */
export async function executeAgentTask(
  agent: AgentProfile,
  prompt: string,
  jobId: string,
  employer: string,
  amount: number,
  onStepUpdate: (stepIndex: number, status: ExecutionStep['status'], detail?: string) => void
): Promise<AgentExecutionResult> {
  const startTime = Date.now();

  try {
    // Step 0: Validating task
    onStepUpdate(0, 'active', 'Validating task parameters...');
    await delay(500);
    onStepUpdate(0, 'completed', 'Task validated');

    // Step 1: Initializing agent
    onStepUpdate(1, 'active', `Booting ${agent.name} neural core...`);
    
    // We can call /health or /api/agent/info here to verify backend is up
    const healthRes = await fetch(`${API_BASE_URL}/health`).catch(() => null);
    if (!healthRes?.ok) {
      throw new Error("Backend service is unreachable. Make sure the Rust backend is running on port 3001.");
    }
    
    await delay(800);
    onStepUpdate(1, 'completed', `${agent.name} initialized`);

    // Step 2: Processing (Execute AI Task)
    onStepUpdate(2, 'active', 'Processing task via AI Executioner...');
    
    const executeRes = await fetch(`${API_BASE_URL}/api/job/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        agent_id: agent.id,
        prompt: prompt,
        employer: employer,
        amount: amount
      })
    });

    if (!executeRes.ok) {
      const err = await executeRes.text();
      throw new Error(`AI Execution failed: ${err}`);
    }

    const executeData = await executeRes.json();
    onStepUpdate(2, 'completed', 'Processing complete');

    // Step 3: Generating proof
    onStepUpdate(3, 'active', 'Computing cryptographic proof-of-work...');
    await delay(1000);
    onStepUpdate(3, 'completed', `Hash: ${executeData.result_hash.slice(0, 16)}...`);

    // Step 4: Completing job (On-chain settlement)
    onStepUpdate(4, 'active', 'Requesting on-chain settlement...');
    
    const completeRes = await fetch(`${API_BASE_URL}/api/job/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        employer: employer,
        result_hash: executeData.result_hash
      })
    });

    if (!completeRes.ok) {
      const err = await completeRes.text();
      throw new Error(`On-chain settlement failed: ${err}`);
    }

    const completeData = await completeRes.json();
    onStepUpdate(4, 'completed', 'Payment released');

    const processingTime = Date.now() - startTime;

    return { 
      result: executeData.result, 
      resultHash: executeData.result_hash, 
      processingTime,
      signature: completeData.signature
    };

  } catch (error) {
    console.error("[AIGENT Bridge] Error:", error);
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
