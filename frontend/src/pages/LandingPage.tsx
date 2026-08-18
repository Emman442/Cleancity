import { ArrowRight, Clock, MapPin, Award } from "lucide-react";
import { Bounty } from "../lib/contracts/types";

interface LandingPageProps {
  bounties: Bounty[];
  loading: boolean;
  navigate: (path: string) => void;
}

export default function LandingPage({ bounties, loading, navigate }: LandingPageProps) {
  // Filter for OPEN bounties and limit to 6
  const openBounties = bounties
    .filter((b) => b.status === "open")
    .slice(0, 6);

  const steps = [
    {
      num: "01",
      title: "POST A BOUNTY",
      desc: "Lock GEN rewards into a smart contract. Upload a before photo showing the problem."
    },
    {
      num: "02",
      title: "CLAIM THE JOB",
      desc: "Workers browse open bounties and claim the ones they can complete."
    },
    {
      num: "03",
      title: "DO THE WORK",
      desc: "Head to the location. Get a unique session token. Complete the task. Take your proof photo."
    },
    {
      num: "04",
      title: "GET PAID INSTANTLY",
      desc: "Submit your photo. AI validators verify it. Funds hit your wallet automatically."
    }
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full bg-black py-16 px-4 sm:px-8 lg:py-24 border-b border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <span className="text-[10px] font-display font-bold tracking-[0.2em] text-[#a3e635] uppercase">
              POWERED BY GENLAYER AI
            </span>
            <h1 className="text-5xl sm:text-6xl font-display font-black text-white tracking-tighter leading-[0.9] uppercase">
              Fix the City.<br />
              Get Paid.<br />
              On-Chain.
            </h1>
            <p className="text-base sm:text-lg text-[#737373] font-sans max-w-md leading-relaxed">
              Post cleanup bounties for your neighborhood. Workers complete the job, snap proof, and AI validators release payment instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
              <button
                onClick={() => navigate("#/bounties")}
                className="px-8 py-4 bg-[#a3e635] text-black font-display font-bold tracking-wider uppercase text-center cursor-pointer transition-transform active:scale-95 hover:bg-[#bbf7d0]"
                style={{ borderRadius: "0px" }}
              >
                BROWSE BOUNTIES
              </button>
              <button
                onClick={() => navigate("#/post")}
                className="px-8 py-4 bg-transparent border border-white text-white hover:bg-white/10 font-display font-bold tracking-wider uppercase text-center cursor-pointer transition-transform active:scale-95"
                style={{ borderRadius: "0px" }}
              >
                POST A BOUNTY
              </button>
            </div>
          </div>

          {/* Right Column (Desktop Only Mockup) */}
         <div className="hidden lg:flex lg:col-span-5 h-[320px] w-full lg:w-[400px] border border-[#1f1f1f] relative shrink-0 justify-self-end">
  {/* Before half */}
  <div className="flex-1 bg-[#0c0c0c] flex items-center justify-center relative overflow-hidden">
    <span className="absolute top-4 left-4 text-[10px] text-[#ef4444] font-bold tracking-wider z-10">
      BEFORE
    </span>

    {bounties.length > 0 && bounties[5]?.before_image_url ? (
      <img
        src={bounties[5].before_image_url}
        alt="Before"
        className="w-full h-full object-cover grayscale brightness-90"
      />
    ) : (
      <div className="w-12 h-1 bg-[#ef4444]" />
    )}
  </div>

  {/* Splitter Line */}
  <div className="w-[1px] h-full bg-[#a3e635] z-10" />

  {/* After half */}
  <div className="flex-1 bg-[#161616] flex items-center justify-center relative overflow-hidden">
    <span className="absolute top-4 right-4 text-[10px] text-[#a3e635] font-bold tracking-wider z-10">
      AFTER
    </span>

   
      <img src={"https://res.cloudinary.com/dighewixb/image/upload/v1787088075/cleancity/zatnr9onrrfrpcmtvbte.jpg"} alt="After" className="w-full h-full object-cover" />
   

    <div className="w-12 h-1 bg-[#a3e635]" />
  </div>
</div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-black py-16 px-4 sm:px-8 border-b border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
            {steps.map((step) => (
              <div key={step.num} className="border-l border-[#1f1f1f] pl-4 py-2 hover:border-[#a3e635] transition-colors duration-300">
                <span className="text-[#a3e635] font-display font-black text-2xl block mb-1">
                  {step.num}
                </span>
                <h3 className="font-display font-bold text-white text-xs uppercase tracking-wider mb-2">
                  {step.title}
                </h3>
                <p className="text-[11px] text-[#737373] leading-snug font-sans">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Bounty Feed */}
      <section className="bg-black py-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-xl sm:text-2xl text-white tracking-wider uppercase">
                OPEN BOUNTIES
              </h2>
              {/* Pulsing Lime Dot */}
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a3e635] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#a3e635]"></span>
              </span>
            </div>
            <button
              onClick={() => navigate("#/bounties")}
              className="text-xs font-display font-bold tracking-wider text-[#a3e635] hover:text-white uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              VIEW ALL BOUNTIES <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Loading Skeleton or Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[340px] bg-[#1a1a1a] border border-[#1f1f1f]"></div>
              ))}
            </div>
          ) : openBounties.length === 0 ? (
            <div className="border border-dashed border-[#1f1f1f] p-12 text-center">
              <p className="text-xs text-[#444444] font-mono uppercase">NO OPEN BOUNTIES FOUND</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openBounties.map((bounty) => (
                <div
                  key={bounty.bounty_id}
                  onClick={() => navigate(`#/bounties/${bounty.bounty_id}`)}
                  className="bg-[#111111] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-all cursor-pointer flex flex-col h-[430px]"
                >
                  {/* Before Image */}
                  <div className="w-full h-44 bg-black border-b border-[#1f1f1f] overflow-hidden relative shrink-0">
                    <img
                      src={bounty.before_image_url}
                      alt={bounty.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 transition-all duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-black/80 px-2 py-0.5 text-[9px] font-mono tracking-wider text-[#a3e635] uppercase border border-[#1f1f1f]">
                      {bounty.category}
                    </div>
                    <div className="absolute top-3 right-3 bg-black/80 px-2 py-0.5 text-[9px] font-mono text-[#a3e635] uppercase border border-[#a3e635] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635]"></span>
                      OPEN
                    </div>
                  </div>

                  {/* Info Area */}
                  <div className="p-4 flex flex-col justify-between flex-grow">
                    <div>
                      <h3 className="font-display font-bold text-base text-white line-clamp-2 leading-tight uppercase mb-2">
                        {bounty.title}
                      </h3>
                      <p className="text-xs text-[#737373] flex items-center gap-1.5 font-sans mb-4">
                        <MapPin className="w-3.5 h-3.5 text-[#a3e635] shrink-0" />
                        <span className="truncate">{bounty.location_description}</span>
                      </p>
                    </div>

                    <div className="border-t border-[#1f1f1f]/50 pt-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#444444] font-mono uppercase">REWARD POOL</span>
                        <span className="text-xl font-mono font-bold text-[#a3e635]">{bounty.reward_gen} GEN</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#737373] mb-1">
                        <span className="font-mono">Created by {bounty.creator.substring(0, 6)}...</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-[#a3e635]" />
                          Ends in 2d
                        </span>
                      </div>
                      <button 
                        className="w-full bg-[#a3e635] hover:bg-[#bbf7d0] text-black py-2.5 font-display font-bold text-xs uppercase rounded-none transition-transform active:scale-[0.98] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`#/bounties/${bounty.bounty_id}`);
                        }}
                      >
                        VIEW JOB &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
