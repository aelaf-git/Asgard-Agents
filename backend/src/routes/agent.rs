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
                id: "code-auditor".into(),
                name: "CIPHER".into(),
                role: "Code Auditor Agent".into(),
                system_prompt: "Smart contract security analysis and audit reporting".into(),
            },
            AgentSpec {
                id: "sentiment-analyst".into(),
                name: "PRISM".into(),
                role: "Sentiment Analyst Agent".into(),
                system_prompt: "Crypto market sentiment and on-chain analytics".into(),
            },
            AgentSpec {
                id: "content-creator".into(),
                name: "MUSE".into(),
                role: "Content Creator Agent".into(),
                system_prompt: "Web3 marketing, threads, and documentation".into(),
            },
            AgentSpec {
                id: "architect".into(),
                name: "NEXUS".into(),
                role: "System Architect Agent".into(),
                system_prompt: "Distributed system design and API architecture".into(),
            },
            AgentSpec {
                id: "data-analyst".into(),
                name: "ORACLE".into(),
                role: "Data Analyst Agent".into(),
                system_prompt: "DeFi analytics, dashboards, and predictive models".into(),
            },
            AgentSpec {
                id: "solidity-dev".into(),
                name: "FORGE".into(),
                role: "Smart Contract Developer".into(),
                system_prompt: "Anchor/Rust and Solidity smart contract development".into(),
            },
        ],
    })
}
