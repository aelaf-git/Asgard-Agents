use serde::{Deserialize, Serialize};

// =============================================================================
// Request Models
// =============================================================================

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
pub struct CompleteJobOnchainResponse {
    pub success: bool,
    pub signature: String,
    pub job_id: String,
    pub result_hash: String,
}


