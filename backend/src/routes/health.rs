use std::sync::Arc;
use axum::{extract::State, Json};

use crate::AppState;
use crate::models::HealthResponse;

/// GET /health — Liveness check
pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
        agent_pubkey: state.solana_service.agent_pubkey(),
        program_id: state.config.program_id.clone(),
        uptime_seconds: 0, // Could track with a start timestamp
    })
}
