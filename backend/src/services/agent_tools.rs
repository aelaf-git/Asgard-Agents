use serde::{Deserialize, Serialize};
use rig::tool::Tool;
use rig::completion::ToolDefinition;

#[derive(Deserialize, Serialize)]
pub struct GithubFetchArgs {
    pub url: String,
}

#[derive(Debug, thiserror::Error)]
#[error("GitHub Tool Error: {0}")]
pub struct GithubToolError(String);

pub struct GithubFetcher;

impl Tool for GithubFetcher {
    type Args = GithubFetchArgs;
    type Output = String;
    type Error = GithubToolError;

    const NAME: &'static str = "github_fetcher";

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Fetches content from a public GitHub repository. Can fetch a specific file if provided, or the repository structure if a root URL is given. Input MUST be a public GitHub URL.".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The public GitHub URL (e.g., https://github.com/user/repo or https://github.com/user/repo/blob/main/src/lib.rs)"
                    }
                },
                "required": ["url"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let clean_url = args.url.trim().trim_end_matches('/');
        
        // Parse owner/repo/path
        // Example: https://github.com/aelaf-git/CRUD-API/blob/main/src/main.rs
        let parts: Vec<&str> = clean_url.split("github.com/").collect();
        if parts.len() < 2 {
            return Err(GithubToolError("Invalid GitHub URL format".into()));
        }

        let path_parts: Vec<&str> = parts[1].split('/').collect();
        if path_parts.len() < 2 {
            return Err(GithubToolError("URL must contain at least owner and repo".into()));
        }

        let owner = path_parts[0];
        let repo = path_parts[1];
        
        // Build API URL
        // If it's a blob link, we need to extract the path after the branch
        let api_url = if path_parts.contains(&"blob") {
            let blob_index = path_parts.iter().position(|&r| r == "blob").unwrap();
            let branch = path_parts.get(blob_index + 1).unwrap_or(&"main");
            let file_path = path_parts[blob_index + 2..].join("/");
            format!("https://api.github.com/repos/{}/{}/contents/{}?ref={}", owner, repo, file_path, branch)
        } else {
            // Root repo - fetch README or file list
            format!("https://api.github.com/repos/{}/{}/contents", owner, repo)
        };

        tracing::info!("Agent Tool: Fetching via GitHub API: {}", api_url);
        
        let client = reqwest::Client::new();
        let resp = client.get(&api_url)
            .header("User-Agent", "AIGENT-Bot")
            .header("Accept", "application/vnd.github.v3+json")
            .send()
            .await
            .map_err(|e| GithubToolError(format!("API request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(GithubToolError(format!("GitHub API returned {}: {}", resp.status(), api_url)));
        }

        let json: serde_json::Value = resp.json().await
            .map_err(|e| GithubToolError(format!("Failed to parse JSON: {}", e)))?;

        // Handle file vs directory
        if json.is_array() {
            // It's a directory listing
            let files = json.as_array().unwrap();
            let mut list = String::from("Repository Directory Listing:\n");
            for file in files.iter().take(20) {
                let name = file["name"].as_str().unwrap_or("unknown");
                let type_str = file["type"].as_str().unwrap_or("file");
                list.push_str(&format!("- [{}] {}\n", type_str, name));
            }
            Ok(format!("{}\n\nPlease ask to fetch a specific file from this list for deep analysis.", list))
        } else {
            // It's a single file
            let content_base64 = json["content"].as_str()
                .ok_or_else(|| GithubToolError("No content field in API response".into()))?
                .replace('\n', "")
                .replace('\r', "");
            
            use base64::{Engine as _, engine::general_purpose};
            let decoded_bytes = general_purpose::STANDARD.decode(content_base64)
                .map_err(|e| GithubToolError(format!("Base64 decode failed: {}", e)))?;
            
            let decoded = String::from_utf8(decoded_bytes)
                .map_err(|e| GithubToolError(format!("UTF-8 decode failed: {}", e)))?;

            if decoded.len() > 15000 {
                Ok(format!("{}... [TRUNCATED]", &decoded[..15000]))
            } else {
                Ok(decoded)
            }
        }
    }
}
