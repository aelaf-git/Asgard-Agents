use serde::{Deserialize, Serialize};

// =============================================================================
// Request Models
// =============================================================================

/// POST /api/job/execute — Execute an AI task
#[derive(Debug, Deserialize)]
pub struct ExecuteJobRequest {
    /// Unique job ID (matches on-chain job PDA seed)
    pub job_id: String,
    /// The agent type identifier (e.g. "code-auditor", "sentiment-analyst")
    pub agent_id: String,
    /// The user's task prompt
    pub prompt: String,
    /// Employer's public key (base58)
    pub employer: String,
    /// SOL amount locked in escrow
    pub amount: f64,
}

/// POST /api/job/finalize — Approve or Reject a job
#[derive(Debug, Deserialize)]
pub struct FinalizeJobRequest {
    pub job_id: String,
    pub employer: String,
    pub approve: bool,
}

pub struct PendingJob {
    pub result: String,
    pub hash: String,
    pub employer: String,
}

// =============================================================================
// Response Models
// =============================================================================

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
    pub agent_pubkey: String,
    pub program_id: String,
    pub uptime_seconds: u64,
}

#[derive(Debug, Serialize)]
pub struct AgentInfoResponse {
    pub pubkey: String,
    pub program_id: String,
    pub supported_agents: Vec<AgentSpec>,
    pub ai_provider: String,
}

#[derive(Debug, Serialize)]
pub struct AgentSpec {
    pub id: String,
    pub name: String,
    pub role: String,
    pub system_prompt: String,
}

#[derive(Debug, Serialize)]
pub struct ExecuteJobResponse {
    pub success: bool,
    pub job_id: String,
    pub result: String,
    pub result_hash: String,
    pub processing_time_ms: u64,
    pub agent_id: String,
}

#[derive(Debug, Serialize)]
pub struct CompleteJobOnchainResponse {
    pub success: bool,
    pub signature: String,
    pub job_id: String,
    pub result_hash: String,
}

#[derive(Debug, Serialize)]
pub struct JobStatusResponse {
    pub job_id: String,
    pub status: String,
    pub result: Option<String>,
    pub result_hash: Option<String>,
    pub completed_at: Option<String>,
}
