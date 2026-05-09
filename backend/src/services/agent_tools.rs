use serde::{Deserialize, Serialize};
use rig::tool::Tool;
use rig::completion::ToolDefinition;
use base64::{Engine as _, engine::general_purpose};

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
            description: "Deep-scans a GitHub repository. Recursively fetches high-signal code files (.rs, .toml, .ts, .js, .py, .sol) while ignoring noise. Returns a bundled context block of the entire codebase.".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The public GitHub repository URL"
                    }
                },
                "required": ["url"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let clean_url = args.url.trim().trim_end_matches('/');
        let parts: Vec<&str> = clean_url.split("github.com/").collect();
        if parts.len() < 2 {
            return Err(GithubToolError("Invalid GitHub URL".into()));
        }

        let path_parts: Vec<&str> = parts[1].split('/').collect();
        let owner = path_parts[0];
        let repo = path_parts[1];
        
        tracing::info!("Selective Context: Scanning repo {}/{}", owner, repo);
        
        let client = reqwest::Client::new();
        
        // 1. Get the recursive tree
        let tree_url = format!("https://api.github.com/repos/{}/{}/git/trees/main?recursive=1", owner, repo);
        let mut resp = client.get(&tree_url)
            .header("User-Agent", "AIGENT-Bot")
            .send()
            .await
            .map_err(|e| GithubToolError(format!("Failed to fetch tree: {}", e)))?;

        // Fallback to 'master' if 'main' fails
        if !resp.status().is_success() {
            let tree_url_master = format!("https://api.github.com/repos/{}/{}/git/trees/master?recursive=1", owner, repo);
            resp = client.get(&tree_url_master)
                .header("User-Agent", "AIGENT-Bot")
                .send()
                .await
                .map_err(|e| GithubToolError(format!("Failed to fetch tree (master): {}", e)))?;
        }

        if !resp.status().is_success() {
            return Err(GithubToolError(format!("GitHub API Error: {}", resp.status())));
        }

        let tree_json: serde_json::Value = resp.json().await.map_err(|e| GithubToolError(e.to_string()))?;
        let tree = tree_json["tree"].as_array().ok_or_else(|| GithubToolError("Invalid tree response".into()))?;

        // 2. Filter high-signal files
        let high_signal_exts = [".rs", ".toml", ".ts", ".js", ".py", ".sol", ".go", ".c", ".cpp"];
        let mut context_block = String::from("REPOSITORY CONTEXT BLOCK:\n\n");
        let mut files_to_fetch = Vec::new();

        for item in tree {
            let path = item["path"].as_str().unwrap_or("");
            let type_str = item["type"].as_str().unwrap_or("");

            if type_str == "blob" && high_signal_exts.iter().any(|ext| path.ends_with(ext)) {
                if !path.contains("node_modules") && !path.contains("target/") && !path.contains("dist/") {
                    files_to_fetch.push(path.to_string());
                }
            }
        }

        // 3. Aggregate content (limit to top 10 files to avoid context explosion)
        for path in files_to_fetch.iter().take(10) {
            let content_url = format!("https://api.github.com/repos/{}/{}/contents/{}", owner, repo, path);
            let file_resp = client.get(&content_url)
                .header("User-Agent", "AIGENT-Bot")
                .send()
                .await;

            if let Ok(res) = file_resp {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if let Some(content_b64) = json["content"].as_str() {
                        let content_b64 = content_b64.replace('\n', "").replace('\r', "");
                        if let Ok(decoded_bytes) = general_purpose::STANDARD.decode(content_b64) {
                            if let Ok(decoded) = String::from_utf8(decoded_bytes) {
                                context_block.push_str(&format!("--- FILE: {} ---\n{}\n\n", path, decoded));
                            }
                        }
                    }
                }
            }
        }

        let reminder = "\n\n[SYSTEM REMINDER: You are CIPHER. Do NOT output this raw code. You must now write a highly conversational, professional security audit report analyzing the architecture and identifying any vulnerabilities in the code above.]";

        if context_block.len() > 15000 {
            Ok(format!("{}... [CONTEXT TRUNCATED]{}", &context_block[..15000], reminder))
        } else {
            Ok(format!("{}{}", context_block, reminder))
        }
    }
}
