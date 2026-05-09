use std::sync::Arc;
use axum::{
    extract::{Path, State},
    Json,
};

use crate::AppState;
use crate::error::AppError;
use crate::models::{
    CompleteJobOnchainRequest, CompleteJobOnchainResponse,
    ExecuteJobRequest, ExecuteJobResponse,
    JobStatusResponse,
};

/// POST /api/job/execute — Execute an AI task (off-chain processing)
///
/// Flow:
///   1. Frontend calls `initialize_job` on Solana (locks SOL)
///   2. Frontend calls this endpoint with the job details
///   3. Backend processes the task via AI provider
///   4. Returns result + proof hash to frontend
///   5. Frontend (or backend) calls `complete_job` on Solana
pub async fn execute_job(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ExecuteJobRequest>,
) -> Result<Json<ExecuteJobResponse>, AppError> {
    // Validate input
    if req.prompt.is_empty() {
        return Err(AppError::BadRequest("Prompt cannot be empty".into()));
    }
    if req.job_id.is_empty() {
        return Err(AppError::BadRequest("Job ID is required".into()));
    }
    if req.amount <= 0.0 {
        return Err(AppError::BadRequest("Amount must be positive".into()));
    }

    tracing::info!(
        "Executing job | id={} | agent={} | employer={} | amount={}",
        req.job_id, req.agent_id, req.employer, req.amount
    );

    let start = std::time::Instant::now();

    // Process task via AI service
    let (result, result_hash) = state
        .ai_service
        .process_task(&req.agent_id, &req.prompt)
        .await?;

    let processing_time_ms = start.elapsed().as_millis() as u64;

    Ok(Json(ExecuteJobResponse {
        success: true,
        job_id: req.job_id,
        result,
        result_hash,
        processing_time_ms,
        agent_id: req.agent_id,
    }))
}

/// POST /api/job/complete — Sign `complete_job` on Solana
///
/// After the AI processes the task, this endpoint:
///   1. Signs the `complete_job` instruction with the agent's keypair
///   2. Submits the transaction to Solana
///   3. Returns the transaction signature as proof
pub async fn complete_job_onchain(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CompleteJobOnchainRequest>,
) -> Result<Json<CompleteJobOnchainResponse>, AppError> {
    if req.result_hash.is_empty() || req.result_hash.len() > 64 {
        return Err(AppError::BadRequest("Result hash must be 1-64 characters".into()));
    }

    tracing::info!(
        "Completing job on-chain | id={} | employer={} | hash={}",
        req.job_id, req.employer, req.result_hash
    );

    let signature = state
        .solana_service
        .complete_job_onchain(&req.employer, &req.job_id, &req.result_hash)
        .await?;

    Ok(Json(CompleteJobOnchainResponse {
        success: true,
        signature,
        job_id: req.job_id,
        result_hash: req.result_hash,
    }))
}

/// GET /api/job/status/:job_id — Check job execution status
///
/// In production, this would query on-chain state or a local cache.
/// For now returns a placeholder indicating the job flow.
pub async fn job_status(
    Path(job_id): Path<String>,
) -> Json<JobStatusResponse> {
    // In production: fetch from on-chain or Redis cache
    Json(JobStatusResponse {
        job_id,
        status: "pending".into(),
        result: None,
        result_hash: None,
        completed_at: None,
    })
}
