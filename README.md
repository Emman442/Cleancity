# CleanCity

**Decentralized Public Cleanup Bounties powered by GenLayer**

CleanCity is an Intelligent Contract on GenLayer that lets anyone fund real-world cleanup jobs and lets workers get paid automatically when the work is verified by AI.

Municipalities, NGOs, DAOs, or individual citizens can create bounties for issues like trash, graffiti, potholes, drainage problems, and more. Workers claim the bounty, complete the job, and submit proof. GenLayer’s AI evaluates the before/after images and decides whether the work was done. Approved submissions receive instant on-chain payouts in GEN.

---

## Key Features

- **Anyone can create bounties** — Lock GEN as reward
- **AI-powered verification** — Before vs After image comparison using GenLayer’s non-deterministic execution + Equivalence Principle
- **Session tokens** — Unique tokens that must appear in the after photo to prevent photo reuse/stock images
- **Claim system** — Workers claim bounties before starting work (supports multiple workers per bounty)
- **Automatic payouts** — GEN is sent directly to the worker when the AI approves the submission
- **Appeal system** — Workers can appeal rejected or inconclusive verdicts with extra context and images
- **Worker reputation** — Track submissions, approvals, earnings, and reputation score
- **Leaderboard** — Rank workers by reputation and total earnings
- **Admin override** — Admin can manually approve edge cases

---

## Supported Categories

- `trash`
- `graffiti`
- `pothole`
- `drainage`
- `vandalism`
- `flooding`
- `lighting`
- `other`

---

## How It Works

1. **Create Bounty**  
   Anyone deposits GEN and creates a bounty with a title, description, location, category, before-image URL, reward amount, duration, and max number of workers.

2. **Claim Bounty**  
   A worker claims the bounty (limited by `max_workers`).

3. **Generate Session Token**  
   The worker requests a unique session token that must be visible in their after photo.

4. **Submit Proof**  
   Worker submits:
   - After image URL
   - Session token
   - Optional notes

5. **AI Verification**  
   GenLayer AI compares the before and after images, checks for visible improvement, and returns a verdict (`approved`, `rejected`, or `inconclusive`) with confidence and reasoning.

6. **Payout or Appeal**  
   - If approved → Worker is paid automatically and reputation increases  
   - If rejected/inconclusive → Worker can appeal once with additional context and image

7. **Expiry**  
   Anyone can expire a bounty after the deadline so the remaining funds are returned to the creator.

---

## Main Contract Functions

### Write Methods
| Function | Description |
|---------|-------------|
| `create_bounty(...)` | Create a new bounty and lock GEN |
| `claim_bounty(bounty_id)` | Claim a bounty as a worker |
| `generate_session_token(bounty_id)` | Get a unique session token |
| `submit_proof(...)` | Submit after photo + token + notes for AI verification |
| `appeal_rejection(...)` | Appeal a rejected/inconclusive submission |
| `cancel_bounty(bounty_id)` | Cancel an open bounty (creator or admin) |
| `expire_bounty(bounty_id)` | Expire a bounty after deadline and refund creator |
| `admin_approve_submission(...)` | Admin manual approval |

### View Methods
| Function | Description |
|---------|-------------|
| `get_bounty(bounty_id)` | Get full bounty details |
| `get_open_bounties()` | List all currently open bounties |
| `get_all_bounties()` | List every bounty |
| `get_submission(submission_id)` | Get submission details |
| `get_worker_profile(wallet)` | Get worker stats and reputation |
| `get_leaderboard()` | Get all worker profiles |
| `get_top_workers(limit)` | Get top workers sorted by reputation |
| `get_worker_submissions(wallet)` | Get all submissions by a worker |
| `has_claimed(bounty_id, wallet)` | Check if a wallet has claimed a bounty |

---

## Tech Stack

- **Platform**: GenLayer
- **Language**: Python (Intelligent Contracts)
- **Consensus**: Optimistic Democracy + Equivalence Principle
- **AI Verification**: `gl.nondet.exec_prompt` + image analysis
- **Payments**: Native GEN transfers via `_Recipient`

---

## Getting Started

1. Deploy the contract on GenLayer Studio / Testnet
2. Set an admin address in the constructor
3. Create a bounty by calling `create_bounty` and sending the exact GEN amount
4. Workers can then claim, generate session tokens, and submit proofs

---

## Notes

- The AI is instructed to be relatively generous — clear evidence of work usually results in approval.
- Session tokens help prevent photo reuse but are not the only factor in verification.
- Appeals give workers a second chance with additional context.
- Reputation starts at 50 and changes based on outcomes (+10 for approval, -5 for rejection).

---

## License

MIT