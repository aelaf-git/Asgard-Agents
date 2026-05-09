use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("C7kCbU8cVWmt7hqBjm3fGmHah2JuexFRijb63Vf97eq9");

#[program]
pub mod workspace {
    use super::*;

    // fee_bps: u16, Platform fee in basis points, 0 = 0%
    // reserve: Pubkey, Fee collection address, 11111111111111111111111111111111
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        reserve: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.fee_bps = fee_bps;
        config.reserve = reserve;
        config.version = 1;
        Ok(())
    }

    // amount: u64, SOL amount in lamports to lock in escrow, 1000000000 = 1 SOL
    // task_hash: String, Hash of the task description (max 64 chars), abc123...
    // agent: Pubkey, AI agent pubkey that will complete the job, 9PJ8I...3555
    // timeout_seconds: i64, Seconds until cancellation is allowed, 86400 = 1 day
    // job_id: String, Unique job identifier seed, 1
    pub fn initialize_job(
        ctx: Context<InitializeJob>,
        amount: u64,
        task_hash: String,
        agent: Pubkey,
        timeout_seconds: i64,
        _job_id: String,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(task_hash.len() <= 64, ErrorCode::InvalidTaskHash);

        let clock = Clock::get()?;

        let job = &mut ctx.accounts.job;
        job.employer = ctx.accounts.employer.key();
        job.agent = agent;
        job.amount = amount;
        job.status = JobStatus::Created;
        job.task_hash = task_hash;
        job.result_hash = String::new();
        job.created_at = clock.unix_timestamp;
        job.timeout = clock.unix_timestamp
            .checked_add(timeout_seconds)
            .ok_or(ErrorCode::MathOverflow)?;
        job.bump = ctx.bumps.job;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.employer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn complete_job(
        ctx: Context<CompleteJob>,
        result_hash: String,
        _job_id: String,
    ) -> Result<()> {
        require!(result_hash.len() <= 64, ErrorCode::InvalidResultHash);

        let job = &ctx.accounts.job;
        require!(job.status == JobStatus::Created, ErrorCode::JobNotCreated);
        require!(
            ctx.accounts.agent.key() == job.agent,
            ErrorCode::UnauthorizedAgent
        );

        let job_key = ctx.accounts.job.key();
        let vault_bump = ctx.bumps.vault;
        let bump_arr = [vault_bump];
        let seeds = &[b"vault" as &[u8], job_key.as_ref(), &bump_arr];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        let vault_lamports = ctx.accounts.vault.lamports();

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.agent.to_account_info(),
                },
                signer_seeds,
            ),
            vault_lamports,
        )?;

        let job = &mut ctx.accounts.job;
        job.result_hash = result_hash;
        job.status = JobStatus::Completed;

        Ok(())
    }

    pub fn cancel_job(
        ctx: Context<CancelJob>,
        _job_id: String,
    ) -> Result<()> {
        let job = &ctx.accounts.job;
        require!(job.status == JobStatus::Created, ErrorCode::JobNotCreated);
        require!(
            ctx.accounts.employer.key() == job.employer,
            ErrorCode::UnauthorizedEmployer
        );

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp > job.timeout,
            ErrorCode::TimeoutNotReached
        );

        let job_key = ctx.accounts.job.key();
        let vault_bump = ctx.bumps.vault;
        let bump_arr = [vault_bump];
        let seeds = &[b"vault" as &[u8], job_key.as_ref(), &bump_arr];
        let signer_seeds: &[&[&[u8]]] = &[seeds];

        let vault_lamports = ctx.accounts.vault.lamports();

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.employer.to_account_info(),
                },
                signer_seeds,
            ),
            vault_lamports,
        )?;

        let job = &mut ctx.accounts.job;
        job.status = JobStatus::Cancelled;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, task_hash: String, agent: Pubkey, timeout_seconds: i64, job_id: String)]
pub struct InitializeJob<'info> {
    #[account(
        init,
        seeds = [b"job", employer.key().as_ref(), job_id.as_bytes()],
        bump,
        payer = employer,
        space = 8 + JobAccount::LEN
    )]
    pub job: Account<'info, JobAccount>,
    /// CHECK: Vault PDA that holds escrowed SOL, validated by seeds
    #[account(
        mut,
        seeds = [b"vault", job.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub employer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(result_hash: String, job_id: String)]
pub struct CompleteJob<'info> {
    #[account(
        mut,
        seeds = [b"job", job.employer.as_ref(), job_id.as_bytes()],
        bump = job.bump,
        constraint = job.status == JobStatus::Created @ ErrorCode::JobNotCreated,
        constraint = agent.key() == job.agent @ ErrorCode::UnauthorizedAgent,
    )]
    pub job: Account<'info, JobAccount>,
    /// CHECK: Vault PDA holding escrowed SOL, validated by seeds
    #[account(
        mut,
        seeds = [b"vault", job.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub agent: Signer<'info>,
    /// CHECK: Employer receives rent refund, validated against job.employer
    #[account(
        mut,
        constraint = employer.key() == job.employer @ ErrorCode::UnauthorizedEmployer,
    )]
    pub employer: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(job_id: String)]
pub struct CancelJob<'info> {
    #[account(
        mut,
        seeds = [b"job", employer.key().as_ref(), job_id.as_bytes()],
        bump = job.bump,
        constraint = job.status == JobStatus::Created @ ErrorCode::JobNotCreated,
        constraint = employer.key() == job.employer @ ErrorCode::UnauthorizedEmployer,
    )]
    pub job: Account<'info, JobAccount>,
    /// CHECK: Vault PDA holding escrowed SOL, validated by seeds
    #[account(
        mut,
        seeds = [b"vault", job.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub employer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub fee_bps: u16,
    pub reserve: Pubkey,
    pub version: u8,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 2 + 32 + 1;
}

#[account]
pub struct JobAccount {
    pub employer: Pubkey,
    pub agent: Pubkey,
    pub amount: u64,
    pub status: JobStatus,
    pub task_hash: String,
    pub result_hash: String,
    pub created_at: i64,
    pub timeout: i64,
    pub bump: u8,
}

impl JobAccount {
    pub const LEN: usize = 32 + 32 + 8 + 1 + (4 + 64) + (4 + 64) + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum JobStatus {
    Created,
    Completed,
    Cancelled,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Task hash must be 64 characters or less")]
    InvalidTaskHash,
    #[msg("Result hash must be 64 characters or less")]
    InvalidResultHash,
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Only the designated agent can complete this job")]
    UnauthorizedAgent,
    #[msg("Only the employer can cancel this job")]
    UnauthorizedEmployer,
    #[msg("Job is not in Created status")]
    JobNotCreated,
    #[msg("Cancellation timeout has not been reached")]
    TimeoutNotReached,
    #[msg("Math overflow occurred")]
    MathOverflow,
}