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
    
    # Mock AI prompt execution
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

    # Mock web.get so image fetching returns fake image bytes with status 200
    class MockResponse:
        status = 200
        body = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR..." # minimal dummy image bytes

    monkeypatch.setattr(
        contract_module.gl.nondet.web,
        "get",
        lambda url: MockResponse(),
    )

    reward_gen = 25
    max_workers = 2
    escrow = reward_gen * max_workers * 10**18

    # Test wrong deposit amount value error
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

    # Create valid bounty with full escrow
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

    # Multi-worker claims and submissions workflow
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

        # Retrieve submission via contract view or direct storage mapping
        submission = contract.get_submission(submission_id) if hasattr(contract, "get_submission") else contract.submissions[submission_id]
        
        # Use dot notation for dataclass attributes
        assert submission.payout_sent is True
        assert submission.status == "approved"

    bounty = contract.get_bounty(bounty_id)
    assert bounty.total_claims == max_workers
    assert bounty.total_completed == max_workers
    assert bounty.status == "completed"