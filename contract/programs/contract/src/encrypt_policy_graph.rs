use encrypt_dsl::prelude::encrypt_fn;
#[allow(unused_imports)]
use encrypt_types::encrypted::{EBool, EUint64};

#[encrypt_fn]
pub fn polet_policy_guardrail_graph(
    source_amount: EUint64,
    max_per_run: EUint64,
    daily_spent: EUint64,
    daily_cap: EUint64,
) -> (EBool, EUint64) {
    let within_run = max_per_run >= source_amount;
    let next_daily_spent = daily_spent + source_amount;
    let within_daily = daily_cap >= next_daily_spent;
    let allowed = within_run & within_daily;
    let updated_daily_spent = if allowed {
        next_daily_spent
    } else {
        daily_spent
    };
    (allowed, updated_daily_spent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emits_encrypt_policy_graph_bytes() {
        let graph = polet_policy_guardrail_graph();
        assert!(
            !graph.is_empty(),
            "Encrypt policy guardrail graph should compile into serialized graph bytes"
        );
    }
}
