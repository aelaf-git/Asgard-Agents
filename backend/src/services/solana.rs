//! Solana Service — Signs and submits `complete_job` transactions
//!
//! Holds the AI Agent's keypair and constructs the on-chain transaction
//! to release escrowed SOL after task completion.

use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};
use solana_client::rpc_client::RpcClient;
use std::str::FromStr;

use crate::config::AppConfig;
use crate::error::AppError;

pub struct SolanaService {
    rpc_client: RpcClient,
    agent_keypair: Keypair,
    program_id: Pubkey,
}

impl SolanaService {
    pub fn new(config: &AppConfig) -> Result<Self, anyhow::Error> {
        let rpc_client = RpcClient::new_with_commitment(
            config.solana_rpc_url.clone(),
            CommitmentConfig::confirmed(),
        );

        // Decode agent keypair from base58 secret key
        // If no key is provided, generate an ephemeral one for development
        let agent_keypair = if config.agent_secret_key.is_empty() {
            tracing::warn!("No AGENT_SECRET_KEY set — using ephemeral keypair (dev mode)");
            Keypair::new()
        } else {
            let secret_bytes = bs58::decode(&config.agent_secret_key)
                .into_vec()
                .map_err(|e| anyhow::anyhow!("Invalid AGENT_SECRET_KEY base58: {}", e))?;
            Keypair::from_bytes(&secret_bytes)
                .map_err(|e| anyhow::anyhow!("Invalid keypair bytes: {}", e))?
        };

        let program_id = Pubkey::from_str(&config.program_id)
            .map_err(|e| anyhow::anyhow!("Invalid PROGRAM_ID: {}", e))?;

        Ok(Self {
            rpc_client,
            agent_keypair,
            program_id,
        })
    }

    /// Returns the agent's public key (base58)
    pub fn agent_pubkey(&self) -> String {
        self.agent_keypair.pubkey().to_string()
    }

    /// Derive the Job PDA: seeds = ["job", employer, job_id]
    fn derive_job_pda(&self, employer: &Pubkey, job_id: &str) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"job", employer.as_ref(), job_id.as_bytes()],
            &self.program_id,
        )
    }

    /// Derive the Vault PDA: seeds = ["vault", job_pda]
    fn derive_vault_pda(&self, job_pda: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"vault", job_pda.as_ref()],
            &self.program_id,
        )
    }

    /// Build and submit the `complete_job` transaction on Solana
    ///
    /// This transfers SOL from the PDA vault to the agent's wallet,
    /// serving as cryptographic proof that the work was delivered.
    pub async fn complete_job_onchain(
        &self,
        employer_str: &str,
        job_id: &str,
        result_hash: &str,
    ) -> Result<String, AppError> {
        let employer = Pubkey::from_str(employer_str)
            .map_err(|e| AppError::SolanaError(format!("Invalid employer pubkey: {}", e)))?;

        let (job_pda, _job_bump) = self.derive_job_pda(&employer, job_id);
        let (vault_pda, _vault_bump) = self.derive_vault_pda(&job_pda);
        let agent_pubkey = self.agent_keypair.pubkey();

        // =====================================================================
        // Build the Anchor `complete_job` instruction
        //
        // Instruction discriminator for "complete_job" = sha256("global:complete_job")[..8]
        // We compute it at compile time for the known function name.
        // =====================================================================

        let discriminator = {
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(b"global:complete_job");
            let hash = hasher.finalize();
            hash[..8].to_vec()
        };

        // Encode instruction data: discriminator + borsh(result_hash, job_id)
        let mut data = discriminator;

        // Borsh string encoding: 4-byte LE length prefix + UTF-8 bytes
        let result_hash_bytes = result_hash.as_bytes();
        data.extend_from_slice(&(result_hash_bytes.len() as u32).to_le_bytes());
        data.extend_from_slice(result_hash_bytes);

        let job_id_bytes = job_id.as_bytes();
        data.extend_from_slice(&(job_id_bytes.len() as u32).to_le_bytes());
        data.extend_from_slice(job_id_bytes);

        // Account metas (must match the Anchor accounts struct order)
        let accounts = vec![
            AccountMeta::new(job_pda, false),           // job (mut)
            AccountMeta::new(vault_pda, false),          // vault (mut)
            AccountMeta::new(agent_pubkey, true),        // agent (signer, mut)
            AccountMeta::new(employer, false),           // employer (mut)
            AccountMeta::new_readonly(system_program::id(), false), // system_program
        ];

        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data,
        };

        // Fetch recent blockhash and build transaction
        let recent_blockhash = self.rpc_client
            .get_latest_blockhash()
            .map_err(|e| AppError::SolanaError(format!("Failed to get blockhash: {}", e)))?;

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&agent_pubkey),
            &[&self.agent_keypair],
            recent_blockhash,
        );

        // Submit transaction
        let signature = self.rpc_client
            .send_and_confirm_transaction(&tx)
            .map_err(|e| AppError::SolanaError(format!("Transaction failed: {}", e)))?;

        tracing::info!(
            "complete_job TX submitted | sig={} | job_id={} | employer={}",
            signature, job_id, employer_str
        );

        Ok(signature.to_string())
    }

    /// Build and submit the `cancel_job` transaction on Solana
    /// 
    /// This returns the escrowed SOL to the employer if they are unsatisfied.
    pub async fn cancel_job_onchain(
        &self,
        employer_str: &str,
        job_id: &str,
    ) -> Result<String, AppError> {
        let employer = Pubkey::from_str(employer_str)
            .map_err(|e| AppError::SolanaError(format!("Invalid employer pubkey: {}", e)))?;

        let (job_pda, _) = self.derive_job_pda(&employer, job_id);
        let (vault_pda, _) = self.derive_vault_pda(&job_pda);
        let agent_pubkey = self.agent_keypair.pubkey();

        let discriminator = {
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(b"global:cancel_job");
            let hash = hasher.finalize();
            hash[..8].to_vec()
        };

        let mut data = discriminator;
        let job_id_bytes = job_id.as_bytes();
        data.extend_from_slice(&(job_id_bytes.len() as u32).to_le_bytes());
        data.extend_from_slice(job_id_bytes);

        let accounts = vec![
            AccountMeta::new(job_pda, false),
            AccountMeta::new(vault_pda, false),
            AccountMeta::new(agent_pubkey, true),
            AccountMeta::new(employer, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ];

        let instruction = Instruction {
            program_id: self.program_id,
            accounts,
            data,
        };

        let recent_blockhash = self.rpc_client
            .get_latest_blockhash()
            .map_err(|e| AppError::SolanaError(format!("Failed to get blockhash: {}", e)))?;

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&agent_pubkey),
            &[&self.agent_keypair],
            recent_blockhash,
        );

        let signature = self.rpc_client
            .send_and_confirm_transaction(&tx)
            .map_err(|e| AppError::SolanaError(format!("Refund transaction failed: {}", e)))?;

        tracing::info!("cancel_job TX submitted (Refunded) | sig={} | job_id={}", signature, job_id);
        Ok(signature.to_string())
    }

}
