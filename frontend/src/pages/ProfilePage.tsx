import { useState, useEffect } from "react";
import { Award, Briefcase, MapPin, Calendar, Check, Copy } from "lucide-react";
import { Bounty, Submission, WorkerProfile } from "../lib/contracts/types";
import { useWorkerProfile, useWorkerSubmissions,} from "../lib/hooks/useCleanCity";
import {getAddress} from "viem";

interface ProfilePageProps {
  walletAddress: string;
  bounties: Bounty[];
  navigate: (path: string) => void;
}

export default function ProfilePage({
  walletAddress,
  bounties,
  navigate,
}: ProfilePageProps) {
  const [copied, setCopied] = useState(false);

    const {data: profile, isPending: loading} = useWorkerProfile(getAddress(walletAddress));
    const {data: submissions, isPending: loadingWorkerSubmissions} = useWorkerSubmissions(getAddress(walletAddress));

  const walletLower = walletAddress.toLowerCase();

  const copyWallet = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  console.log(submissions, "submissions in profile page");

  // Stats calculation
  const approvedSubmissions = submissions?.filter((s) => s.status === "approved");
  const approvedCount = approvedSubmissions?.length ?? 0;
  const totalSubmissions = submissions?.length ?? 0;
  const successRate = totalSubmissions > 0
    ? Math.round((approvedCount / totalSubmissions) * 100)
    : 100;

  // Gather completed bounty details by matching approved submissions with bounties
  const completedJobs = approvedSubmissions?.map((sub) => {
    const bounty = bounties.find((b) => b.bounty_id === sub.bounty_id);
    return {
      id: sub.bounty_id,
      title:  bounty?.title || "Unknown Bounty",
      location: bounty?.location_description || "Civic center",
      reward: bounty?.reward_gen || 0,
      date: sub.submitted_at,
      beforeImage: bounty?.before_image_url || "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60",
      afterImage: sub.after_image_url || "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=60" ,
    };
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 w-full flex-grow flex flex-col gap-8">
      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="h-44 bg-[#1a1a1a] border border-[#1f1f1f]" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[#1a1a1a] border border-[#1f1f1f]" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Header Card */}
          <div className="bg-[#111111] border border-[#1f1f1f] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-[#a3e635] font-display font-bold tracking-widest uppercase">
                CIVIC CIVI WORKER PROFILE
              </span>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-xs sm:text-sm text-white select-all break-all bg-black p-2 border border-[#1f1f1f]">
                  {walletAddress}
                </h1>
                <button
                  onClick={copyWallet}
                  className="p-2 bg-black border border-[#1f1f1f] hover:border-[#2a2a2a] text-white transition-colors shrink-0"
                  title="Copy address"
                >
                  {copied ? <Check className="w-4 h-4 text-[#a3e635]" /> : <Copy className="w-4 h-4 text-[#737373]" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              {/* Reputation score badge */}
              <div className="bg-[#a3e635] text-black px-4 py-2 flex flex-col items-center justify-center">
                <span className="text-xl font-mono font-bold leading-none">{profile?.reputation_score || 0}</span>
                <span className="text-[8px] font-display font-bold uppercase tracking-wider mt-0.5">REP SCORE</span>
              </div>
              {/* Tier badge */}
              <div className="bg-black border border-[#a3e635] text-[#a3e635] px-4 py-2 flex flex-col items-center justify-center">
                <span className="text-xs font-display font-bold uppercase tracking-wider">{profile?.tier || "ROOKIE"}</span>
                <span className="text-[8px] text-[#737373] font-display font-bold uppercase tracking-wider mt-0.5">WORKER TIER</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-[#111111] border border-[#1f1f1f] p-4 text-center">
              <span className="text-[9px] text-[#737373] uppercase block">JOBS DONE</span>
              <span className="text-2xl font-bold text-white block mt-1">{profile?.total_approved || 0}</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4 text-center">
              <span className="text-[9px] text-[#737373] uppercase block">GEN EARNED</span>
              <span className="text-2xl font-bold text-[#a3e635] block mt-1">{profile?.total_earned_gen || 0} GEN</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4 text-center">
              <span className="text-[9px] text-[#737373] uppercase block">SUCCESS RATE</span>
              <span className="text-2xl font-bold text-white block mt-1">{successRate}%</span>
            </div>
            <div className="bg-[#111111] border border-[#1f1f1f] p-4 text-center">
              <span className="text-[9px] text-[#737373] uppercase block">REPUTATION</span>
              <span className="text-2xl font-bold text-[#a3e635] block mt-1">{profile?.reputation_score || 0}</span>
            </div>
          </div>

          {/* Completed Jobs */}
          <div className="flex flex-col gap-4">
            <h2 className="font-display font-bold text-sm text-white tracking-widest uppercase border-b border-[#1f1f1f] pb-2">
              COMPLETED JOBS HISTORY ({completedJobs?.length})
            </h2>

            {completedJobs?.length === 0 ? (
              <div className="border border-dashed border-[#1f1f1f] py-16 text-center">
                <p className="text-xs text-[#444444] font-mono uppercase">NO COMPLETED JOBS RECORDED YET</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {completedJobs?.map((job, idx) => (
                  <div
                    key={idx}
                    className="bg-[#111111] border border-[#1f1f1f] p-4 flex flex-col md:flex-row justify-between gap-6"
                  >
                    <div className="flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="font-display font-bold text-base text-white uppercase leading-snug">
                          {job.title}
                        </h4>
                        <div className="flex flex-wrap gap-4 text-xs text-[#737373] mt-2 font-sans">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#a3e635]" /> {job.location}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-[#a3e635]" /> {new Date(job.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#1f1f1f]/50">
                        <span className="text-[10px] text-[#444444] font-mono uppercase block">BOUNTY REWARD COLLECTED</span>
                        <span className="text-base font-mono font-bold text-[#a3e635] mt-1 block">+{job.reward} GEN</span>
                      </div>
                    </div>

                    {/* Side-by-side thumbnail comparison */}
                    <div className="w-full md:w-48 shrink-0 flex gap-2">
                      <div className="flex-1 h-24 bg-black border border-[#1f1f1f] relative overflow-hidden">
                        <img
                          src={job.beforeImage}
                          alt="Before"
                          className="w-full h-full object-cover grayscale"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/80 text-[#ef4444] font-mono text-[8px] px-1 border border-[#1f1f1f]">
                          BEFORE
                        </span>
                      </div>
                      <div className="flex-1 h-24 bg-black border border-[#1f1f1f] relative overflow-hidden">
                        <img
                          src={job.afterImage}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/80 text-[#a3e635] font-mono text-[8px] px-1 border border-[#1f1f1f]">
                          AFTER
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
