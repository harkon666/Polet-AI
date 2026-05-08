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

pub fn polet_policy_guardrail_graph_bytes() -> Vec<u8> {
    polet_policy_guardrail_graph()
}

pub const ENCRYPT_EXECUTE_GRAPH_DISC: u8 = 4;
pub const POLET_POLICY_GUARDRAIL_GRAPH_INPUTS: u8 = 4;

pub fn polet_policy_guardrail_execute_graph_ix_data() -> Vec<u8> {
    let graph = polet_policy_guardrail_graph_bytes();
    let graph_len = u16::try_from(graph.len()).expect("Encrypt policy graph fits u16");
    let mut ix_data = Vec::with_capacity(1 + 2 + graph.len() + 1);
    ix_data.push(ENCRYPT_EXECUTE_GRAPH_DISC);
    ix_data.extend_from_slice(&graph_len.to_le_bytes());
    ix_data.extend_from_slice(&graph);
    ix_data.push(POLET_POLICY_GUARDRAIL_GRAPH_INPUTS);
    ix_data
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

    #[test]
    fn wraps_policy_graph_for_execute_graph_cpi_payload() {
        let graph = polet_policy_guardrail_graph_bytes();
        let ix_data = polet_policy_guardrail_execute_graph_ix_data();
        let graph_len = u16::from_le_bytes([ix_data[1], ix_data[2]]) as usize;

        assert_eq!(ix_data[0], ENCRYPT_EXECUTE_GRAPH_DISC);
        assert_eq!(graph_len, graph.len());
        assert_eq!(&ix_data[3..3 + graph.len()], graph.as_slice());
        assert_eq!(
            ix_data[3 + graph.len()],
            POLET_POLICY_GUARDRAIL_GRAPH_INPUTS
        );
        assert_eq!(ix_data.len(), 1 + 2 + graph.len() + 1);
    }
}
