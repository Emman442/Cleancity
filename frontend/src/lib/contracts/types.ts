export type BountyStatus = "open" | "claimed" | "submitted" | "completed" | "expired" | "cancelled"
export type Category = "trash" | "graffiti" | "pothole" | "drainage" | "vandalism" | "other"
export type Verdict = "approved" | "rejected" | "inconclusive"

export interface Bounty {
  bounty_id: string
  creator: string
  title: string
  description: string
  location_description: string
  category: Category
  before_image_url: string
  reward_gen: number
  deadline: number
  status: BountyStatus
  claimer: string
  claimed_at: string
  submission_id: string
  created_at: string
  max_workers: number
  total_claims: number
}



export interface Submission {
  submission_id: string
  bounty_id: string
  worker: string
  after_image_url: string
  session_token: string
  notes: string
  status: "pending" | "approved" | "rejected" | "appealed"
  ai_verdict: Verdict | "pending"
  ai_reasoning: string
  ai_confidence: "high" | "medium" | "low"
  submitted_at: string
  reviewed_at: string
  payout_sent: boolean
}


export interface WorkerProfile {
  wallet: string
  total_submissions: number
  total_approved: number
  total_rejected: number
  total_earned_gen: number
  reputation_score: number
  first_seen_at: string
  tier?: "ROOKIE" | "INTERMEDIATE" | "EXPERT" | "MASTER"

}

export interface Appeal {
  appeal_id: string
  submission_id: string
  bounty_id: string
  worker: string
  appeal_context: string
  additional_image_url: string
  ai_verdict: string
  ai_reasoning: string
  status: "pending" | "upheld" | "rejected"
  submitted_at: string
  resolved_at: string

}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}