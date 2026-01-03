use crate::types::{Plan, SubscriptionField, UpdateValue};
use crate::utils::decompress_tiers;
use anchor_lang::prelude::*;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::signature::Signature;
use solana_sdk::{
    hash::hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer, read_keypair_file},
    transaction::Transaction,
};
use std::str::FromStr;
use tracing::{error, info};

pub struct SolanaClient {
    pub rpc: RpcClient,
    pub payer: Keypair,
    pub program_id: Pubkey, // The Anchor Program ID
}

impl SolanaClient {
    // Constructor
    pub async fn new(rpc_url: &str, keypair_path: &str, program_id: &str) -> Self {
        // NOTE: The `read_keypair_file` takes care of the "~" expansion for the path
        let payer =
            read_keypair_file(keypair_path).expect("❌ Failed to read keypair file for Payer");
        let program_id = Pubkey::from_str(program_id).expect("❌ Invalid program ID");
        let rpc = RpcClient::new(rpc_url.to_string());

        Self {
            rpc,
            payer,
            program_id,
        }
    }

    pub async fn execute_subscription_payment(
        &self,
        subscription: Pubkey,
        plan: Pubkey,
        user_token_account: Pubkey,
        receiver_token_account: Pubkey,
        mint: Pubkey,
        token_program: Pubkey,
        new_amount: u64,
        new_period_seconds: i64,
    ) -> anyhow::Result<Signature> {
        info!("🔁 Executing subscription payment on-chain");

        // ---------- 1️⃣ Build instruction data ----------
        let discriminator = &hash(b"global:execute_payment").to_bytes()[..8];

        let mut data = Vec::with_capacity(8 + 8 + 8);
        data.extend_from_slice(discriminator);
        data.extend_from_slice(&new_amount.to_le_bytes());
        data.extend_from_slice(&new_period_seconds.to_le_bytes());

        let ix = Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(subscription, false),
                AccountMeta::new_readonly(plan, false),
                AccountMeta::new(user_token_account, false),
                AccountMeta::new(receiver_token_account, false),
                AccountMeta::new_readonly(mint, false),
                AccountMeta::new_readonly(system_program::ID, false),
                AccountMeta::new_readonly(token_program, false),
            ],
            data,
        };

        // ---------- 2️⃣ Get blockhash ----------
        let blockhash = match self.rpc.get_latest_blockhash().await {
            Ok(bh) => bh,
            Err(e) => {
                error!("❌ Failed to fetch latest blockhash: {}", e);
                return Err(e.into());
            }
        };

        // ---------- 3️⃣ Build transaction ----------
        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&self.payer.pubkey()),
            &[&self.payer],
            blockhash,
        );

        // ---------- 4️⃣ Send transaction ----------
        let sig = match self.rpc.send_and_confirm_transaction(&tx).await {
            Ok(sig) => sig,
            Err(e) => {
                error!("❌ execute_payment transaction failed: {}", e);
                return Err(e.into());
            }
        };

        info!("✅ execute_payment success: {}", sig);
        Ok(sig)
    }

    pub async fn get_plan(&self, plan_pda: Pubkey) -> anyhow::Result<Option<Plan>> {
        // 1️⃣ Fetch raw account
        let account = match self.rpc.get_account(&plan_pda).await {
            Ok(acc) => acc,
            Err(err) => {
                // same behavior as JS: account does not exist → return null
                if err.to_string().contains("AccountNotFound") {
                    return Ok(None);
                }
                return Err(err.into());
            }
        };

        let data: &[u8] = &account.data;

        // CHECK: Ensure data is long enough for discriminator (8 bytes)
        if data.len() < 8 {
            return Err(anyhow::anyhow!("Account data too small"));
        }

        // FIX: Skip the first 8 bytes (Discriminator) and use standard deserialize
        let mut data_slice = &data[8..];
        let mut plan = Plan::deserialize(&mut data_slice)?;

        // 3️⃣ Decompress tiers (pako-compatible)
        plan.tiers = decompress_tiers(&plan.tiers)?;

        // 4️⃣ Return same shape as JS
        Ok(Some(plan))
    }

    pub async fn update_subscription_status(
        &self,
        subscription_pda: Pubkey,
        field: SubscriptionField,
        value: UpdateValue,
    ) -> anyhow::Result<Signature> {
        info!("📝 Updating subscription status on-chain");

        let discriminator = &hash(b"global:update_subscription_status").to_bytes()[..8];

        let mut data = Vec::with_capacity(100);
        data.extend_from_slice(discriminator);

        field.serialize(&mut data)?;
        value.serialize(&mut data)?;

        let accounts = vec![
            AccountMeta::new(self.payer.pubkey(), true), // Payer must sign
            AccountMeta::new(subscription_pda, false),   // Subscription is mutable
        ];

        let ix = Instruction {
            program_id: self.program_id,
            accounts,
            data,
        };

        // ---------- 3️⃣ Get blockhash ----------
        let blockhash = match self.rpc.get_latest_blockhash().await {
            Ok(bh) => bh,
            Err(e) => {
                error!("❌ Failed to fetch latest blockhash: {}", e);
                return Err(e.into());
            }
        };

        // ---------- 4️⃣ Build transaction ----------
        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&self.payer.pubkey()),
            &[&self.payer],
            blockhash,
        );

        // ---------- 5️⃣ Send transaction ----------
        let sig = match self.rpc.send_and_confirm_transaction(&tx).await {
            Ok(sig) => sig,
            Err(e) => {
                error!("❌ update_subscription_status failed: {}", e);
                return Err(e.into());
            }
        };

        info!("✅ update_subscription_status success: {}", sig);
        Ok(sig)
    }
}
