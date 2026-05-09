//! AI Service — Processes tasks via LLM API or mock simulation
//!
//! Supports three providers:
//!   - OpenAI (GPT-4o) via REST API
//!   - Grok (xAI) via REST API
//!   - Mock (in-process simulation for development)

use sha2::{Sha256, Digest};
use crate::config::{AppConfig, AiProvider};
use crate::error::AppError;

/// System prompts per agent specialization
fn get_system_prompt(agent_id: &str) -> &'static str {
    match agent_id {
        "code-auditor" => {
            "You are CIPHER, an elite smart contract security auditor. \
             Analyze code for vulnerabilities, gas optimizations, and security flaws. \
             Return a structured audit report with severity ratings (Critical/High/Medium/Low), \
             specific line references, and remediation recommendations. \
             Score the code out of 10."
        }
        "sentiment-analyst" => {
            "You are PRISM, a market sentiment analyst for crypto and DeFi. \
             Analyze sentiment across social media, on-chain metrics, and market data. \
             Return a structured report with sentiment score (0-100), social metrics, \
             on-chain signals, risk assessment, and an alpha signal with confidence %."
        }
        "content-creator" => {
            "You are MUSE, a Web3 content strategist and writer. \
             Create compelling narratives, Twitter threads, marketing copy, \
             and technical documentation optimized for the crypto audience. \
             Format output clearly with sections."
        }
        "architect" => {
            "You are NEXUS, a distributed systems architect specializing in Web3. \
             Design scalable system architectures with ASCII diagrams, \
             database schemas, API contracts, and deployment strategies. \
             Focus on microservices, event-driven patterns, and blockchain integration."
        }
        "data-analyst" => {
            "You are ORACLE, a DeFi data analyst. \
             Transform raw data into actionable insights with tables, \
             correlation matrices, predictive models, and clear recommendations. \
             Include specific metrics and confidence levels."
        }
        "solidity-dev" => {
            "You are FORGE, an expert Solana/Anchor smart contract developer. \
             Write production-grade Rust/Anchor programs with proper PDA patterns, \
             error handling, events, access control, and space optimizations. \
             Include deployment notes and rent estimates."
        }
        _ => {
            "You are a helpful AI agent. Process the given task thoroughly \
             and return a well-structured, detailed response."
        }
    }
}

/// Generates a SHA-256 hash of the result content
pub fn generate_proof_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    format!("0x{}", hex::encode(&result[..20])) // 40-char hex (fits in 64-char field)
}

pub struct AiService {
    provider: AiProvider,
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl AiService {
    pub fn new(config: &AppConfig) -> Self {
        Self {
            provider: config.ai_provider.clone(),
            api_key: config.ai_api_key.clone(),
            model: config.ai_model.clone(),
            client: reqwest::Client::new(),
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
            AiProvider::Groq => self.call_groq(system_prompt, prompt).await?,
            AiProvider::Mock => self.mock_response(agent_id, prompt),
        };

        let proof_hash = generate_proof_hash(&result);
        tracing::info!(
            "Task processed | agent={} | hash={} | len={}",
            agent_id, proof_hash, result.len()
        );

        Ok((result, proof_hash))
    }

    // =========================================================================
    // Groq Provider (OpenAI-compatible)
    // =========================================================================

    async fn call_groq(&self, system_prompt: &str, user_prompt: &str) -> Result<String, AppError> {
        let body = serde_json::json!({
            "model": self.model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ],
            "max_tokens": 2048,
            "temperature": 0.7
        });

        let resp = self.client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::AiError(format!("Groq request failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::AiError(format!("Groq {} — {}", status, text)));
        }

        let json: serde_json::Value = resp.json().await
            .map_err(|e| AppError::AiError(format!("Failed to parse Groq response: {}", e)))?;

        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| AppError::AiError("No content in Groq response".into()))?;

        Ok(content.to_string())
    }

    // =========================================================================
    // Mock Provider (Development)
    // =========================================================================

    fn mock_response(&self, agent_id: &str, prompt: &str) -> String {
        let truncated = if prompt.len() > 60 { &prompt[..60] } else { prompt };

        match agent_id {
            "code-auditor" => format!(
                "## CIPHER AUDIT REPORT\n### Target: {}...\n\n\
                **Severity Summary:**\n\
                | Level | Count |\n|-------|-------|\n\
                | Critical | 0 |\n| High | 1 |\n| Medium | 3 |\n| Low | 2 |\n\n\
                **[HIGH] Unchecked Return Value**\n\
                Line 47: The return value of `transfer()` is not validated.\n\n\
                **[MEDIUM] Reentrancy Guard Missing**\n\
                Line 82: State change occurs after external call.\n\n\
                **[MEDIUM] Integer Overflow Risk**\n\
                Line 114: Multiplication without overflow check.\n\n\
                **[MEDIUM] Access Control**\n\
                Line 23: Admin function lacks modifier.\n\n\
                **Overall Score: 7.2/10**",
                truncated
            ),
            "sentiment-analyst" => format!(
                "## PRISM SENTIMENT ANALYSIS\n### Query: {}...\n\n\
                **Overall Sentiment: BULLISH (72/100)**\n\n\
                **Social Metrics (24h):**\n\
                - Twitter Mentions: 12,847 (+34%)\n\
                - Discord Activity: HIGH\n\
                - Reddit Sentiment: 78% Positive\n\n\
                **On-Chain Signals:**\n\
                - Whale Accumulation: Detected\n\
                - DEX Volume: $4.2M (+67%)\n\n\
                **Alpha Signal:** Accumulation zone detected. Confidence: 78%",
                truncated
            ),
            _ => format!(
                "## AGENT RESPONSE\n### Task: {}...\n\n\
                Analysis complete. Task processed with full verification.\n\
                Result generated successfully.",
                truncated
            ),
        }
    }
}
