import { useState } from "react";
import { Menu, X, LogOut, Briefcase, User } from "lucide-react";
import { useWallet } from "../lib/genlayer/wallet";

interface NavbarProps {
  currentPath: string;
  wallet: string | null;
  onDisconnect: () => void;
  navigate: (path: string) => void;
}

export default function Navbar({ currentPath, wallet, onDisconnect, navigate }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const {connectWallet} = useWallet()
  const truncateWallet = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const navLinks = [
    { name: "Bounties", path: "#/bounties" },
    { name: "My Activity", path: "#/activity", requiresAuth: true },
  ];

  

  const handleLinkClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setShowDropdown(false);
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-black border-b border-[#1f1f1f] h-16 flex items-center justify-between px-4 sm:px-8">
      {/* Brand logo */}
      <div 
        onClick={() => handleLinkClick("#/")} 
        className="cursor-pointer select-none font-display text-2xl font-black tracking-tighter text-[#a3e635] uppercase"
      >
        CLEANCITY
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => {
          if (link.requiresAuth && !wallet) return null;
          const isActive = currentPath === link.path;
          return (
            <button
              key={link.name}
              onClick={() => handleLinkClick(link.path)}
              className={`text-sm uppercase font-display font-medium tracking-wider cursor-pointer transition-all ${
                isActive ? "text-white border-b border-[#a3e635] pb-1" : "text-[#737373] hover:text-white pb-1"
              }`}
            >
              {link.name}
            </button>
          );
        })}

        {wallet ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 bg-transparent text-[#a3e635] text-xs font-mono font-bold tracking-wider border border-[#a3e635] hover:bg-[#a3e635]/10 transition-colors"
              style={{ borderRadius: "0px" }}
            >
              {truncateWallet(wallet)}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-[#111111] border border-[#1f1f1f] shadow-2xl z-50">
                <button
                  onClick={() => handleLinkClick("#/activity")}
                  className="w-full text-left px-4 py-3 text-xs uppercase font-display tracking-wider hover:bg-[#161616] text-white flex items-center gap-2 border-b border-[#1f1f1f]"
                >
                  <Briefcase className="w-4 h-4 text-[#a3e635]" />
                  My Activity
                </button>
                <button
                  onClick={() => handleLinkClick(`#/workers/${wallet}`)}
                  className="w-full text-left px-4 py-3 text-xs uppercase font-display tracking-wider hover:bg-[#161616] text-white flex items-center gap-2 border-b border-[#1f1f1f]"
                >
                  <User className="w-4 h-4 text-[#a3e635]" />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    onDisconnect();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-xs uppercase font-display tracking-wider hover:bg-[#161616] text-[#ef4444] flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-[#ef4444]" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => connectWallet()}
            className="bg-[#a3e635] text-black px-6 py-2 font-display font-bold uppercase text-xs rounded-none transition-transform active:scale-95 hover:bg-[#bbf7d0] cursor-pointer"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden text-white p-2"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Drawer (Full Screen) */}
      {isOpen && (
        <div className="fixed inset-0 top-16 bg-black z-30 flex flex-col p-6 gap-6 md:hidden">
          {navLinks.map((link) => {
            if (link.requiresAuth && !wallet) return null;
            const isActive = currentPath === link.path;
            return (
              <button
                key={link.name}
                onClick={() => handleLinkClick(link.path)}
                className={`text-xl uppercase font-display tracking-wider text-left py-2 border-b border-[#1f1f1f] ${
                  isActive ? "text-[#a3e635]" : "text-[#737373]"
                }`}
              >
                {link.name}
              </button>
            );
          })}

          {wallet ? (
            <div className="flex flex-col gap-4 mt-auto mb-6">
              <div className="text-xs text-[#737373] font-mono">
                CONNECTED WALLET:
                <div className="text-[#a3e635] text-sm font-semibold tracking-wider mt-1">
                  {wallet}
                </div>
              </div>
              <button
                onClick={() => handleLinkClick(`#/workers/${wallet}`)}
                className="w-full py-3 bg-transparent border border-[#1f1f1f] text-white font-display text-sm tracking-wider uppercase text-center"
              >
                VIEW WORKER PROFILE
              </button>
              <button
                onClick={() => {
                  onDisconnect();
                  setIsOpen(false);
                }}
                className="w-full py-3 bg-transparent border border-[#ef4444] text-[#ef4444] font-display text-sm tracking-wider uppercase"
                style={{ borderRadius: "0px" }}
              >
                DISCONNECT WALLET
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsOpen(false);
                connectWallet();
              }}
              className="w-full py-3 bg-[#a3e635] text-black font-display text-sm tracking-wider uppercase font-bold mt-auto mb-6"
              style={{ borderRadius: "0px" }}
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
