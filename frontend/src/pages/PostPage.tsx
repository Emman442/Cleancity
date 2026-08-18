import React, { useState, useRef } from "react";
import {
  Trash2,
  Paintbrush,
  Hammer,
  Droplets,
  Flame,

  HelpCircle,
  Camera,

} from "lucide-react";
import { Category } from "../lib/contracts/types";
import { useCreateBounty } from "../lib/hooks/useCleanCity";
import { uploadImage } from "../lib/utils/uploadImage";

interface PostPageProps {
  wallet: string | null;
  navigate: (path: string) => void;
  onConnectWallet: () => void;
  showToast: (text: string, description: string, type: 'success' | 'error' | 'warning') => void;

}

export default function PostPage({
  wallet,
  navigate,
  onConnectWallet,
  showToast
}: PostPageProps) {
  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("trash");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [beforeImageURL, setBeforeImageURL] = useState<string | null>(null);

  const [reward, setReward] = useState<number>(50);
  const [maxWorkers, setMaxWorkers] = useState<number>(1);
  const [durationHours, setDurationHours] = useState<number>(86400);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isPending: isCreatingBounty, mutate: createBounty } = useCreateBounty()


  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesList: { value: Category; label: string; icon: any }[] = [
    { value: "trash", label: "TRASH", icon: Trash2 },
    { value: "graffiti", label: "GRAFFITI", icon: Paintbrush },
    { value: "pothole", label: "POTHOLE", icon: Hammer },
    { value: "drainage", label: "DRAINAGE", icon: Droplets },
    { value: "vandalism", label: "VANDALISM", icon: Flame },
    { value: "other", label: "OTHER", icon: HelpCircle },
  ];

  const durationOptions = [
    { label: "1H", value: 3600 },
    { label: "6H", value: 21600 },
    { label: "12H", value: 43200 },
    { label: "24H", value: 86400 },
    { label: "3D", value: 259200 },
    { label: "7D", value: 604800 },
  ];

  // Image compressor
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 550;
          const MAX_HEIGHT = 550;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75); // compress to 75% quality
          resolve(dataUrl);
        };
        img.onerror = (e) => reject(e);
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        const base64Str = await compressImage(files[0]);
        setBeforeImage(base64Str);

        const url = await uploadImage(base64Str);
        setBeforeImageURL(url);
      } catch (err) {
        console.error("Image processing error:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!wallet) {
      onConnectWallet();
      return;
    }

    if (!title || !description || !location || !beforeImageURL) {
      setError("Please fill out all fields and capture a BEFORE photo.");
      return;
    }

    console.log(beforeImageURL)


    createBounty({ title: title, description: description, location_description: location, category: category, before_image_url: beforeImageURL, reward_gen: reward, duration_seconds: durationHours, max_workers: maxWorkers }, {
      onSuccess: () => {
        showToast("Bounty Creation Successful!", "Bounty created successfully", "success")
      },
      onError: () => {
        showToast("Bounty Creation Failed!", "Failed to create bounty", "error")
      }
    })


  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 w-full flex-grow flex flex-col gap-8">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-white uppercase">
          POST A BOUNTY
        </h1>
        <p className="text-sm text-[#737373] font-sans">
          Lock GEN rewards and let the community fix it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-10">
        {/* Section: Problem */}
        <div className="flex flex-col gap-6">
          <h2 className="font-display font-bold text-sm text-[#a3e635] tracking-widest uppercase border-b border-[#1f1f1f] pb-2">
            THE PROBLEM
          </h2>

          {/* Title */}
          <div>
            <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-1.5">
              BOUNTY TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Large trash pile blocking sidewalk"
              className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3.5 text-xs font-sans text-white placeholder-[#444444]"
              style={{ borderRadius: "0px" }}
              required
            />
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-3">
              CATEGORY SELECTOR
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categoriesList.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-4 flex flex-col items-center justify-center gap-3 transition-colors text-center border cursor-pointer ${isSelected
                      ? "border-[#a3e635] bg-black text-[#a3e635]"
                      : "border-[#1f1f1f] bg-black text-[#737373] hover:border-[#2a2a2a] hover:text-white"
                      }`}
                    style={{ borderRadius: "0px" }}
                  >
                    <IconComponent className={`w-5 h-5 ${isSelected ? "text-[#a3e635]" : "text-inherit"}`} />
                    <span className="text-[10px] font-display font-bold tracking-wider uppercase">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-1.5">
              DESCRIBE THE PROBLEM
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What exactly is the issue? Be specific so workers know what to do."
              className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3.5 text-xs font-sans text-white placeholder-[#444444] h-28"
              style={{ borderRadius: "0px" }}
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-1.5">
              LOCATION
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Street corner, landmark, or address"
              className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3.5 text-xs font-sans text-white placeholder-[#444444]"
              style={{ borderRadius: "0px" }}
              required
            />
          </div>
        </div>

        {/* Section: The Proof */}
        <div className="flex flex-col gap-6">
          <h2 className="font-display font-bold text-sm text-[#a3e635] tracking-widest uppercase border-b border-[#1f1f1f] pb-2">
            THE PROOF
          </h2>

          <div>
            <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-1">
              BEFORE PHOTO
            </label>
            <p className="text-xs text-[#737373] font-sans mb-3">
              Take a clear photo of the problem right now. This becomes the reference image AI will use to verify completion.
            </p>

            {beforeImage ? (
              <div className="w-full h-64 bg-black border border-[#1f1f1f] relative">
                <img
                  src={beforeImage}
                  alt="Before photo preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setBeforeImage(null)}
                  className="absolute top-3 right-3 bg-black/80 hover:bg-black border border-[#ef4444] text-[#ef4444] px-2.5 py-1 text-[10px] font-mono uppercase"
                  style={{ borderRadius: "0px" }}
                >
                  RETAKE PHOTO
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#a3e635]/60 hover:border-[#a3e635] cursor-pointer bg-black/40 p-10 flex flex-col items-center justify-center gap-3 transition-colors group"
              >
                <Camera className="w-8 h-8 text-[#a3e635] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-display font-bold text-[#a3e635] tracking-wider uppercase">
                  CAPTURE BEFORE PHOTO
                </span>
                <span className="text-[10px] text-[#444444] font-mono uppercase">
                  CAMERA CAPTURE ONLY. GALLERY UPLOAD IS DISABLED.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section: The Reward */}
        <div className="flex flex-col gap-6">
          <h2 className="font-display font-bold text-sm text-[#a3e635] tracking-widest uppercase border-b border-[#1f1f1f] pb-2">
            THE REWARD
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount */}
            <div>
              <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-1.5">
                REWARD AMOUNT (GEN)
              </label>
              <input
                type="number"
                min="5"
                max="5000"
                value={reward}
                onChange={(e) => setReward(Math.max(5, parseInt(e.target.value) || 5))}
                className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3.5 text-2xl font-mono text-[#a3e635]"
                style={{ borderRadius: "0px" }}
                required
              />
              <p className="text-[10px] text-[#737373] mt-1 font-mono uppercase">
                This amount will be locked until a worker completes the job
              </p>
            </div>

            {/* Max Workers */}
            <div>
              <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-1.5">
                NUMBER OF WORKERS
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxWorkers}
                onChange={(e) => setMaxWorkers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3.5 text-lg font-mono text-white"
                style={{ borderRadius: "0px" }}
                required
              />
              <p className="text-[10px] text-[#737373] mt-1 font-mono uppercase">
                How many workers can claim and complete this bounty?
              </p>
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-[10px] font-display font-bold text-[#a3e635] tracking-wider uppercase mb-2">
              EXPIRATION DURATION
            </label>
            <div className="flex gap-2 flex-wrap">
              {durationOptions.map((opt) => {
                const isSelected = durationHours === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationHours(opt.value)}
                    className={`px-5 py-2.5 text-xs font-mono font-bold uppercase transition-colors border cursor-pointer ${isSelected
                      ? "bg-[#a3e635] border-[#a3e635] text-black"
                      : "bg-transparent border-[#1f1f1f] text-[#737373] hover:border-[#2a2a2a] hover:text-white"
                      }`}
                    style={{ borderRadius: "0px" }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary Card and Submit */}
        <div className="bg-[#111111] border border-[#1f1f1f] p-6 flex flex-col gap-6 mt-4">
          <h3 className="text-[10px] font-display font-bold text-[#a3e635] tracking-widest uppercase">
            BOUNTY SMART CONTRACT PREVIEW
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-[9px] text-[#444444] uppercase block">TOTAL LOCK AMOUNT</span>
              <span className="text-base text-[#a3e635] font-bold block mt-1">{reward * maxWorkers} GEN</span>
            </div>
            <div>
              <span className="text-[9px] text-[#444444] uppercase block">AI VERIFICATION</span>
              <span className="text-white block mt-1">GENLAYER OMNI-VALIDATORS</span>
            </div>
            <div>
              <span className="text-[9px] text-[#444444] uppercase block">DURATION</span>
              <span className="text-white block mt-1">{durationHours} HOURS</span>
            </div>
            <div>
              <span className="text-[9px] text-[#444444] uppercase block">STATUS</span>
              <span className="text-[#a3e635] block mt-1 font-bold">WAITING SIGNATURE</span>
            </div>
          </div>

          {error && (
            <div className="bg-[#1a0000] border border-[#ef4444] p-3 text-xs text-[#ef4444] font-mono uppercase">
              {error}
            </div>
          )}

          <div>
            {wallet ? (
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 font-display font-bold text-xs uppercase tracking-wider text-center transition-colors ${loading
                  ? "bg-[#1f1f1f] text-[#444444] cursor-not-allowed"
                  : "bg-[#a3e635] hover:bg-[#bbf7d0] text-black cursor-pointer"
                  }`}
                style={{ borderRadius: "0px" }}
              >
                {isCreatingBounty ? "POSTING TRANSACTION..." : "POST BOUNTY →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectWallet}
                className="w-full py-4 bg-[#1f1f1f] text-white hover:bg-[#252525] font-display font-bold text-xs uppercase tracking-wider text-center cursor-pointer transition-colors"
                style={{ borderRadius: "0px" }}
              >
                CONNECT WALLET TO POST
              </button>
            )}
            <p className="text-[9px] text-[#444444] font-mono uppercase text-center mt-3">
              Posting locks {reward * maxWorkers} GEN into the smart contract.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
