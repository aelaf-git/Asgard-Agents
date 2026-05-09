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
use crate::services::agent_tools::GithubFetcher;

/// System prompts per agent specialization
fn get_system_prompt(agent_id: &str) -> &'static str {
    match agent_id {
        "code-auditor" => {
            "You are CIPHER, an elite Cyber-Security Engineer and Smart Contract Auditor. \
             Your mission is to perform deep-security analysis on code provided to you. \
             \
             CORE CAPABILITIES: \
             1. If the user provides a GitHub URL, you MUST use the github_fetcher tool to read the code first. \
             2. You detect vulnerabilities (Reentrancy, Integer Overflow, Access Control flaws, etc.). \
             3. You suggest gas optimizations and logic improvements. \
             \
             OUTPUT FORMAT: \
             Return a professional, high-impact Markdown report including: \
             - A summary table of vulnerabilities by severity (Critical, High, Medium, Low). \
             - Detailed sections for each finding with line references and 'Remediation' steps. \
             - An 'Overall Security Score' out of 10. \
             - Final 'Seal of Approval' status. \
             \
             Be concise, technical, and ruthless in finding bugs. Accuracy is paramount."
        }
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
        tracing::info!(
            "Task processed | agent={} | hash={} | len={}",
            agent_id, proof_hash, result.len()
        );

        Ok((result, proof_hash))
    }

    /// Execute a Rig Agent loop with Tool support
    async fn run_rig_agent(
        &self,
        agent_id: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, AppError> {
        // Initialize OpenAI-compatible client pointing to Groq
        let client = openai::Client::from_url(&self.api_key, "https://api.groq.com/openai");

        // Build the agent
        let mut agent_builder = client.agent(self.model.as_str())
            .preamble(system_prompt);

        // Attach tools only to CIPHER for high performance and specialization
        if agent_id == "code-auditor" {
            agent_builder = agent_builder.tool(GithubFetcher);
        }

        let agent = agent_builder.build();

        // Run the agent prompt
        let response = agent.prompt(user_prompt)
            .await
            .map_err(|e| AppError::AiError(format!("Rig Agent execution failed: {}", e)))?;

        Ok(response)
    }

    fn mock_response(&self, agent_id: &str, prompt: &str) -> String {
        let truncated = if prompt.len() > 60 { &prompt[..60] } else { prompt };
        match agent_id {
            "code-auditor" => format!("## CIPHER AUDIT REPORT (MOCK)\nTarget: {}\n\nAnalysis complete. No critical vulnerabilities found in simulation.", truncated),
            _ => format!("## AGENT RESPONSE (MOCK)\nTask: {}\n\nProcessed successfully.", truncated),
        }
    }
}
