import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ToastContainer, { ToastMessage } from "./components/Toast";
import LandingPage from "./pages/LandingPage";
import BoardPage from "./pages/BoardPage";
import DetailPage from "./pages/DetailPage";
import PostPage from "./pages/PostPage";
import ActivityPage from "./pages/ActivityPage";
import ProfilePage from "./pages/ProfilePage";
import { Bounty } from "./lib/contracts/types";
import { useBounties, useClaimBounty, useCreateBounty } from "./lib/hooks/useCleanCity";
import { useWallet, WalletProvider } from "./lib/genlayer/wallet";

export default function App() {
  // Navigation Routing States
  const [currentPath, setCurrentPath] = useState(window.location.hash || "#/");
  const { address: wallet, connectWallet, disconnectWallet } = useWallet()
  const { isPending: isClaimingbounty, mutate: claimBounty } = useClaimBounty()
  const { isPending: isCreatingBounty, mutate: createBounty } = useCreateBounty()
  // Data States
  const { isPending: loadingBounties, data: bounties } = useBounties()

  // Global Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (title: string, description: string, type: "success" | "error" | "warning") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || "#/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);



  const handleConnectWallet = () => {
    try {
      connectWallet();
    } catch (err) {
      console.error("Connect failed:", err);
    }
  };


  const handleDisconnectWallet = () => {
    disconnectWallet()
  };

  const handleNavigate = (path: string) => {
    window.location.hash = path;
  };

  // Claim Bounty Handler
  const handleClaimBounty = (bountyId: string) => {
    if (!wallet) {
      connectWallet()
      return;
    }

    claimBounty({ bounty_id: bountyId }, {
      onSuccess: () => {
        showToast("Claim Successful!", "Bounty claimed successfully", "success")
      }
    })

  };


  // Route Dispatcher
  const renderPage = () => {
    if (currentPath === "#/" || currentPath === "") {
      return (
        <LandingPage
          bounties={bounties || []}
          loading={loadingBounties}
          navigate={handleNavigate}
        />
      );
    }

    if (currentPath === "#/bounties") {
      return (
        <BoardPage
          bounties={bounties || []}
          loading={loadingBounties}
          wallet={wallet}
          onClaim={handleClaimBounty}
          navigate={handleNavigate}
          onConnectWallet={() => connectWallet()}
          isClaimingBounty={isClaimingbounty}
        />
      );
    }

    if (currentPath.startsWith("#/bounties/")) {
      const id = currentPath.replace("#/bounties/", "");
      return (
        <DetailPage
          bountyId={id}
          bounties={bounties || []}
          wallet={wallet}
          onBack={() => handleNavigate("#/bounties")}
          onClaim={handleClaimBounty}
          onConnectWallet={() => connectWallet()}
          showToast={showToast}
        />
      );
    }

    if (currentPath === "#/post") {
      return (
        <PostPage
          wallet={wallet}
          navigate={handleNavigate}
          onConnectWallet={() => connectWallet()}
          showToast={showToast}
        />
      );
    }

    if (currentPath === "#/activity") {
      if (!wallet) {
        window.location.hash = "#/";
        return null;
      }
      return (
        <ActivityPage
          wallet={wallet}
          bounties={bounties || []}
          loadingBounties={loadingBounties}
          navigate={handleNavigate}
        />
      );
    }

    if (currentPath.startsWith("#/workers/")) {
      const walletAddr = currentPath.replace("#/workers/", "");
      return (
        <ProfilePage
          walletAddress={walletAddr}
          bounties={bounties || []}
          navigate={handleNavigate}
        />
      );
    }

    // Fallback: 404
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center w-full flex-grow flex flex-col justify-center items-center">
        <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-white mb-2">PAGE NOT FOUND</h2>
        <button
          onClick={() => handleNavigate("#/")}
          className="text-xs text-[#a3e635] font-display font-bold uppercase hover:underline"
        >
          Return to home
        </button>
      </div>
    );
  };

  return (
    // <WalletProvider>
      <div className="min-h-screen flex flex-col bg-black text-white relative font-sans selection:bg-[#a3e635] selection:text-black">
        {/* Sticky header */}
        <Navbar
          currentPath={currentPath}
          wallet={wallet}
          onDisconnect={handleDisconnectWallet}
          navigate={handleNavigate}
        />
        <main className="flex-grow flex flex-col">
          {renderPage()}
        </main>
        <Footer navigate={handleNavigate} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
  );
}
