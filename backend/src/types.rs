use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq)]
pub enum SubscriptionField {
    AutoRenew, // 0
    Active,    // 1
    Tier,      // 2
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, PartialEq)]
pub enum UpdateValue {
    Bool(bool),     // 0
    U64(u64),       // 1
    String(String), // 2
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Plan {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub receiver: Pubkey,
    pub name: String,
    pub token_symbol: String,
    pub token_image: String,
    pub tiers: Vec<u8>, // compressed bytes
    pub bump: u8,
}
