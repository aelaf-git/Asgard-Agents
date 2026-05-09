import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { AigentEscrowSDK } from '@/lib/aigentEscrow';

/**
 * Custom hook to interact with the AIGENT Escrow program.
 * 
 * Provides the SDK instance when wallet is connected,
 * with methods for initializeJob, completeJob, cancelJob,
 * and account fetchers.
 */
export function useSolanaProgram() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  const provider = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;

    return new AnchorProvider(
      connection,
      { publicKey, signTransaction, signAllTransactions } as any,
      { commitment: 'confirmed' }
    );
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  const sdk = useMemo(() => {
    if (!provider) return null;
    return new AigentEscrowSDK(provider);
  }, [provider]);

  return {
    sdk,
    publicKey,
    connected: !!publicKey,
    programId: sdk?.getProgramId() ?? null,
  };
}
