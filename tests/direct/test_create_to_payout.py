import importlib
import json
import pytest


def test_multi_worker_bounty_create_to_payout(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
    monkeypatch,
):
    contract = direct_deploy("contracts/clean_city.py", "0x0000000000000000000000000000000000000001")
    contract_module = importlib.import_module(contract.__class__.__module__)
    monkeypatch.setattr(
        contract_module.gl.eq_principle,
        "prompt_non_comparative",
        lambda leader_fn, **_: leader_fn(),
    )
    monkeypatch.setattr(
        contract_module.gl.nondet,
        "exec_prompt",
        lambda prompt, **_: json.dumps(
            {
                "verdict": "approved",
                "reasoning": "The cleanup and session token are visible.",
                "confidence": "high",
                "token_visible": True,
                "improvement_visible": True,
            }
        ),
    )
    reward_gen = 25
    max_workers = 2
    escrow = reward_gen * max_workers * 10**18

    direct_vm.sender = direct_alice
    direct_vm.value = reward_gen * 10**18
    with pytest.raises(AssertionError, match="Must deposit reward_gen \\* max_workers in GEN"):
        contract.create_bounty(
            "Clean the park",
            "Remove litter from the park",
            "Central Park entrance",
            "trash",
            "https://example.com/before.jpg",
            reward_gen,
            86400,
            max_workers,
        )

    direct_vm.value = escrow
    bounty_id = contract.create_bounty(
        "Clean the park",
        "Remove litter from the park",
        "Central Park entrance",
        "trash",
        "https://example.com/before.jpg",
        reward_gen,
        86400,
        max_workers,
    )
    direct_vm.value = 0

    for worker in [direct_bob, direct_charlie]:
        direct_vm.sender = worker
        contract.claim_bounty(bounty_id)
        token = contract.generate_session_token(bounty_id)
        submission_id = contract.submit_proof(
            bounty_id,
            "https://example.com/after.jpg",
            token,
            "Removed the litter.",
        )

        submission = contract.get_submission(submission_id)
        worker_address = contract.get_bounty_claimants(bounty_id)[-1]
        profile = contract.get_worker_profile(worker_address)
        assert submission.payout_sent is True, (
            submission.ai_verdict,
            submission.ai_reasoning,
        )
        assert submission.status == "approved"
        assert profile.total_earned_gen == reward_gen
        assert contract.get_worker_submission(bounty_id, worker_address) == submission_id

    bounty = contract.get_bounty(bounty_id)
    assert bounty.total_claims == max_workers
    assert bounty.total_completed == max_workers
    assert bounty.status == "completed"
    claimants = contract.get_bounty_claimants(bounty_id)
    assert len(claimants) == max_workers
    assert set(contract.get_worker_claimed_bounty_ids(claimants[0])) == {bounty_id}
    assert set(contract.get_worker_claimed_bounty_ids(claimants[1])) == {bounty_id}
