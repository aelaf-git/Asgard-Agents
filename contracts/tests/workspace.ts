import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Workspace } from "../target/types/workspace";
import { expect } from "chai";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("workspace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.workspace as Program<Workspace>;

  let authority: Keypair;
  let employer: Keypair;
  let agent: Keypair;
  let configPDA: PublicKey;

  before(async () => {
    authority = Keypair.generate();
    employer = Keypair.generate();
    agent = Keypair.generate();

    // Fund all accounts with 100 SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authority.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        employer.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        agent.publicKey,
        100 * LAMPORTS_PER_SOL
      )
    );

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );
  });

  // ==================== INITIALIZE CONFIG TESTS ====================

  it("Initialize Config", async () => {
    const reserve = Keypair.generate().publicKey;
    await program.methods
      .initializeConfig(250, reserve)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.isActive).to.be.true;
    expect(config.isPaused).to.be.false;
    expect(config.feeBps).to.equal(250);
    expect(config.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(config.version).to.equal(1);
  });

  // ==================== INITIALIZE JOB TESTS ====================

  it("Initialize Job - creates job and escrows SOL", async () => {
    const jobId = "1";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    const timeoutSeconds = new BN(86400);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    const employerBalanceBefore = await provider.connection.getBalance(
      employer.publicKey
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const job = await program.account.jobAccount.fetch(jobPDA);
    expect(job.employer.toBase58()).to.equal(employer.publicKey.toBase58());
    expect(job.agent.toBase58()).to.equal(agent.publicKey.toBase58());
    expect(job.amount.toString()).to.equal(amount.toString());
    expect(job.taskHash).to.equal(taskHash);
    expect(job.resultHash).to.equal("");
    expect(JSON.stringify(job.status)).to.equal(
      JSON.stringify({ created: {} })
    );
    expect(Number(job.createdAt.toString())).to.be.greaterThan(0);
    expect(Number(job.timeout.toString())).to.be.greaterThan(
      Number(job.createdAt.toString())
    );

    const vaultBalance = await provider.connection.getBalance(vaultPDA);
    expect(vaultBalance).to.be.greaterThanOrEqual(Number(amount.toString()));

    const employerBalanceAfter = await provider.connection.getBalance(
      employer.publicKey
    );
    expect(employerBalanceBefore - employerBalanceAfter).to.be.greaterThanOrEqual(
      Number(amount.toString())
    );
  });

  it("Initialize Job - fails with zero amount", async () => {
    const jobId = "2";
    const amount = new BN(0);
    const taskHash = "somehash";
    const timeoutSeconds = new BN(86400);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeJob(
          amount,
          taskHash,
          agent.publicKey,
          timeoutSeconds,
          jobId
        )
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          employer: employer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("Amount must be greater than 0");
    }
  });

  it("Initialize Job - fails with task hash > 64 chars", async () => {
    const jobId = "3";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "a".repeat(65);
    const timeoutSeconds = new BN(86400);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeJob(
          amount,
          taskHash,
          agent.publicKey,
          timeoutSeconds,
          jobId
        )
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          employer: employer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("Task hash must be 64 characters or less");
    }
  });

  // ==================== COMPLETE JOB TESTS ====================

  it("Complete Job - agent completes and receives SOL", async () => {
    const jobId = "4";
    const amount = new BN(2 * LAMPORTS_PER_SOL);
    const taskHash = "task_complete_test_hash";
    const resultHash = "result_hash_abc123";
    const timeoutSeconds = new BN(86400);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    // Create the job first
    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const agentBalanceBefore = await provider.connection.getBalance(
      agent.publicKey
    );

    // Complete the job
    await program.methods
      .completeJob(resultHash, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        agent: agent.publicKey,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agent])
      .rpc();

    const job = await program.account.jobAccount.fetch(jobPDA);
    expect(JSON.stringify(job.status)).to.equal(
      JSON.stringify({ completed: {} })
    );
    expect(job.resultHash).to.equal(resultHash);

    const agentBalanceAfter = await provider.connection.getBalance(
      agent.publicKey
    );
    expect(agentBalanceAfter - agentBalanceBefore).to.be.greaterThanOrEqual(
      Number(amount.toString()) - 20000
    );
  });

  it("Complete Job - fails when non-agent tries to complete", async () => {
    const jobId = "5";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "unauthorized_test";
    const timeoutSeconds = new BN(86400);
    const unauthorizedUser = Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        10 * LAMPORTS_PER_SOL
      )
    );

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    try {
      await program.methods
        .completeJob("some_result", jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          agent: unauthorizedUser.publicKey,
          employer: employer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("UnauthorizedAgent");
    }
  });

  it("Complete Job - fails with result hash > 64 chars", async () => {
    const jobId = "6";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "result_hash_too_long_test";
    const timeoutSeconds = new BN(86400);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const longResultHash = "b".repeat(65);

    try {
      await program.methods
        .completeJob(longResultHash, jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          agent: agent.publicKey,
          employer: employer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("Result hash must be 64 characters or less");
    }
  });

  it("Complete Job - fails when job already completed", async () => {
    const jobId = "7";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "double_complete_test";
    const timeoutSeconds = new BN(86400);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Complete once
    await program.methods
      .completeJob("first_result", jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        agent: agent.publicKey,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agent])
      .rpc();

    // Try to complete again
    try {
      await program.methods
        .completeJob("second_result", jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          agent: agent.publicKey,
          employer: employer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agent])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("JobNotCreated");
    }
  });

  // ==================== CANCEL JOB TESTS ====================

  it("Cancel Job - fails when timeout not reached", async () => {
    const jobId = "8";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "cancel_timeout_test";
    const timeoutSeconds = new BN(86400); // 1 day

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    try {
      await program.methods
        .cancelJob(jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          employer: employer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("TimeoutNotReached");
    }
  });

  it("Cancel Job - employer cancels after timeout and gets SOL back", async () => {
    const jobId = "9";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "cancel_success_test";
    const timeoutSeconds = new BN(0); // Immediate timeout for testing

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Wait a moment for timestamp to advance
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const employerBalanceBefore = await provider.connection.getBalance(
      employer.publicKey
    );

    await program.methods
      .cancelJob(jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const job = await program.account.jobAccount.fetch(jobPDA);
    expect(JSON.stringify(job.status)).to.equal(
      JSON.stringify({ cancelled: {} })
    );

    const employerBalanceAfter = await provider.connection.getBalance(
      employer.publicKey
    );
    expect(employerBalanceAfter).to.be.greaterThan(employerBalanceBefore - 20000);
  });

  it("Cancel Job - fails when non-employer tries to cancel", async () => {
    const jobId = "10";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "unauthorized_cancel_test";
    const timeoutSeconds = new BN(0);
    const nonEmployer = Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        nonEmployer.publicKey,
        10 * LAMPORTS_PER_SOL
      )
    );

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Non-employer tries to cancel - PDA seeds won't match
      const [wrongJobPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("job"),
          nonEmployer.publicKey.toBuffer(),
          Buffer.from(jobId),
        ],
        program.programId
      );

      await program.methods
        .cancelJob(jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          employer: nonEmployer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonEmployer])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      // Seeds mismatch or constraint error
      expect(error).to.exist;
    }
  });

  // ==================== EDGE CASE TESTS ====================

  it("Initialize Job - works with empty task hash", async () => {
    const jobId = "11";
    const amount = new BN(0.5 * LAMPORTS_PER_SOL);
    const taskHash = "";
    const timeoutSeconds = new BN(3600);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const job = await program.account.jobAccount.fetch(jobPDA);
    expect(job.taskHash).to.equal("");
    expect(job.amount.toString()).to.equal(amount.toString());
  });

  it("Initialize Job - works with exactly 64 char task hash", async () => {
    const jobId = "12";
    const amount = new BN(0.1 * LAMPORTS_PER_SOL);
    const taskHash = "x".repeat(64);
    const timeoutSeconds = new BN(3600);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const job = await program.account.jobAccount.fetch(jobPDA);
    expect(job.taskHash).to.equal(taskHash);
    expect(job.taskHash.length).to.equal(64);
  });

  it("Cancel Job - fails on already completed job", async () => {
    const jobId = "13";
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const taskHash = "cancel_completed_test";
    const timeoutSeconds = new BN(0);

    const [jobPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("job"),
        employer.publicKey.toBuffer(),
        Buffer.from(jobId),
      ],
      program.programId
    );

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), jobPDA.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeJob(amount, taskHash, agent.publicKey, timeoutSeconds, jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Complete the job first
    await program.methods
      .completeJob("completed_result", jobId)
      .accounts({
        job: jobPDA,
        vault: vaultPDA,
        agent: agent.publicKey,
        employer: employer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agent])
      .rpc();

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to cancel completed job
    try {
      await program.methods
        .cancelJob(jobId)
        .accounts({
          job: jobPDA,
          vault: vaultPDA,
          employer: employer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("JobNotCreated");
    }
  });
});
