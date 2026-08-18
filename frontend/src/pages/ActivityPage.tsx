import { useState, useEffect } from "react";
import { ArrowRight, Clock, Award, CheckCircle2, XCircle, AlertCircle, Eye } from "lucide-react";
import { Bounty, Submission, WorkerProfile } from "../lib/contracts/types";
import { useWorkerProfile, useWorkerSubmissions,} from "../lib/hooks/useCleanCity";
import {getAddress} from "viem";

interface ActivityPageProps {
  wallet: string;
  bounties: Bounty[];
  loadingBounties: boolean;
  navigate: (path: string) => void;
}

export default function ActivityPage({
  wallet,
  bounties,
  loadingBounties,
  navigate,
}: ActivityPageProps) {
  const [activeTab, setActiveTab] = useState<"WORKER" | "CREATOR">("WORKER");

  const {data: profile, isPending: loadingProfile} = useWorkerProfile(getAddress(wallet));
  const {data: submissions, isPending: loadingWorkerSubmissions} = useWorkerSubmissions(getAddress(wallet));
  const walletLower = wallet.toLowerCase();


  // WORKER STATS & SUBMISSIONS
  const submittedCount = submissions?.length;
  const approvedCount = submissions?.filter((s) => s.status === "approved").length;
  const rejectedCount = submissions?.filter((s) => s.status === "rejected").length;
  const genEarned = profile?.total_earned_gen || 0;
  const reputation = profile?.reputation_score || 0;
  const tier = profile?.tier || "ROOKIE";

  // Tier calculation progress info
  const getNextTierInfo = (rep: number) => {
    if (rep < 101) return { next: "RELIABLE", target: 101, progress: (rep / 101) * 100 };
    if (rep < 301) return { next: "TRUSTED", target: 301, progress: ((rep - 101) / 200) * 100 };
    if (rep < 601) return { next: "ELITE", target: 601, progress: ((rep - 301) / 300) * 100 };
    return { next: "MAX TIER", target: 601, progress: 100 };
  };

  const nextTierInfo = getNextTierInfo(reputation);

  // Active claims (Bounties claimed by worker, but status is not COMPLETED)
  const activeClaims = bounties.filter(
    (b) => b.claimer?.includes(walletLower) && b.status !== "completed"
  );

  // CREATOR STATS & BOUNTIES
  const myCreatedBounties = bounties.filter((b) => b.creator.toLowerCase() === walletLower);
  const totalPosted = myCreatedBounties.length;
  const totalPaidOut = myCreatedBounties
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.reward_gen, 0);
  const activeBounties = myCreatedBounties.filter((b) => b.status === "open" || b.status === "claimed");
  const completedBounties = myCreatedBounties.filter((b) => b.status === "completed");

  const getVerdictBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="text-[#a3e635] bg-[#a3e635]/10 border border-[#a3e635] px-2 py-0.5 text-[9px] font-mono">APPROVED</span>;
      case "REJECTED":
        return <span className="text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444] px-2 py-0.5 text-[9px] font-mono">REJECTED</span>;
      case "INCONCLUSIVE":
        return <span className="text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b] px-2 py-0.5 text-[9px] font-mono">INCONCLUSIVE</span>;
      default:
        return <span className="text-[#737373] bg-[#111111] border border-[#1f1f1f] px-2 py-0.5 text-[9px] font-mono">PENDING</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 w-full flex-grow flex flex-col gap-8">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white uppercase">
            MY ACTIVITY
          </h1>
          <p className="text-xs text-[#444444] font-mono select-all uppercase">
            WALLET: {wallet}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#111111] border border-[#1f1f1f] p-1 self-start" style={{ borderRadius: "0px" }}>
          <button
            onClick={() => setActiveTab("WORKER")}
            className={`px-5 py-2 text-xs font-display font-bold uppercase transition-colors cursor-pointer ${
              activeTab === "WORKER" ? "bg-[#a3e635] text-black" : "text-[#737373] hover:text-white"
            }`}
            style={{ borderRadius: "0px" }}
          >
            AS WORKER
          </button>
          <button
            onClick={() => setActiveTab("CREATOR")}
            className={`px-5 py-2 text-xs font-display font-bold uppercase transition-colors cursor-pointer ${
              activeTab === "CREATOR" ? "bg-[#a3e635] text-black" : "text-[#737373] hover:text-white"
            }`}
            style={{ borderRadius: "0px" }}
          >
            AS CREATOR
          </button>
        </div>
      </div>

      {loadingProfile || loadingBounties ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#1a1a1a] border border-[#1f1f1f]" />
          ))}
        </div>
      ) : activeTab === "WORKER" ? (
        // WORKER TAB CONTENT
        <div className="flex flex-col gap-8">
          {/* Stats cards row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">SUBMITTED PROOFS</span>
              <span className="text-2xl font-mono font-bold text-[#a3e635] block mt-1">{submittedCount}</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">APPROVED JOBS</span>
              <span className="text-2xl font-mono font-bold text-[#a3e635] block mt-1">{approvedCount}</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">REJECTED PROOFS</span>
              <span className="text-2xl font-mono font-bold text-[#ef4444] block mt-1">{rejectedCount}</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">GEN EARNED</span>
              <span className="text-2xl font-mono font-bold text-[#a3e635] block mt-1">{genEarned} GEN</span>
            </div>
          </div>

          {/* Reputation card */}
          <div className="bg-[#0c0c0c] border border-[#1f1f1f] p-6 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] text-[#a3e635] font-display font-bold tracking-widest uppercase block">
                  REPUTATION PROGRESS
                </span>
                <span className="text-3xl font-mono font-bold text-[#a3e635] block mt-1">
                  {reputation} REP
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-[#737373] font-mono block">TIER RATING</span>
                <span className="text-xs bg-[#a3e635] text-black px-2 py-0.5 font-display font-bold block mt-1 uppercase" style={{ borderRadius: "0px" }}>
                  {tier} WORKER
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#111111] h-2.5 border border-[#1f1f1f]" style={{ borderRadius: "0px" }}>
              <div 
                className="bg-[#a3e635] h-full" 
                style={{ width: `${nextTierInfo.progress}%`, borderRadius: "0px" }}
              />
            </div>

            {/* Progress sub-labels */}
            <div className="flex justify-between text-[9px] font-mono text-[#737373]">
              <span>ROOKIE</span>
              <span>RELIABLE (101 REP)</span>
              <span>TRUSTED (301 REP)</span>
              <span>ELITE (601 REP)</span>
            </div>
          </div>

          {/* Active Claims */}
          <div className="flex flex-col gap-4">
            <h2 className="font-display font-bold text-sm text-white tracking-widest uppercase border-b border-[#1f1f1f] pb-2">
              ACTIVE CLAIMS ({activeClaims.length})
            </h2>

            {activeClaims.length === 0 ? (
              <div className="border border-dashed border-[#1f1f1f] py-10 text-center">
                <p className="text-xs text-[#444444] font-mono uppercase">NO ACTIVE CLAIMS FOUND</p>
                <button
                  onClick={() => navigate("#/bounties")}
                  className="text-xs text-[#a3e635] font-display font-bold uppercase mt-2 hover:underline cursor-pointer"
                >
                  Browse open board →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeClaims.map((claim) => (
                  <div
                    key={claim.bounty_id}
                    className="bg-[#111111] border border-[#1f1f1f] p-4 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <span className="text-[9px] text-[#a3e635] font-mono uppercase">{claim.category}</span>
                      <h4 className="font-display font-bold text-sm text-white uppercase mt-1 leading-tight line-clamp-1">
                        {claim.title}
                      </h4>
                      <p className="text-xs text-[#737373] flex items-center gap-1.5 mt-2 font-mono">
                        <Clock className="w-3.5 h-3.5 text-[#a3e635]" /> Ends in 2d
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-[#1f1f1f]/60 pt-3">
                      <span className="text-sm font-mono font-bold text-[#a3e635]">{claim.reward_gen} GEN</span>
                      <button
                        onClick={() => navigate(`#/bounties/${claim.bounty_id}`)}
                        className="px-4 py-2 bg-[#a3e635] hover:bg-[#bbf7d0] text-black font-display font-bold text-xs uppercase transition-colors cursor-pointer"
                        style={{ borderRadius: "0px" }}
                      >
                        SUBMIT PROOF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission History */}
          <div className="flex flex-col gap-4">
            <h2 className="font-display font-bold text-sm text-white tracking-widest uppercase border-b border-[#1f1f1f] pb-2">
              VERIFICATION SUBMISSIONS ({submissions?.length || 0} )
            </h2>

            {submissions?.length === 0 ? (
              <div className="border border-[#1f1f1f] py-8 text-center bg-[#0c0c0c]">
                <p className="text-xs text-[#444444] font-mono uppercase">NO VERIFICATION HISTORY FOUND</p>
              </div>
            ) : (
              <div className="bg-[#111111] border border-[#1f1f1f] overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] bg-[#0c0c0c] text-[#737373]">
                      <th className="p-4">BOUNTY TITLE</th>
                      <th className="p-4">TOKEN</th>
                      <th className="p-4">VERDICT STATUS</th>
                      <th className="p-4">REWARD</th>
                      <th className="p-4 text-right">DATE</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions?.map((sub) => (
                      <tr key={sub.submission_id} className="border-b border-[#1f1f1f]/50 hover:bg-[#161616]/40 transition-colors">
                        <td className="p-4 font-sans font-semibold text-white max-w-xs truncate">
                          {sub.bounty_id ? bounties.find((b) => b.bounty_id === sub.bounty_id)?.title || "Unknown Bounty" : "Unknown Bounty"}
                        </td>
                        <td className="p-4 text-[#a3e635] font-bold">{sub.session_token}</td>
                        <td className="p-4">{getVerdictBadge(sub.status)}</td>
                        <td className="p-4 text-white">
                          {sub.status === "approved" ? `+${profile?.total_earned_gen ? "" : ""} GEN` : "—"}
                        </td>
                        <td className="p-4 text-[#737373] text-right">
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => navigate(`#/bounties/${sub.bounty_id}`)}
                            className="text-[#a3e635] hover:text-white transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // CREATOR TAB CONTENT
        <div className="flex flex-col gap-8">
          {/* Creator stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">TOTAL POSTED</span>
              <span className="text-2xl font-mono font-bold text-[#a3e635] block mt-1">{totalPosted}</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">ACTIVE JOBS</span>
              <span className="text-2xl font-mono font-bold text-[#a3e635] block mt-1">{activeBounties.length}</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">COMPLETED JOBS</span>
              <span className="text-2xl font-mono font-bold text-white block mt-1">{completedBounties.length}</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4">
              <span className="text-[9px] text-[#737373] font-mono uppercase block">GEN PAID OUT</span>
              <span className="text-2xl font-mono font-bold text-[#a3e635] block mt-1">{totalPaidOut} GEN</span>
            </div>
          </div>

          {/* My Posted Bounties List */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-2">
              <h2 className="font-display font-bold text-sm text-white tracking-widest uppercase">
                MY CREATED BOUNTIES ({myCreatedBounties.length})
              </h2>
              <button
                onClick={() => navigate("#/post")}
                className="text-xs text-[#a3e635] font-display font-bold uppercase hover:underline cursor-pointer"
              >
                + POST NEW BOUNTY
              </button>
            </div>

            {myCreatedBounties.length === 0 ? (
              <div className="border border-dashed border-[#1f1f1f] py-16 text-center">
                <p className="text-xs text-[#444444] font-mono uppercase">YOU HAVE NOT POSTED ANY BOUNTIES YET</p>
                <button
                  onClick={() => navigate("#/post")}
                  className="text-xs text-[#a3e635] font-display font-bold uppercase mt-2 hover:underline cursor-pointer"
                >
                  Create your first bounty →
                </button>
              </div>
            ) : (
              <div className="bg-[#111111] border border-[#1f1f1f] overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] bg-[#0c0c0c] text-[#737373]">
                      <th className="p-4">BOUNTY TITLE</th>
                      <th className="p-4">CATEGORY</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4">CLAIMED</th>
                      <th className="p-4">REWARD</th>
                      <th className="p-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCreatedBounties.map((b) => (
                      <tr key={b.bounty_id} className="border-b border-[#1f1f1f]/50 hover:bg-[#161616]/40 transition-colors">
                        <td className="p-4 font-sans font-semibold text-white max-w-xs truncate">
                          {b.title}
                        </td>
                        <td className="p-4 text-[#737373] font-mono uppercase">{b.category}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-[9px] font-mono border ${
                            b.status === "open" ? "text-[#a3e635] border-[#a3e635]" :
                            b.status === "claimed" ? "text-[#3b82f6] border-[#3b82f6]" :
                            "text-white border-white"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-4 text-white">
                          {b.total_claims || 0} / {b.max_workers} worker(s)
                        </td>
                        <td className="p-4 text-[#a3e635] font-bold">{b.reward_gen} GEN</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => navigate(`#/bounties/${b.bounty_id}`)}
                            className="text-xs font-display font-bold text-[#a3e635] hover:text-white uppercase tracking-wider"
                          >
                            VIEW
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
