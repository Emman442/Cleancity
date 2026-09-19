# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone
import json


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass


@allow_storage
@dataclass
class Bounty:
    bounty_id: str
    creator: str
    title: str
    description: str
    location_description: str   # human readable e.g. "Corner of Allen Ave and Awolowo Rd"
    category: str               # "trash" | "graffiti" | "pothole" | "drainage" | "other"
    before_image_url: str
    reward_gen: i32             # amount EACH worker earns on a verified completion
    deadline: i64
    status: str                 # "open" | "claimed" | "completed" | "expired" | "cancelled"
    created_at: str
    max_workers: i32            # max number of workers who can each earn reward_gen
    total_claims: i32           # how many wallets have claimed a slot
    total_completed: i32        # how many wallets have been paid out


@allow_storage
@dataclass
class Submission:
    submission_id: str
    bounty_id: str
    worker: str
    after_image_url: str
    session_token: str          # unique token shown in the photo to prevent stock images
    notes: str
    status: str                 # "approved" | "rejected" | "pending" | "appealed"
    ai_verdict: str             # "approved" | "rejected" | "inconclusive"
    ai_reasoning: str
    ai_confidence: str          # "high" | "medium" | "low"
    submitted_at: str
    reviewed_at: str
    payout_sent: bool


@allow_storage
@dataclass
class WorkerProfile:
    wallet: str
    total_submissions: i32
    total_approved: i32
    total_rejected: i32
    total_earned_gen: i32
    reputation_score: i32
    first_seen_at: str


@allow_storage
@dataclass
class Appeal:
    appeal_id: str
    submission_id: str
    bounty_id: str
    worker: str
    appeal_context: str
    additional_image_url: str
    ai_verdict: str
    ai_reasoning: str
    status: str                 # "pending" | "upheld" | "rejected"
    submitted_at: str
    resolved_at: str


