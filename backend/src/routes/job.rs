use std::sync::Arc;
use axum::{
    extract::{Path, State},
    Json,
    response::sse::{Event, Sse},
};
use futures_util::{Stream, StreamExt};
use std::convert::Infallible;

use crate::AppState;
use crate::error::AppError;
use crate::models::{
    ExecuteJobRequest, FinalizeJobRequest, CompleteJobOnchainResponse,
    PendingJob,
};

use axum::extract::Multipart;

/// POST /api/job/execute — Execute an AI task with REAL-TIME STREAMING
pub async fn execute_job(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    let mut job_id = String::new();
    let mut agent_id = String::new();
    let mut prompt = String::new();
    let mut employer = String::new();
    let mut amount = 0.001;
    let mut file_bytes: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        
        if name == "file" {
            let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
            file_bytes = Some(data.to_vec());
        } else {
            let text = field.text().await.unwrap_or_default();
            match name.as_str() {
                "job_id" => job_id = text,
                "agent_id" => agent_id = text,
                "prompt" => prompt = text,
                "employer" => employer = text,
                "amount" => amount = text.parse().unwrap_or(0.001),
                _ => {}
            }
        }
    }

    if prompt.is_empty() || job_id.is_empty() {
        return Err(AppError::BadRequest("Missing job_id or prompt".into()));
    }

    if amount > 0.1 {
        tracing::warn!("Charge is unusually high ({} SOL). Resetting to 0.001 for safety.", amount);
    }

    tracing::info!("Streaming audit for job {}", job_id);

    // Initialize the stream from AI service
    let mut stream = state.ai_service.process_task_stream(&job_id, &agent_id, &prompt, file_bytes).await?;
    let job_id_clone = job_id.clone();
    let employer_clone = employer.clone();

    // Create a background task to accumulate the full result for later settlement
    let state_clone = Arc::clone(&state);
    let (tx, rx) = tokio::sync::mpsc::channel(100);

    tokio::spawn(async move {
        let mut full_content = String::new();
        
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    full_content.push_str(&chunk);
                    let _ = tx.send(Ok(Event::default().data(chunk))).await;
                }
                Err(e) => {
                    let _ = tx.send(Ok(Event::default().event("error").data(e.to_string()))).await;
                    return;
                }
            }
        }

        // Once done, generate hash and store in pending_jobs
        let hash = crate::services::ai::generate_proof_hash(&full_content);
        state_clone.pending_jobs.insert(job_id_clone.clone(), PendingJob {
            result: full_content,
            hash: hash.clone(),
            employer: employer_clone,
        });

        // Send 'done' with the real hash
        let done_payload = serde_json::json!({
            "job_id": job_id_clone,
            "hash": hash
        }).to_string();
        
        let _ = tx.send(Ok(Event::default().event("done").data(done_payload))).await;
    });

    Ok(Sse::new(tokio_stream::wrappers::ReceiverStream::new(rx)))
}

/// POST /api/job/finalize — Approve (Release) or Reject (Refund)
pub async fn finalize_job(
    State(state): State<Arc<AppState>>,
    Json(req): Json<FinalizeJobRequest>,
) -> Result<Json<CompleteJobOnchainResponse>, AppError> {
    tracing::info!("Finalizing job {}: approve={}", req.job_id, req.approve);

    let pending = state.pending_jobs.remove(&req.job_id)
        .ok_or_else(|| AppError::BadRequest("Job not found in pending queue".into()))?;

    let signature = if req.approve {
        // Release funds to agent
        state.solana_service
            .complete_job_onchain(&req.employer, &req.job_id, &pending.1.hash)
            .await?
    } else {
        // Refund funds to employer
        state.solana_service
            .cancel_job_onchain(&req.employer, &req.job_id)
            .await?
    };

    Ok(Json(CompleteJobOnchainResponse {
        success: true,
        signature,
        job_id: req.job_id,
        result_hash: pending.1.hash,
    }))
}

/// GET /api/job/status/:job_id — Check job execution status
pub async fn job_status(
    Path(job_id): Path<String>,
) -> Json<crate::models::JobStatusResponse> {
    Json(crate::models::JobStatusResponse {
        job_id,
        status: "pending".into(),
        result: None,
        result_hash: None,
        completed_at: None,
    })
}

/// POST /api/job/chat — Send a follow-up chat message (No escrow logic)
pub async fn chat_job(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    let mut job_id = String::new();
    let mut agent_id = String::new();
    let mut prompt = String::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::BadRequest(e.to_string()))? {
        let name = field.name().unwrap_or("").to_string();
        let text = field.text().await.unwrap_or_default();
        match name.as_str() {
            "job_id" => job_id = text,
            "agent_id" => agent_id = text,
            "prompt" => prompt = text,
            _ => {}
        }
    }

    if prompt.is_empty() || job_id.is_empty() {
        return Err(AppError::BadRequest("Missing job_id or prompt".into()));
    }

    tracing::info!("Streaming chat for job {}", job_id);

    let mut stream = state.ai_service.process_task_stream(&job_id, &agent_id, &prompt, None).await?;

    let (tx, rx) = tokio::sync::mpsc::channel(100);

    tokio::spawn(async move {
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(chunk) => {
                    let _ = tx.send(Ok(Event::default().data(chunk))).await;
                }
                Err(e) => {
                    let _ = tx.send(Ok(Event::default().event("error").data(e.to_string()))).await;
                    return;
                }
            }
        }
        
        let done_payload = serde_json::json!({
            "job_id": job_id,
            "hash": "chat_response"
        }).to_string();
        
        let _ = tx.send(Ok(Event::default().event("done").data(done_payload))).await;
    });

    Ok(Sse::new(tokio_stream::wrappers::ReceiverStream::new(rx)))
}
