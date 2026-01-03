use crate::models::subscription::Tier;
use anyhow::{Result, anyhow};
use flate2::read::ZlibDecoder;
use std::io::Read;

pub fn parse_tiers(tiers: &[u8]) -> Result<Vec<Tier>> {
    // 1️⃣ bytes → string
    let tiers_str =
        std::str::from_utf8(tiers).map_err(|e| anyhow!("Invalid UTF-8 in tiers: {}", e))?;

    // 2️⃣ string → JSON → Vec<Tier>
    let parsed: Vec<Tier> = serde_json::from_str(tiers_str)
        .map_err(|e| anyhow!("Failed to parse tiers JSON: {}", e))?;

    Ok(parsed)
}

pub fn find_tier_by_name<'a>(tiers: &'a [Tier], tier_name: &str) -> Result<&'a Tier> {
    tiers
        .iter()
        .find(|t| t.tier_name == tier_name)
        .ok_or_else(|| anyhow!("Tier '{}' not found in plan", tier_name))
}

pub fn decompress_tiers(data: &[u8]) -> anyhow::Result<Vec<u8>> {
    let mut decoder = ZlibDecoder::new(data);
    let mut out = Vec::new();
    decoder.read_to_end(&mut out)?;
    Ok(out)
}