class CleanCity(gl.Contract):

    bounties: TreeMap[str, Bounty]
    bounty_ids: DynArray[str]
    bounty_counter: i32

    submission_ids: DynArray[str]
    submissions: TreeMap[str, Submission]
    submission_counter: i32

    appeals: TreeMap[str, Appeal]
    appeal_counter: i32

    workers: TreeMap[str, WorkerProfile]
    worker_ids: DynArray[str]

    # key: "{bounty_id}|{wallet}" -> True if that wallet holds a claimed slot
    bounty_claims: TreeMap[str, bool]

    # key: "{bounty_id}|{wallet}" -> submission_id for that wallet's submission on that bounty
    bounty_submissions: TreeMap[str, str]

    # key: bounty_id -> comma separated list of wallets that have claimed a slot
    bounty_claimants_csv: TreeMap[str, str]

    session_tokens: TreeMap[str, str]
    session_counter: i32

    admin: str

    def __init__(self, admin_address: str):
        self.admin = admin_address
        self.bounty_counter = i32(0)
        self.submission_counter = i32(0)
        self.appeal_counter = i32(0)
        self.session_counter = i32(0)

    # ---------------------------------------------------------------------
    # internal helpers
    # ---------------------------------------------------------------------

    def _only_admin(self) -> None:
        assert str(gl.message.sender_address) == self.admin, "Only admin"

    def _claim_key(self, bounty_id: str, wallet: str) -> str:
        return bounty_id + "|" + wallet

    def _normalize_verdict(self, v: str, valid: list) -> str:
        v = v.strip().lower()
        synonyms = {
            "reject": "rejected",
            "rejected": "rejected",
            "approve": "approved",
            "approved": "approved",
            "inconclusive": "inconclusive",
            "unclear": "inconclusive"
        }
        normalized = synonyms.get(v, "inconclusive")
        return normalized if normalized in valid else "inconclusive"

    def _ensure_worker(self, wallet: str) -> None:
        exists = False
        try:
            exists = wallet in self.workers
        except IndexError:
            exists = False

        if not exists:
            new_profile = WorkerProfile(
                wallet=wallet,
                total_submissions=i32(0),
                total_approved=i32(0),
                total_rejected=i32(0),
                total_earned_gen=i32(0),
                reputation_score=i32(50),
                first_seen_at=gl.message_raw["datetime"]
            )
            self.workers[wallet] = new_profile
            self.worker_ids.append(wallet)

    def _add_claimant(self, bounty_id: str, wallet: str) -> None:
        existing = ""
        try:
            existing = self.bounty_claimants_csv[bounty_id]
        except Exception:
            existing = ""
        if existing == "":
            self.bounty_claimants_csv[bounty_id] = wallet
        else:
            self.bounty_claimants_csv[bounty_id] = existing + "," + wallet

    def _recompute_status(self, bounty_id: str) -> None:
        """
        Single source of truth for bounty status. Call this after any claim,
        payout, or expiry mutation instead of setting status inline.
        """
        b = self.bounties[bounty_id]

        if b.status in ["cancelled", "expired"]:
            return

        if int(b.total_completed) >= int(b.max_workers):
            self.bounties[bounty_id].status = "completed"
        elif int(b.total_claims) >= int(b.max_workers):
            self.bounties[bounty_id].status = "claimed"
        else:
            self.bounties[bounty_id].status = "open"

    # ---------------------------------------------------------------------
    # bounty lifecycle
    # ---------------------------------------------------------------------

    @gl.public.write.payable
    def create_bounty(
        self,
        title: str,
        description: str,
        location_description: str,
        category: str,
        before_image_url: str,
        reward_gen: i32,
        duration_seconds: i64,
        max_workers: i32
    ) -> str:
        """
        Anyone can create a bounty. reward_gen is the amount EACH worker earns
        on a verified completion, so total escrow required is
        reward_gen * max_workers, locked until workers complete the job.
        """
        creator = str(gl.message.sender_address)

        assert len(title) >= 5, "Title too short"
        assert len(location_description) >= 5, "Location description required"
        assert category in [
            "trash", "graffiti", "pothole", "drainage",
            "vandalism", "flooding", "lighting", "other"
        ], "Invalid category"
        assert len(before_image_url) > 0, "Before image URL required"
        assert before_image_url.startswith("http"), "Invalid before image URL"
        assert int(reward_gen) > 0, "Reward must be greater than 0"
        assert int(duration_seconds) >= 3600, "Duration must be at least 1 hour"
        assert int(max_workers) >= 1, "Must allow at least 1 worker"

        expected_wei = u256(reward_gen) * u256(max_workers) * u256(10**18)
        assert gl.message.value == expected_wei, \
            "Must deposit reward_gen * max_workers in GEN"

        self.bounty_counter += i32(1)
        bounty_id = f"bounty_{self.bounty_counter}"

        now = int(datetime.now(timezone.utc).timestamp() * 1000)

        self.bounties[bounty_id] = Bounty(
            bounty_id=bounty_id,
            creator=creator,
            title=title,
            description=description,
            location_description=location_description,
            category=category,
            before_image_url=before_image_url,
            reward_gen=reward_gen,
            deadline=i64(now + int(duration_seconds) * 1000),
            status="open",
            created_at=gl.message_raw["datetime"],
            max_workers=max_workers,
            total_claims=i32(0),
            total_completed=i32(0)
        )

        self.bounty_ids.append(bounty_id)
        self.bounty_claimants_csv[bounty_id] = ""
        return bounty_id

    @gl.public.write
    def cancel_bounty(self, bounty_id: str) -> None:
        """
        Only cancellable while nobody has claimed a slot yet, so a worker who
        already started can never have the escrow pulled out from under them.
        """
        creator = str(gl.message.sender_address)
        assert bounty_id in self.bounties, "Bounty not found"
        b = self.bounties[bounty_id]
        assert b.creator == creator or str(gl.message.sender_address) == self.admin, \
            "Only creator or admin can cancel"
        assert b.status == "open", "Can only cancel open bounties"
        assert int(b.total_claims) == 0, "Cannot cancel once a worker has claimed a slot"

        self.bounties[bounty_id].status = "cancelled"

        refund = u256(b.reward_gen) * u256(b.max_workers) * u256(10**18)
        _Recipient(Address(creator)).emit_transfer(value=refund)

    @gl.public.write
    def expire_bounty(self, bounty_id: str) -> None:
        """
        Anyone can call this after the deadline. Refunds only the slots that
        were never paid out, since some workers may have already been paid.
        """
        assert bounty_id in self.bounties, "Bounty not found"
        b = self.bounties[bounty_id]
        assert b.status in ["open", "claimed"], "Bounty not expirable"

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        assert now >= int(b.deadline), "Bounty has not expired yet"

        remaining_slots = int(b.max_workers) - int(b.total_completed)
        self.bounties[bounty_id].status = "expired"

        if remaining_slots > 0:
            refund = u256(b.reward_gen) * u256(remaining_slots) * u256(10**18)
            _Recipient(Address(b.creator)).emit_transfer(value=refund)

    # ---------------------------------------------------------------------
    # claiming and session tokens
    # ---------------------------------------------------------------------

    @gl.public.write
    def claim_bounty(self, bounty_id: str) -> None:
        """
        Worker claims one of the max_workers slots on a bounty before going
        to work. Each distinct wallet can claim at most one slot.
        """
        worker = str(gl.message.sender_address)
        self._ensure_worker(worker)

        assert bounty_id in self.bounties, "Bounty not found"
        b = self.bounties[bounty_id]
        assert b.status == "open", "Bounty not available for new claims"

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        assert now < int(b.deadline), "Bounty has expired"

        claim_key = self._claim_key(bounty_id, worker)
        assert claim_key not in self.bounty_claims, "Already claimed this bounty"
        assert int(b.total_claims) < int(b.max_workers), "All worker slots are claimed"

        self.bounty_claims[claim_key] = True
        self.bounties[bounty_id].total_claims += i32(1)
        self._add_claimant(bounty_id, worker)
        self._recompute_status(bounty_id)

    @gl.public.write
    def generate_session_token(self, bounty_id: str) -> str:
        worker = str(gl.message.sender_address)
        assert bounty_id in self.bounties, "Bounty not found"
        b = self.bounties[bounty_id]

        claim_key = self._claim_key(bounty_id, worker)
        assert claim_key in self.bounty_claims, "Claim this bounty first"
        assert b.status in ["open", "claimed"], "Bounty not available"

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        assert now < int(b.deadline), "Bounty has expired"

        self.session_counter += i32(1)
        session_id = f"session_{self.session_counter}"

        import hashlib
        raw = f"{session_id}{worker}{bounty_id}{now}"
        token = hashlib.sha256(raw.encode()).hexdigest()[:8].upper()

        token_key = f"{bounty_id}|{worker}"
        self.session_tokens[token_key] = token

        return token

    # ---------------------------------------------------------------------
    # submission + AI verification
    # ---------------------------------------------------------------------

    @gl.public.write
    def submit_proof(
        self,
        bounty_id: str,
        after_image_url: str,
        session_token: str,
        notes: str
    ) -> str:
        worker = str(gl.message.sender_address)
        self._ensure_worker(worker)

        assert bounty_id in self.bounties, "Bounty not found"
        b = self.bounties[bounty_id]

        claim_key = self._claim_key(bounty_id, worker)
        assert claim_key in self.bounty_claims, "Must claim this bounty before submitting proof"

        assert b.status not in ["cancelled", "expired"], "Bounty is no longer active"
        assert int(b.total_completed) < int(b.max_workers), "All worker slots already paid out"

        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        assert now < int(b.deadline), "Bounty deadline has passed"

        assert len(after_image_url) > 0, "After image URL required"
        assert after_image_url.startswith("http"), "Invalid after image URL"
        assert len(session_token) > 0, "Session token required"
        assert len(notes) <= 500, "Notes too long"

        sub_key = self._claim_key(bounty_id, worker)
        assert sub_key not in self.bounty_submissions, "Already submitted for this bounty"

        token_key = f"{bounty_id}|{worker}"
        assert token_key in self.session_tokens, "No session token found — call generate_session_token first"

        stored_token = self.session_tokens[token_key]
        assert session_token == stored_token, \
            "Session token does not match — use the token from generate_session_token"

        before_url = b.before_image_url
        after_url = after_image_url
        category = b.category
        task_title = b.title
        task_description = b.description
        location = b.location_description
        token = session_token
        worker_notes = notes

        def verify_completion() -> str:
            prompt = f"""You are verifying a public infrastructure cleanup task by visually comparing two photos.

Task: {category} — {task_title}
Description: {task_description}
Location: {location}
Worker notes: "{worker_notes}"

Image 1 is the BEFORE photo showing the original problem.
Image 2 is the AFTER photo submitted as proof of completion.

Session token that must be visibly written or shown in the AFTER photo: {token}

Look directly at both images and evaluate:
1. Does the AFTER photo show the same location as the BEFORE photo, with the {category} issue visibly resolved?
2. Is the session token {token} actually visible somewhere in the AFTER photo?
3. Is there clear visual evidence of completed work, separate from anything claimed in the notes?

Do not approve based on the notes alone. If the token is not visibly present, or the issue does not look resolved in the photo itself, reject or mark inconclusive even if the notes sound convincing.

Return ONLY valid JSON:
{{"verdict":"approved","reasoning":"one sentence","confidence":"high","token_visible":true,"improvement_visible":true}}

verdict must be exactly one of: approved, rejected, inconclusive
confidence must be exactly one of: high, medium, low
"""
            try:
                result = gl.nondet.exec_prompt(prompt, images=[before_url, after_url]).strip()
            except Exception:
                return json.dumps({
                    "verdict": "inconclusive",
                    "reasoning": "Could not load one or both images for visual verification",
                    "confidence": "low",
                    "token_visible": False,
                    "improvement_visible": False
                }, sort_keys=True, separators=(',', ':'))

            cleaned = result.replace("```json", "").replace("```", "").strip()

            try:
                parsed = json.loads(cleaned)

                raw_verdict = str(parsed.get("verdict", "inconclusive")).lower().strip()
                if raw_verdict in ["approve", "approved", "yes", "valid", "complete", "completed"]:
                    verdict = "approved"
                elif raw_verdict in ["reject", "rejected", "no", "invalid", "incomplete", "fail", "failed"]:
                    verdict = "rejected"
                else:
                    verdict = "inconclusive"

                token_visible = bool(parsed.get("token_visible", False))
                improvement_visible = bool(parsed.get("improvement_visible", False))

                # An "approved" verdict only stands if the model's own visual
                # checks actually back it up. This is what stops the verifier
                # from rubber-stamping notes/metadata alone.
                if verdict == "approved" and not (token_visible and improvement_visible):
                    verdict = "inconclusive"

                raw_conf = str(parsed.get("confidence", "medium")).lower().strip()
                if raw_conf not in ["high", "medium", "low"]:
                    raw_conf = "medium"

                return json.dumps({
                    "verdict": verdict,
                    "reasoning": str(parsed.get("reasoning", ""))[:300],
                    "confidence": raw_conf,
                    "token_visible": token_visible,
                    "improvement_visible": improvement_visible
                }, sort_keys=True, separators=(',', ':'))

            except Exception:
                return json.dumps({
                    "verdict": "inconclusive",
                    "reasoning": "Response could not be parsed as valid JSON",
                    "confidence": "low",
                    "token_visible": False,
                    "improvement_visible": False
                }, sort_keys=True, separators=(',', ':'))

        raw = gl.eq_principle.prompt_non_comparative(
            verify_completion,
            task="Verify whether a public infrastructure cleanup task has been completed by visually comparing before and after photos",
            criteria="Return valid JSON with verdict (approved/rejected/inconclusive), reasoning, confidence, token_visible, improvement_visible. Only approve if the images themselves show the token and the resolved issue, not just the worker's notes."
        )

        try:
            cleaned_raw = raw.strip()
            if cleaned_raw.startswith('"') and cleaned_raw.endswith('"'):
                cleaned_raw = cleaned_raw[1:-1]
            cleaned_raw = cleaned_raw.replace('\\"', '"').replace('\\n', ' ')
            cleaned_raw = cleaned_raw.replace("```json", "").replace("```", "").strip()

            data = json.loads(cleaned_raw)
            verdict = str(data.get("verdict", "inconclusive")).lower().strip()
            if verdict not in ["approved", "rejected", "inconclusive"]:
                if any(w in verdict for w in ["approv", "complet"]):
                    verdict = "approved"
                elif any(w in verdict for w in ["reject", "fail"]):
                    verdict = "rejected"
                else:
                    verdict = "inconclusive"

            reasoning = data.get("reasoning", "")
            confidence = str(data.get("confidence", "medium")).lower()
            if confidence not in ["high", "medium", "low"]:
                confidence = "medium"

        except Exception:
            verdict = "inconclusive"
            reasoning = "Consensus evaluation could not be parsed"
            confidence = "low"

        b = self.bounties[bounty_id]

        self.submission_counter += i32(1)
        submission_id = f"sub_{self.submission_counter}"

        status = "approved" if verdict == "approved" else \
                 "rejected" if verdict == "rejected" else "pending"

        self.submissions[submission_id] = Submission(
            submission_id=submission_id,
            bounty_id=bounty_id,
            worker=worker,
            after_image_url=after_image_url,
            session_token=session_token,
            notes=notes,
            status=status,
            ai_verdict=verdict,
            ai_reasoning=reasoning,
            ai_confidence=confidence,
            submitted_at=gl.message_raw["datetime"],
            reviewed_at=gl.message_raw["datetime"],
            payout_sent=False
        )

        self.bounty_submissions[sub_key] = submission_id
        self.workers[worker].total_submissions += i32(1)
        self.submission_ids.append(submission_id)

        if verdict == "approved":
            assert int(b.total_completed) < int(b.max_workers), \
                "All worker slots already paid out"

            self.submissions[submission_id].payout_sent = True
            self.bounties[bounty_id].total_completed += i32(1)
            self.workers[worker].total_approved += i32(1)
            self.workers[worker].total_earned_gen += b.reward_gen
            self.workers[worker].reputation_score += i32(10)

            payout = u256(b.reward_gen) * u256(10**18)
            _Recipient(Address(worker)).emit_transfer(value=payout)

        elif verdict == "rejected":
            self.workers[worker].total_rejected += i32(1)
            if int(self.workers[worker].reputation_score) > 5:
                self.workers[worker].reputation_score -= i32(5)

        self._recompute_status(bounty_id)
        return submission_id

    # ---------------------------------------------------------------------
    # appeals
    # ---------------------------------------------------------------------

    @gl.public.write
    def appeal_rejection(
        self,
        submission_id: str,
        appeal_context: str,
        additional_image_url: str
    ) -> str:
        """
        Worker can appeal a rejected or inconclusive verdict once, with
        additional context and an optional extra image.
        """
        worker = str(gl.message.sender_address)
        assert submission_id in self.submissions, "Submission not found"
        sub = self.submissions[submission_id]

        assert sub.worker == worker, "Not your submission"
        assert sub.ai_verdict in ["rejected", "inconclusive"], \
            "Can only appeal rejected or inconclusive submissions"
        assert sub.status in ["rejected", "pending"], \
            "Submission not eligible for appeal"
        assert not sub.payout_sent, "Payout already sent for this submission"

        bounty_id = sub.bounty_id
        assert bounty_id in self.bounties, "Bounty not found"
        b = self.bounties[bounty_id]

        assert b.status not in ["cancelled", "expired"], "Bounty is no longer active"
        assert int(b.total_completed) < int(b.max_workers), "All worker slots already paid out"

        before_url = b.before_image_url
        after_url = sub.after_image_url
        extra_url = additional_image_url
        category = b.category
        task_title = b.title
        location = b.location_description
        original_reasoning = sub.ai_reasoning
        context = appeal_context
        token = sub.session_token

        self.submissions[submission_id].status = "appealed"

        def evaluate_appeal() -> str:
            images = [before_url, after_url]
            has_extra = bool(extra_url) and extra_url.startswith("http")
            if has_extra:
                images.append(extra_url)

            prompt = f"""You are reviewing an appeal of a rejected or inconclusive infrastructure task submission.

Task Category: {category}
Task Title: "{task_title}"
Location: {location}

You are given images in this order.
Image 1 is the BEFORE image.
Image 2 is the original AFTER image that was rejected or marked inconclusive.
{"Image 3 is an ADDITIONAL image provided as new evidence for this appeal." if has_extra else "No additional evidence image was provided."}

Original evaluation reasoning: {original_reasoning}

Worker's appeal context:
"{context}"

Session token that should be visible: {token}

Re-evaluate this submission with fresh eyes, looking directly at the images, considering:
1. The worker's appeal explanation
2. Any additional evidence provided
3. Whether the original evaluation was too strict or the images were unclear the first time

Only approve if the images themselves show genuine evidence of task completion and the session token.

Return ONLY valid JSON:
{{
"verdict": "approved" | "rejected",
"reasoning": "2-3 sentences explaining your appeal decision",
"confidence": "high" | "medium" | "low"
}}
"""
            try:
                result = gl.nondet.exec_prompt(prompt, images=images).strip()
            except Exception:
                return json.dumps({
                    "verdict": "rejected",
                    "reasoning": "Could not load images for appeal review",
                    "confidence": "low"
                }, sort_keys=True, separators=(',', ':'))

            cleaned = result.replace("```json", "").replace("```", "").strip()
            try:
                parsed = json.loads(cleaned)
                verdict = self._normalize_verdict(parsed.get("verdict", "rejected"), ["approved", "rejected"])
                return json.dumps({
                    "verdict": verdict,
                    "reasoning": str(parsed.get("reasoning", "")),
                    "confidence": str(parsed.get("confidence", "medium"))
                }, sort_keys=True, separators=(',', ':'))
            except Exception:
                return json.dumps({
                    "verdict": "rejected",
                    "reasoning": "Could not evaluate appeal",
                    "confidence": "low"
                }, sort_keys=True, separators=(',', ':'))

        raw = gl.eq_principle.prompt_non_comparative(
            evaluate_appeal,
            task="Review an appeal of a rejected or inconclusive infrastructure task submission by visually comparing images",
            criteria="Approve only if the images themselves show genuine evidence of task completion and the session token. Reject if the task is clearly not completed."
        )

        try:
            data = json.loads(raw.strip().strip('"').replace('\\"', '"'))
            verdict = self._normalize_verdict(data.get("verdict", "rejected"), ["approved", "rejected"])
            reasoning = data.get("reasoning", "")
            confidence = data.get("confidence", "medium")
        except Exception:
            verdict = "rejected"
            reasoning = "Appeal evaluation could not be parsed"
            confidence = "low"

        self.appeal_counter += i32(1)
        appeal_id = f"appeal_{self.appeal_counter}"

        self.appeals[appeal_id] = Appeal(
            appeal_id=appeal_id,
            submission_id=submission_id,
            bounty_id=bounty_id,
            worker=worker,
            appeal_context=appeal_context,
            additional_image_url=additional_image_url,
            ai_verdict=verdict,
            ai_reasoning=reasoning,
            status="upheld" if verdict == "approved" else "rejected",
            submitted_at=gl.message_raw["datetime"],
            resolved_at=gl.message_raw["datetime"]
        )

        self.submissions[submission_id].ai_verdict = verdict
        self.submissions[submission_id].ai_reasoning = reasoning
        self.submissions[submission_id].status = "approved" if verdict == "approved" else "rejected"

        if verdict == "approved":
            assert int(b.total_completed) < int(b.max_workers), \
                "All worker slots already paid out"

            self.submissions[submission_id].payout_sent = True
            self.bounties[bounty_id].total_completed += i32(1)
            self.workers[worker].total_approved += i32(1)
            self.workers[worker].total_earned_gen += b.reward_gen
            self.workers[worker].reputation_score += i32(5)

            payout = u256(b.reward_gen) * u256(10**18)
            _Recipient(Address(worker)).emit_transfer(value=payout)

        self._recompute_status(bounty_id)
        return appeal_id

    # ---------------------------------------------------------------------
    # admin override
    # ---------------------------------------------------------------------

    @gl.public.write
    def admin_approve_submission(
        self,
        submission_id: str,
        reason: str
    ) -> None:
        self._only_admin()
        assert submission_id in self.submissions, "Submission not found"
        sub = self.submissions[submission_id]
        assert not sub.payout_sent, "Already paid out"

        bounty_id = sub.bounty_id
        b = self.bounties[bounty_id]
        worker = sub.worker

        assert int(b.total_completed) < int(b.max_workers), \
            "All worker slots already paid out"

        self.submissions[submission_id].status = "approved"
        self.submissions[submission_id].ai_reasoning = f"Admin approved: {reason}"
        self.submissions[submission_id].payout_sent = True

        self.bounties[bounty_id].total_completed += i32(1)
        self.workers[worker].total_approved += i32(1)
        self.workers[worker].total_earned_gen += b.reward_gen

        payout = u256(b.reward_gen) * u256(10**18)
        _Recipient(Address(worker)).emit_transfer(value=payout)

        self._recompute_status(bounty_id)

    # ---------------------------------------------------------------------
    # views
    # ---------------------------------------------------------------------

    @gl.public.view
    def get_bounty(self, bounty_id: str) -> Bounty:
        assert bounty_id in self.bounties, "Bounty not found"
        return gl.storage.copy_to_memory(self.bounties[bounty_id])

    @gl.public.view
    def get_all_bounties(self) -> list[Bounty]:
        result = []
        for bid in self.bounty_ids:
            result.append(gl.storage.copy_to_memory(self.bounties[bid]))
        return result

    @gl.public.view
    def get_open_bounties(self) -> list[Bounty]:
        result = []
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        for bid in self.bounty_ids:
            b = self.bounties[bid]
            if b.status == "open" and now < int(b.deadline):
                result.append(gl.storage.copy_to_memory(b))
        return result

    @gl.public.view
    def get_bounties_by_category(self, category: str) -> list[Bounty]:
        result = []
        for bid in self.bounty_ids:
            b = self.bounties[bid]
            if b.category == category:
                result.append(gl.storage.copy_to_memory(b))
        return result

    @gl.public.view
    def get_bounty_claimants(self, bounty_id: str) -> list[str]:
        assert bounty_id in self.bounty_claimants_csv, "Bounty not found"
        csv = self.bounty_claimants_csv[bounty_id]
        if csv == "":
            return []
        return csv.split(",")

    @gl.public.view
    def get_submission(self, submission_id: str) -> Submission:
        assert submission_id in self.submissions, "Submission not found"
        return gl.storage.copy_to_memory(self.submissions[submission_id])

    @gl.public.view
    def get_worker_submission(self, bounty_id: str, wallet: str) -> str:
        key = self._claim_key(bounty_id, wallet)
        if key in self.bounty_submissions:
            return self.bounty_submissions[key]
        return ""

    @gl.public.view
    def get_worker_profile(self, wallet: str) -> WorkerProfile:
        assert wallet in self.workers, "Worker not found"
        return gl.storage.copy_to_memory(self.workers[wallet])

    @gl.public.view
    def worker_exists(self, wallet: str) -> bool:
        return wallet in self.workers

    @gl.public.view
    def get_appeal(self, appeal_id: str) -> Appeal:
        assert appeal_id in self.appeals, "Appeal not found"
        return gl.storage.copy_to_memory(self.appeals[appeal_id])

    @gl.public.view
    def has_claimed(self, bounty_id: str, wallet: str) -> bool:
        return self._claim_key(bounty_id, wallet) in self.bounty_claims

    @gl.public.view
    def get_total_bounties(self) -> i32:
        return self.bounty_counter

    @gl.public.view
    def get_total_submissions(self) -> i32:
        return self.submission_counter

    @gl.public.view
    def get_leaderboard(self) -> list[WorkerProfile]:
        """
        Returns all worker profiles.
        Frontend should sort by reputation_score / total_earned_gen.
        """
        result = []
        for wallet in self.worker_ids:
            result.append(gl.storage.copy_to_memory(self.workers[wallet]))
        return result

    @gl.public.view
    def get_top_workers(self, limit: i32) -> list[WorkerProfile]:
        """
        Returns up to `limit` workers sorted by reputation (desc),
        then by total_earned_gen (desc).
        """
        profiles = []
        for wallet in self.worker_ids:
            profiles.append(gl.storage.copy_to_memory(self.workers[wallet]))

        n = len(profiles)
        for i in range(n):
            for j in range(0, n - i - 1):
                a = profiles[j]
                b = profiles[j + 1]
                a_better = (
                    int(a.reputation_score) > int(b.reputation_score) or
                    (
                        int(a.reputation_score) == int(b.reputation_score) and
                        int(a.total_earned_gen) > int(b.total_earned_gen)
                    )
                )
                if not a_better:
                    profiles[j], profiles[j + 1] = profiles[j + 1], profiles[j]

        max_n = int(limit) if int(limit) > 0 else 10
        return profiles[:max_n]

    @gl.public.view
    def get_worker_submissions(self, wallet: str) -> list[Submission]:
        result = []
        for sid in self.submission_ids:
            sub = self.submissions[sid]
            if sub.worker == wallet:
                result.append(gl.storage.copy_to_memory(sub))
        return result

    @gl.public.view
    def get_all_submissions(self) -> list[Submission]:
        result = []
        for sid in self.submission_ids:
            result.append(gl.storage.copy_to_memory(self.submissions[sid]))
        return result
