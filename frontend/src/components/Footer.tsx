interface FooterProps {
  navigate: (path: string) => void;
}

export default function Footer({ navigate }: FooterProps) {
  return (
    <footer className="bg-black border-t border-[#1f1f1f] py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-6 mt-auto">
      <div className="text-xs text-[#444444] font-mono">
        &copy; 2026 CLEANCITY. POWERED BY GENLAYER AI. ALL CONTRACTS LIVE ON STUDIONET.
      </div>
      <div className="flex gap-6">
        <button 
          onClick={() => navigate("#/bounties")}
          className="text-xs text-[#444444] hover:text-[#737373] transition-colors uppercase font-display tracking-wider"
        >
          Bounties
        </button>
        <button 
          onClick={() => navigate("#/activity")}
          className="text-xs text-[#444444] hover:text-[#737373] transition-colors uppercase font-display tracking-wider"
        >
          My Activity
        </button>
        <a 
          href="https://genlayer.com" 
          target="_blank" 
          referrerPolicy="no-referrer"
          className="text-xs text-[#444444] hover:text-[#737373] transition-colors uppercase font-display tracking-wider"
        >
          GenLayer SDK
        </a>
      </div>
    </footer>
  );
}
