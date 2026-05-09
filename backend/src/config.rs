use anyhow::{Context, Result};

/// AI provider variants
#[derive(Debug, Clone)]
pub enum AiProvider {
    OpenAi,
    Grok,
    Mock,
}

/// Application configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct AppConfig {
    // Solana
    pub solana_rpc_url: String,
    pub program_id: String,
    pub agent_secret_key: String,

    // AI
    pub ai_provider: AiProvider,
    pub ai_api_key: String,
    pub ai_model: String,

    // Server
    pub host: String,
    pub port: u16,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let ai_provider_str = std::env::var("AI_PROVIDER").unwrap_or_else(|_| "mock".into());
        let ai_provider = match ai_provider_str.to_lowercase().as_str() {
            "openai" => AiProvider::OpenAi,
            "grok" => AiProvider::Grok,
            _ => AiProvider::Mock,
        };

        Ok(Self {
            solana_rpc_url: std::env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "https://api.devnet.solana.com".into()),
            program_id: std::env::var("PROGRAM_ID")
                .context("PROGRAM_ID must be set")?,
            agent_secret_key: std::env::var("AGENT_SECRET_KEY")
                .unwrap_or_default(),
            ai_provider,
            ai_api_key: std::env::var("AI_API_KEY").unwrap_or_default(),
            ai_model: std::env::var("AI_MODEL")
                .unwrap_or_else(|_| "gpt-4o".into()),
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .unwrap_or(3001),
        })
    }
}
