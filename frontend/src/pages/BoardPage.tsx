import { useState } from "react";
import { MapPin, Clock, Search, ChevronDown, Award } from "lucide-react";
import { Bounty, BountyStatus, Category } from "../lib/contracts/types";

interface BoardPageProps {
  bounties: Bounty[];
  loading: boolean;
  wallet: string | null;
  onClaim: (id: string) => Promise<void>;
  navigate: (path: string) => void;
  onConnectWallet: () => void;
  isClaimingBounty: boolean;
}

export default function BoardPage({
  bounties,
  loading,
  wallet,
  onClaim,
  navigate,
  onConnectWallet,
  isClaimingBounty
}: BoardPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<BountyStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"NEWEST" | "HIGHEST_REWARD" | "ENDING_SOON">("NEWEST");
  const [searchQuery, setSearchQuery] = useState("");

  console.log(bounties, "bounties");

  const categories: (Category | "all")[] = [
    "all",
    "trash",
    "graffiti",
    "pothole",
    "drainage",
    "vandalism",
    "other",
  ];

  const statuses: (BountyStatus | "all")[] = ["all", "open", "claimed", "completed"];

  // Filtering
  const filteredBounties = bounties.filter((b) => {
    const matchesCategory = selectedCategory === "all" || b.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || b.status === selectedStatus;
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location_description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Sorting
  const sortedBounties = [...filteredBounties].sort((a, b) => {
    if (sortBy === "HIGHEST_REWARD") {
      return b.reward_gen - a.reward_gen;
    } else if (sortBy === "ENDING_SOON") {
      return Number(a.deadline) - Number(b.deadline);
    } else {
      // NEWEST
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const getStatusColor = (status: BountyStatus) => {
    switch (status) {
      case "open":
        return "text-[#a3e635] border-[#a3e635]";
      case "claimed":
        return "text-[#3b82f6] border-[#3b82f6]";
      case "completed":
        return "text-white border-white";
      case "expired":
      case "cancelled":
        return "text-[#444444] border-[#444444]";
      default:
        return "text-[#737373] border-[#1f1f1f]";
    }
  };

  const getStatusDot = (status: BountyStatus) => {
    switch (status) {
      case "open":
        return "bg-[#a3e635]";
      case "claimed":
        return "bg-[#3b82f6]";
      case "completed":
        return "bg-white";
      default:
        return "bg-[#444444]";
    }
  };

  const formatDeadline = (deadline: number | string) => {
    // Contract stores deadline as unix ms number
    const deadlineMs =
      typeof deadline === "number"
        ? deadline
        : Number(deadline);

    if (!Number.isFinite(deadlineMs)) {
      return { text: "NO DEADLINE", urgent: false };
    }

    const remainingMs = deadlineMs - Date.now();

    if (remainingMs <= 0) {
      return { text: "EXPIRED", urgent: false };
    }

    const totalMinutes = Math.floor(remainingMs / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return {
        text: `Ends in ${days}d ${hours}h`,
        urgent: days < 1,
      };
    }

    if (hours > 0) {
      return {
        text: `ENDS IN ${hours}h ${minutes}m`,
        urgent: true,
      };
    }

    return {
      text: `ENDS IN ${minutes}m`,
      urgent: true,
    };
  };




  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 w-full flex-grow">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-white uppercase">
          BOUNTY BOARD
        </h1>
        <p className="text-sm text-[#737373] font-sans">
          Pick a job. Do the work. Earn GEN.
        </p>
      </div>

      {/* Controls: Search, Category Filters, Status, Sort */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Search & Sort & Status Group */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-between">
          {/* Search bar */}
          <div className="relative flex-grow max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
            <input
              type="text"
              placeholder="SEARCH BY LOCATION OR TITLE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-[#444444]"
              style={{ borderRadius: "0px" }}
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* Status Filter */}
            <div className="flex items-center bg-[#111111] border border-[#1f1f1f] p-1.5 gap-1" style={{ borderRadius: "0px" }}>
              {statuses.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 text-[10px] font-display font-bold uppercase transition-colors cursor-pointer ${selectedStatus === st
                    ? "bg-[#a3e635] text-black"
                    : "text-[#737373] hover:text-white"
                    }`}
                  style={{ borderRadius: "0px" }}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-[#111111] border border-[#1f1f1f] hover:border-[#2a2a2a] text-xs font-mono uppercase text-white px-4 py-3 pr-10 focus:outline-none focus:border-[#a3e635] appearance-none cursor-pointer"
                style={{ borderRadius: "0px" }}
              >
                <option value="NEWEST">Newest</option>
                <option value="HIGHEST_REWARD">Highest Reward</option>
                <option value="ENDING_SOON">Ending Soon</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="w-full border-b border-[#1f1f1f] pb-4 overflow-x-auto scrollbar-none flex gap-2">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-all border cursor-pointer ${isActive
                  ? "bg-[#a3e635] text-black border-[#a3e635]"
                  : "bg-transparent text-[#737373] border-[#1f1f1f] hover:border-[#2a2a2a] hover:text-white"
                  }`}
                style={{ borderRadius: "0px" }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[340px] bg-[#1a1a1a] border border-[#1f1f1f]" />
          ))}
        </div>
      ) : sortedBounties.length === 0 ? (
        <div className="border border-dashed border-[#1f1f1f] py-20 text-center w-full">
          <p className="text-sm text-[#444444] font-mono uppercase">NO BOUNTIES FOUND</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedBounties.map((b) => {
            const isClaimedByMe = wallet && b.claimer?.includes(wallet.toLowerCase());
            const deadlineInfo = formatDeadline(b.deadline.toString());


            const isCreator =
              !!wallet && b.creator.toLowerCase() === wallet.toLowerCase();

            const isExpired = Number(b.deadline) <= Date.now();

            const canClaim =
              !!wallet &&
              !isCreator &&
              !isExpired &&
              b.status === "open" &&
              !isClaimingBounty;

            return (
              <div
                key={b.bounty_id}
                className="bg-[#111111] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-all flex flex-col justify-between"
                style={{ borderRadius: "0px", height: "460px" }}
              >
                {/* Image Area */}
                <div
                  onClick={() => navigate(`#/bounties/${b.bounty_id}`)}
                  className="w-full h-[180px] bg-black border-b border-[#1f1f1f] overflow-hidden relative cursor-pointer group shrink-0"
                >
                  <img
                    src={b.before_image_url}
                    alt={b.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 border border-[#1f1f1f] px-2 py-0.5 text-[9px] font-mono tracking-widest text-[#a3e635] uppercase">
                    {b.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-black/80 border border-[#1f1f1f] px-2 py-0.5 text-[9px] font-mono uppercase flex items-center gap-1.5 text-white">
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(b.status)}`}></span>
                    {b.status}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4 flex flex-col justify-between flex-grow">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#737373]">
                      <span>POSTED BY {b.creator.substring(0, 6)}...</span>
                      <span>{b.total_claims || 0} WORKER(S) CLAIMED</span>
                    </div>

                    <h3
                      onClick={() => navigate(`#/bounties/${b.bounty_id}`)}
                      className="font-display font-bold text-base text-white hover:text-[#a3e635] transition-colors leading-snug line-clamp-2 uppercase cursor-pointer"
                    >
                      {b.title}
                    </h3>

                    <p className="text-xs text-[#737373] flex items-center gap-1.5 font-sans">
                      <MapPin className="w-3.5 h-3.5 text-[#a3e635] shrink-0" />
                      <span className="truncate">{b.location_description}</span>
                    </p>
                  </div>

                  <div className="border-t border-[#1f1f1f]/50 pt-3 flex flex-col gap-3">
                    {/* Reward Row */}
                    <div className="flex justify-between items-baseline">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[#444444] font-mono uppercase">BOUNTY REWARD</span>
                        <span className="text-2xl font-mono font-bold text-[#a3e635]">{b.reward_gen} GEN</span>
                      </div>
                      <span className="text-[10px] text-[#737373] font-sans">per completion</span>
                    </div>

                    {/* Deadline Row */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono border-t border-[#1f1f1f]/30 pt-2">
                      <Clock className={`w-3.5 h-3.5 ${deadlineInfo.urgent ? "text-[#a3e635]" : "text-[#737373]"}`} />
                      <span className={deadlineInfo.urgent ? "text-[#a3e635] font-bold" : "text-[#737373]"}>
                        {deadlineInfo.text}
                      </span>
                    </div>

                    {/* Action Button */}
                    {b.status === "completed" ? (
                      <button
                        onClick={() => navigate(`#/bounties/${b.bounty_id}`)}
                        className="w-full bg-[#1f1f1f] text-[#737373] text-xs font-display font-bold py-3 uppercase tracking-wider"
                        style={{ borderRadius: "0px" }}
                      >
                        VIEW DETAILS (COMPLETED ✓)
                      </button>
                    ) : isClaimedByMe ? (
                      <button
                        onClick={() => navigate(`#/bounties/${b.bounty_id}`)}
                        className="w-full bg-transparent border border-white text-white text-xs font-display font-bold py-3 uppercase tracking-wider"
                        style={{ borderRadius: "0px" }}
                      >
                        SUBMIT PROOF (CLAIMED ✓)
                      </button>
                    ) : isCreator ? (
                      <button
                        disabled
                        className="w-full bg-[#1a1a1a] text-[#555555] border border-[#2a2a2a] text-xs font-display font-bold py-3 uppercase tracking-wider cursor-not-allowed"
                        style={{ borderRadius: "0px" }}
                      >
                        YOUR BOUNTY — CAN’T CLAIM
                      </button>
                    ) : isExpired || b.status !== "open" ? (
                      <button
                        disabled
                        className="w-full bg-[#1a1a1a] text-[#555555] border border-[#2a2a2a] text-xs font-display font-bold py-3 uppercase tracking-wider cursor-not-allowed"
                        style={{ borderRadius: "0px" }}
                      >
                        {isExpired ? "EXPIRED" : "UNAVAILABLE"}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!wallet) onConnectWallet();
                          else onClaim(b.bounty_id);
                        }}
                        disabled={!canClaim && !!wallet}
                        className={`w-full text-xs font-display font-bold py-3 uppercase tracking-wider transition-colors ${!wallet || canClaim
                            ? "bg-[#a3e635] hover:bg-[#bbf7d0] text-black cursor-pointer"
                            : "bg-[#1a1a1a] text-[#555555] border border-[#2a2a2a] cursor-not-allowed"
                          }`}
                        style={{ borderRadius: "0px" }}
                      >
                        {isClaimingBounty ? "CLAIMING..." : !wallet ? "CONNECT TO CLAIM →" : "CLAIM JOB →"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
