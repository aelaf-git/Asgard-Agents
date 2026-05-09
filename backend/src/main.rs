//! AIGENT Backend — Decentralized AI Agent Executioner Service
//!
//! This Rust/Axum server acts as the "Agent Executioner" bridge between
//! the frontend and the Solana blockchain. It:
//!   1. Receives task execution requests from the frontend
//!   2. Processes tasks via an AI provider (OpenAI, Grok, or mock)
//!   3. Generates a cryptographic proof-of-work hash
//!   4. Signs and submits `complete_job` transactions on Solana
//!   5. Returns the result + proof to the frontend

mod config;
mod error;
mod models;
mod routes;
mod services;

use std::sync::Arc;
use axum::{Router, routing::{get, post}};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::AppConfig;
use crate::services::{ai::AiService, solana::SolanaService};

use dashmap::DashMap;
use crate::models::PendingJob;

/// Shared application state injected into all route handlers
pub struct AppState {
    pub config: AppConfig,
    pub ai_service: AiService,
    pub solana_service: SolanaService,
    pub pending_jobs: DashMap<String, PendingJob>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing (logging)
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "aigent_backend=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration from environment
    dotenvy::dotenv().ok();
    let config = AppConfig::from_env()?;

    tracing::info!("AIGENT Backend v{}", env!("CARGO_PKG_VERSION"));
    tracing::info!("Program ID: {}", config.program_id);
    tracing::info!("AI Provider: {:?}", config.ai_provider);
    tracing::info!("RPC: {}", config.solana_rpc_url);

    // Initialize services
    let ai_service = AiService::new(&config);
    let solana_service = SolanaService::new(&config)?;

    tracing::info!("Agent pubkey: {}", solana_service.agent_pubkey());

    let state = Arc::new(AppState {
        config: config.clone(),
        ai_service,
        solana_service,
        pending_jobs: DashMap::new(),
    });

    // CORS — allow frontend origins
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(routes::health::health_check))
        .route("/api/agent/info", get(routes::agent::agent_info))
        .route("/api/job/execute", post(routes::job::execute_job))
        .route("/api/job/status/:job_id", get(routes::job::job_status))
        .route("/api/job/finalize", post(routes::job::finalize_job))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
