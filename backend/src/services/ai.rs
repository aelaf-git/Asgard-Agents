use crate::error::AppError;
use futures_util::stream::BoxStream;
use futures_util::StreamExt;
use reqwest::Client;
use eventsource_stream::Eventsource;

#[derive(Clone)]
pub struct AiService {
    python_api_url: String,
    client: Client,
}

impl AiService {
    pub fn new() -> Self {
        Self {
            python_api_url: std::env::var("PYTHON_API_URL").unwrap_or_else(|_| "http://localhost:8000".to_string()),
            client: Client::new(),
        }
    }

    /// Connects to the Python SSE endpoint and returns a mapped chunk stream
    pub async fn process_task_stream(
        &self,
        agent_id: &str,
        user_prompt: &str,
    ) -> Result<BoxStream<'static, Result<String, AppError>>, AppError> {
        tracing::info!("Proxying task to Python Microservice for agent: {}", agent_id);

        let payload = serde_json::json!({
            "agent_id": agent_id,
            "prompt": user_prompt
        });

        let response = self.client.post(format!("{}/api/execute", self.python_api_url))
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::AiError(format!("Failed to connect to Python service: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            tracing::error!("Python service rejected request: {}", error_text);
            return Err(AppError::AiError(format!("Python service error: {}", error_text)));
        }

        // Convert the response bytes to an EventSource stream, then map it to Result<String, AppError>
        let mapped_stream = response.bytes_stream().eventsource().map(|event_result| {
            match event_result {
                Ok(event) => {
                    if event.event == "error" {
                        Err(AppError::AiError(event.data))
                    } else {
                        Ok(event.data)
                    }
                }
                Err(e) => Err(AppError::AiError(format!("Stream parsing error: {}", e))),
            }
        });

        Ok(mapped_stream.boxed())
    }
}

pub fn generate_proof_hash(content: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}
