//! AI Service — Processes tasks via Rig (Agentic Framework) with Groq
//!
//! Features:
//!   - High-performance Agentic loop using Rig
//!   - Tools: GitHub Fetcher (real-time code analysis)
//!   - Provider: Groq (via OpenAI-compatible API)

use sha2::{Sha256, Digest};
use rig::providers::openai;
use rig::completion::Prompt;
use crate::config::{AppConfig, AiProvider};
use crate::error::AppError;

/// System prompts per agent specialization
fn get_system_prompt(agent_id: &str) -> &'static str {
    match agent_id {
        "architect" => "You are NEXUS, a world-class Principal System Architect. \
            Your goal is to design scalable, secure, and modern system architectures based on user requirements. \
            \
            CRITICAL RULES: \
            1. Always provide a detailed, conversational breakdown of the architecture (Frontend, Backend, Database, Infrastructure). \
            2. You MUST generate at least one architecture diagram using `mermaid` syntax. \
            3. Use ```mermaid code blocks for your diagrams. \
            4. Keep the diagrams clean and easy to read (e.g. graph TD, sequenceDiagram, erDiagram). \
            5. Explain trade-offs for the technical choices you make.",
        "sentiment-analyst" => {
            "You are PRISM, a high-frequency market sentiment analyst. \
             Analyze the provided data or query for social sentiment, whale activity, and market momentum. \
             Return a structured report with a sentiment score (0-100) and actionable alpha signals."
        }
        _ => "You are a specialized AI Agent. Complete the task with high precision and technical detail."
    }
}

/// Generates a SHA-256 hash of the result content
pub fn generate_proof_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    format!("0x{}", hex::encode(&result[..20]))
}

pub struct AiService {
    provider: AiProvider,
    api_key: String,
    model: String,
}

impl AiService {
    pub fn new(config: &AppConfig) -> Self {
        Self {
            provider: config.ai_provider.clone(),
            api_key: config.ai_api_key.clone(),
            model: config.ai_model.clone(),
        }
    }

    /// Process a task and return (result_text, proof_hash)
    pub async fn process_task(
        &self,
        agent_id: &str,
        prompt: &str,
    ) -> Result<(String, String), AppError> {
        let system_prompt = get_system_prompt(agent_id);

        let result = match &self.provider {
            AiProvider::Groq => self.run_rig_agent(agent_id, system_prompt, prompt).await?,
            AiProvider::Mock => self.mock_response(agent_id, prompt),
        };

        let proof_hash = generate_proof_hash(&result);
        Ok((result, proof_hash))
    }

    /// Execute a Rig Agent loop with Tool support (Streaming Fallback)
    pub async fn process_task_stream(
        &self,
        agent_id: &str,
        user_prompt: &str,
    ) -> Result<futures_util::stream::BoxStream<'static, Result<String, AppError>>, AppError> {
        let system_prompt = get_system_prompt(agent_id);
        let client = openai::Client::from_url(&self.api_key, "https://api.groq.com/openai");
        
        let agent = client.agent(self.model.as_str())
            .preamble(system_prompt)
            .build();

        // Run full prompt then stream the result
        let response = agent.prompt(user_prompt)
            .await
            .map_err(|e| AppError::AiError(format!("Agent execution failed: {}", e)))?;

        use futures_util::StreamExt;
        
        // Return a pinned stream that yields the full response as one chunk
        Ok(futures_util::stream::once(async move {
            Ok(response)
        }).boxed())
    }

    /// Execute a Rig Agent loop with Tool support (Non-streaming)
    async fn run_rig_agent(
        &self,
        _agent_id: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, AppError> {
        // Initialize OpenAI-compatible client pointing to Groq
        let client = openai::Client::from_url(&self.api_key, "https://api.groq.com/openai");

        // Build the agent
        let agent = client.agent(self.model.as_str())
            .preamble(system_prompt)
            .build();

        // Run the agent prompt
        let response = agent.prompt(user_prompt)
            .await
            .map_err(|e| AppError::AiError(format!("Rig Agent execution failed: {}", e)))?;

        Ok(response)
    }

    fn mock_response(&self, agent_id: &str, prompt: &str) -> String {
        let truncated = if prompt.len() > 60 { &prompt[..60] } else { prompt };
        match agent_id {
            "architect" => format!("## NEXUS ARCHITECTURE (MOCK)\nSystem: {}\n\n```mermaid\ngraph TD\nA-->B;\n```", truncated),
            _ => format!("## AGENT RESPONSE (MOCK)\nTask: {}\n\nProcessed successfully.", truncated),
        }
    }
}
