use std::sync::Arc;
use axum::{extract::State, Json};

use crate::AppState;
use crate::models::{AgentInfoResponse, AgentSpec};

/// GET /api/agent/info — Returns agent metadata and supported specializations
pub async fn agent_info(
    State(state): State<Arc<AppState>>,
) -> Json<AgentInfoResponse> {
    let provider = match &state.config.ai_provider {
        crate::config::AiProvider::Groq => "groq",
        crate::config::AiProvider::Mock => "mock",
    };

    Json(AgentInfoResponse {
        pubkey: state.solana_service.agent_pubkey(),
        program_id: state.config.program_id.clone(),
        ai_provider: provider.to_string(),
        supported_agents: vec![
            AgentSpec {
                id: "heimdall".into(),
                name: "HEIMDALL".into(),
                role: "Coding Agent".into(),
                system_prompt: "System architecture design and API development".into(),
            },
            AgentSpec {
                id: "odin".into(),
                name: "ODIN".into(),
                role: "Studying Agent".into(),
                system_prompt: "Document analysis and RAG-based tutoring".into(),
            },
            AgentSpec {
                id: "idunn".into(),
                name: "IDUNN".into(),
                role: "Cooking Agent".into(),
                system_prompt: "Recipe creation, meal planning, and cooking techniques".into(),
            },
        ],
    })
}
