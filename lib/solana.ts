import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

// Server-side signing only — no wallet UI anywhere in the app.

const DEVNET = "https://api.devnet.solana.com";
const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export async function anchorOnDevnet(hash: string): Promise<string> {
  const secret = process.env.SOLANA_SECRET_KEY;
  if (!secret) throw new Error("SOLANA_SECRET_KEY is not set");
  const keypair = Keypair.fromSecretKey(bs58.decode(secret));
  const connection = new Connection(DEVNET, "confirmed");

  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM,
      data: Buffer.from("ESGPROOF|v1|" + hash),
    })
  );
  return sendAndConfirmTransaction(connection, tx, [keypair]);
}
