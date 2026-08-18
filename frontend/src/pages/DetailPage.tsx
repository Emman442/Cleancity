import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import { Bounty, Category, Verdict } from "../lib/contracts/types";
import { useSubmitProof, useGenerateSessionToken, useSubmission, useAppealRejection } from "../lib/hooks/useCleanCity";
import { extractSessionToken } from "../lib/utils/generateSessionToken";
import { uploadImage } from "../lib/utils/uploadImage";

import { useCleanCityContract } from "../lib/hooks/useCleanCity";
import { extractSubmissionId } from "../lib/utils/extractSubmissionId";

interface DetailPageProps {
  bountyId: string;
  bounties: Bounty[];
  wallet: string | null;
  onBack: () => void;
  onClaim: (id: string) => Promise<void>;
  onConnectWallet: () => void;
  showToast: (title: string, message: string, type: "success" | "error" | "info") => void;
}

export default function DetailPage({
  bountyId,
  bounties,
  wallet,
  onBack,
  onClaim,
  onConnectWallet,
  showToast
}: DetailPageProps) {
  const bounty = bounties.find((b) => b.bounty_id === bountyId);

  const contract = useCleanCityContract();
  const [token, setToken] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | "PENDING" | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | "">("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const { isPending: isSubmittingAppeal, mutate: submitAppeal } = useAppealRejection();
  console.log(bounty)
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealContext, setAppealContext] = useState("");
  const [appealImagePreview, setAppealImagePreview] = useState<string | null>(null);
  const appealFileInputRef = useRef<HTMLInputElement>(null);


  const [statusMsgIndex, setStatusMsgIndex] = useState(0);
  const statusMessages = [
    "Fetching before image...",
    "Analyzing after photo...",
    "Checking session token visibility...",
    "Comparing location details...",
    "Validators reaching consensus...",
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isPending: isSubmittingProof, mutate: submitProof } = useSubmitProof();
  const { isPending: isGeneratingSessionToken, mutate: generateToken } = useGenerateSessionToken()

  const isClaimedByMe =
    !!wallet &&
    !!bounty?.claimer &&
    bounty.claimer.toLowerCase() === wallet.toLowerCase();

  useEffect(() => {
    if (wallet && bounty) {
      const storedToken = localStorage.getItem(
        `token_${wallet.toLowerCase()}_${bounty.bounty_id}`
      );
      if (storedToken) setToken(storedToken);
    }
  }, [wallet, bounty]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSubmittingProof && verdict === "PENDING") {
      interval = setInterval(() => {
        setStatusMsgIndex((prev) => (prev + 1) % statusMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSubmittingProof, verdict]);

  if (!bounty) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center w-full flex-grow">
        <p className="text-xs text-[#737373] font-mono uppercase mb-4">
          BOUNTY NOT FOUND
        </p>
        <button
          onClick={onBack}
          className="text-xs text-[#a3e635] uppercase font-display font-bold"
        >
          ← Back to board
        </button>
      </div>
    );
  }

  async function stampTokenOnImage(dataUrl: string, token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, canvas.height - 48, canvas.width, 48);

        ctx.fillStyle = "#a3e635";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText(token, canvas.width / 2, canvas.height - 16);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
  const handleGenerateToken = () => {
    if (!wallet) return;
    generateToken({ bounty_id: bountyId }, {
      onSuccess: (result) => {


        const token = extractSessionToken(result);
        console.log("parsed token:", token);


        setToken(token);
        localStorage.setItem(
          `token_${wallet.toLowerCase()}_${bountyId}`,
          token
        );

        showToast(
          "Token Generated!",
          `Your session token is ${token}`,
          "success"
        );
      },
      onError: () => {
        showToast("Token Generation Failed!", "Failed to generate session token", "error")
      }
    })

  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = (e) => reject(e);
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    try {
      const base64Str = await compressImage(files[0]);

      const finalImage = token
        ? await stampTokenOnImage(base64Str, token)
        : base64Str;

      setImagePreview(finalImage);
    } catch (err) {
      console.error("Image processing error:", err);
      showToast("Image Error", "Could not process photo", "error");
    }
  };

  const handleAppealFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const base64Str = await compressImage(files[0]);
      setAppealImagePreview(base64Str);
    } catch (err) {
      console.error("Appeal image processing error:", err);
      showToast("Image Error", "Could not process appeal photo", "error");
    }
  };

  const handleSubmitAppeal = async () => {
    if (!submissionId || !appealContext.trim()) return;

    try {
      let additionalImageUrl = "";
      if (appealImagePreview) {
        additionalImageUrl = await uploadImage(appealImagePreview);
      }

      submitAppeal(
        {
          submission_id: submissionId,
          appeal_context: appealContext,
          additional_image_url: additionalImageUrl,
        },
        {
          onSuccess: async () => {
            showToast("Appeal Submitted", "Your appeal is under review", "success");
            const submission = await contract?.getSubmission(submissionId);
            setVerdict(submission?.ai_verdict as Verdict || "pending");
            setReasoning(submission?.ai_reasoning || "No reasoning provided yet.");
            setConfidence(submission?.ai_confidence as any || "low");
            setShowAppealForm(false);
            setAppealContext("");
            setAppealImagePreview(null);
          },
          onError: (err) => {
            console.error(err);
            showToast("Appeal Failed", "Could not submit appeal", "error");
          },
        }
      );
    } catch (err) {
      console.error(err);
      showToast("Upload Failed", "Could not upload appeal image", "error");
    }
  };
  const handleSubmitProof = async () => {
    if (!imagePreview || !token) return;

    setVerdict("PENDING");
    setReasoning("");
    setConfidence("");

    try {
      const afterImageUrl = await uploadImage(imagePreview);
      console.log("Uploaded after image URL:", afterImageUrl);

      submitProof(
        {
          bounty_id: bountyId,
          after_image_url: afterImageUrl,
          session_token: token,
          notes: notes || "",
        },
        {
          onSuccess: async (result) => {
            try {

              const submissionId =
                extractSubmissionId(result) ||
                (await contract?.getBounty(bountyId))?.submission_id;
              "";

              let finalSubmissionId = submissionId;

              if (!finalSubmissionId) {
                await new Promise((r) => setTimeout(r, 1500));
                const b = await contract?.getBounty(bountyId);
                finalSubmissionId = b?.submission_id;
              }



              if (!finalSubmissionId) {
                setVerdict("inconclusive");
                setReasoning("Proof submitted, but submission id not found yet. Refresh shortly.");
                setConfidence("low");
                return;
              }

              setSubmissionId(finalSubmissionId);

              const submission = await contract?.getSubmission(finalSubmissionId);
              setVerdict(submission?.ai_verdict as Verdict || "pending");
              setReasoning(submission?.ai_reasoning || "No reasoning provided yet.");
              setConfidence(submission?.ai_confidence as any || "low");
            } catch (e) {
              console.error(e);
              setVerdict("inconclusive");
              setReasoning("Proof submitted, but failed to load AI verdict.");
              setConfidence("low");
            }
          },
          onError: (err) => {
            console.error(err);
            setVerdict(null);
            setReasoning("");
            setConfidence("");
            showToast("Submit Failed", "Could not submit proof", "error");
          },
        }
      );
    } catch (err) {
      console.error(err);
      setVerdict(null);
      showToast("Upload Failed", "Could not upload proof image", "error");
    }
  };

  const getRequirementsList = (category: Category) => {
    switch (category) {
      case "trash":
        return [
          "Remove all visible garbage, plastic, pallets, or tire debris from the designated area.",
          "Sweep the sidewalk or ground underneath to ensure zero small litter remains.",
          "Dispose of the collected trash in standard municipal bins or dumpsters.",
          "Capture the after photo from the exact same angle as the before photo.",
          "Ensure the generated Session Token is clearly visible in your hand or on site.",
        ];
      case "graffiti":
        return [
          "Apply specialized paint remover or scrub with high-pressure clean water.",
          "Alternatively, color-match paint to cover tags completely with sharp edges.",
          "Do not damage any historical or decorative mural background.",
          "Ensure the tag is 100% invisible or perfectly sealed under color blocks.",
          "Capture the proof photo containing your session token close to the surface.",
        ];
      case "pothole":
        return [
          "Sweep the loose asphalt debris and gravel out of the pothole.",
          "Pour in asphalt patch binder and cold asphalt repair compound.",
          "Compact and flatten the cold patch using a tamper or heavy mallet until flush.",
          "Ensure the repaired bike lane or street section is solid and flat for vehicle tires.",
          "Take a high-contrast photo showing the flat repair and the session token clearly.",
        ];
      case "drainage":
        return [
          "Scrape and shovel away all clogged matted leaves, plastic bags, and silt.",
          "Clear the storm water intake grate to guarantee dynamic drainage flow.",
          "Ensure standing water drains away entirely, clearing any pedestrian blockages.",
          "Dispose of collected organic material in organic waste bins.",
          "Take a photo of the dry, functional drainage grate displaying your token.",
        ];
      default:
        return [
          "Identify and resolve the core issue described in the bounty brief.",
          "Ensure the site is restored to a safe, clean, and fully operational condition.",
          "Take a clear photo showing the resolution of the problem.",
          "Display your unique session token clearly in the after photo.",
        ];
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full flex-grow flex flex-col gap-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="text-[10px] font-display font-bold tracking-wider text-[#737373] hover:text-white transition-colors uppercase cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> BACK TO BOARD
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Before Image */}
          <div className="w-full h-[200px] sm:h-[350px] bg-black border border-[#1f1f1f] relative overflow-hidden">
            <img
              src={bounty.before_image_url}
              alt={bounty.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover grayscale"
            />
            <div className="absolute top-4 left-4 bg-black/90 border border-[#1f1f1f] px-3 py-1 text-[10px] font-mono text-[#a3e635] tracking-widest uppercase">
              BEFORE — PROBLEM PHOTO
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-mono tracking-widest text-[#a3e635] uppercase">
              {bounty.category} REMOVAL
            </span>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white uppercase leading-none">
              {bounty.title}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-[#737373]">
              <MapPin className="w-4 h-4 text-[#a3e635] shrink-0" />
              <span>{bounty.location_description}</span>
            </div>
            <p className="text-sm text-white font-sans leading-relaxed mt-2 whitespace-pre-line">
              {bounty.description}
            </p>
          </div>

          {/* Requirements */}
          <div className="bg-[#0c0c0c] border border-[#1f1f1f] p-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-display font-bold text-[#a3e635] tracking-widest uppercase">
              WHAT YOU NEED TO DO
            </h3>
            <ul className="flex flex-col gap-2">
              {getRequirementsList(bounty.category).map((reqText, idx) => (
                <li
                  key={idx}
                  className="text-xs text-[#737373] flex items-start gap-2.5 font-sans"
                >
                  <span className="text-[#a3e635] mt-0.5 shrink-0">▪</span>
                  <span>{reqText}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Worker flow */}
          {isClaimedByMe && bounty.status !== "completed" && (
            <div className="flex flex-col gap-6">
              {/* Session Token */}
              <div className="bg-black border-l-3 border-[#a3e635] border border-y-[#1f1f1f] border-r-[#1f1f1f] p-5 flex flex-col gap-3">
                <h3 className="text-[10px] font-display font-bold text-[#a3e635] tracking-widest uppercase">
                  YOUR SESSION TOKEN
                </h3>

                {token ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#111111] border border-[#1f1f1f] p-4 text-2xl font-mono font-bold text-[#a3e635] tracking-widest select-all uppercase">
                        {token}
                      </div>
                      <button
                        onClick={copyToken}
                        className="p-4 bg-[#111111] border border-[#1f1f1f] hover:border-[#2a2a2a] text-white transition-colors"
                        title="Copy session token"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-[#a3e635]" />
                        ) : (
                          <Copy className="w-5 h-5 text-[#737373]" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[#737373] font-sans">
                      This code must be clearly visible in your after photo. Write
                      it on paper, show it on your phone, or hold a sign — just
                      make it readable.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 items-start">
                    <p className="text-xs text-[#737373] font-sans">
                      Generate a verification code linked to your session. This
                      must be written or displayed clearly inside your proof
                      photo.
                    </p>
                    <button
                      onClick={handleGenerateToken}
                      className="px-6 py-2.5 bg-[#a3e635] hover:bg-[#bbf7d0] text-black font-display font-bold text-xs tracking-wider uppercase transition-colors"
                      style={{ borderRadius: "0px" }}
                    >
                      {isGeneratingSessionToken ? "GENERATING TOKEN..." : "GENERATE TOKEN"}
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Proof */}
              {token && !verdict && (
                <div className="bg-[#111111] border border-[#1f1f1f] p-6 flex flex-col gap-5">
                  <h3 className="font-display font-bold text-white text-base uppercase">
                    SUBMIT YOUR PROOF
                  </h3>

                  {imagePreview ? (
                    <div className="flex flex-col gap-4">
                      <div className="w-full h-64 bg-black border border-[#1f1f1f] relative">
                        <img
                          src={imagePreview}
                          alt="After proof preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setImagePreview(null)}
                          className="absolute top-3 right-3 bg-black/80 hover:bg-black border border-[#ef4444] text-[#ef4444] px-2 py-1 text-[10px] font-mono uppercase"
                        >
                          RETAKE PHOTO
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#a3e635]/60 hover:border-[#a3e635] cursor-pointer bg-black/40 p-10 flex flex-col items-center justify-center gap-3 transition-colors group"
                    >
                      <Camera className="w-8 h-8 text-[#a3e635] group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-display font-bold text-[#a3e635] tracking-wider uppercase">
                        TAP TO CAPTURE PHOTO
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

                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#737373] tracking-wider uppercase mb-1">
                      NOTES ABOUT THE WORK (OPTIONAL)
                    </label>
                    <textarea
                      placeholder="e.g. Cleared all tire trash, swept the pavement fully and verified drain grate flow."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3 text-xs text-white placeholder-[#444444] h-20"
                      style={{ borderRadius: "0px" }}
                    />
                  </div>

                  <button
                    onClick={handleSubmitProof}
                    disabled={!imagePreview || isSubmittingProof || !token}
                    className={`w-full font-display font-bold text-xs py-3.5 tracking-wider uppercase transition-colors ${imagePreview && !isSubmittingProof && token
                      ? "bg-[#a3e635] hover:bg-[#bbf7d0] text-black cursor-pointer"
                      : "bg-[#1f1f1f] text-[#444444] cursor-not-allowed"
                      }`}
                    style={{ borderRadius: "0px" }}
                  >
                    {isSubmittingProof ? "Submitting proof..." : "SUBMIT PROOF →"}
                  </button>
                </div>
              )}

              {/* AI Verification feedback */}
              {verdict && (
                <div className="flex flex-col gap-4">
                  {verdict === "PENDING" && (
                    <div className="bg-[#0c0c0c] border border-[#1f1f1f] border-l-3 border-l-[#a3e635] p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-t-transparent border-[#a3e635] animate-spin inline-block"></div>
                        <h4 className="font-display font-bold text-[#a3e635] text-xs tracking-wider uppercase">
                          AI VALIDATORS ARE REVIEWING YOUR PROOF
                        </h4>
                      </div>
                      <p className="text-xs text-[#737373] font-sans">
                        GenLayer validators are comparing your before and after
                        images. This process usually takes 1-3 minutes.
                      </p>
                      <div className="bg-[#111111] border border-[#1f1f1f] p-3 text-xs font-mono text-[#a3e635] uppercase flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#a3e635] animate-pulse"></span>
                        {statusMessages[statusMsgIndex]}
                      </div>
                    </div>
                  )}

                  {verdict === "approved" && (
                    <div className="bg-[#0a1a00] border border-[#a3e635] p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-[#a3e635] shrink-0" />
                        <div>
                          <h4 className="font-display font-bold text-[#a3e635] text-lg tracking-wider uppercase leading-none">
                            PROOF APPROVED
                          </h4>
                          <span className="text-xs text-white uppercase font-mono tracking-wide mt-1 block">
                            PAYMENT SENT
                          </span>
                        </div>
                      </div>

                      <div className="bg-black/60 p-4 border border-[#1f1f1f] flex justify-between items-center">
                        <span className="text-xs text-[#737373] font-mono">
                          TOKEN REWARD CREDITED
                        </span>
                        <span className="text-2xl font-mono font-bold text-[#a3e635]">
                          +{bounty.reward_gen} GEN
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[#737373] font-mono uppercase">
                          AI VALIDATOR REASONING
                        </span>
                        <p className="text-xs text-[#737373] font-sans italic leading-relaxed bg-black/30 p-3 border border-[#1f1f1f]">
                          "{reasoning || "No reasoning provided."}"
                        </p>
                      </div>

                      <div className="text-[9px] text-[#444444] font-mono flex gap-4 uppercase border-t border-[#1f1f1f]/50 pt-2">
                        <span>CONSENSUS: VALIDATORS</span>
                        <span>CONFIDENCE: {confidence || "—"}</span>
                      </div>
                    </div>
                  )}

                  {verdict === "rejected" && (
                    <div className="bg-[#1a0000] border border-[#ef4444] p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-[#ef4444] shrink-0" />
                        <div>
                          <h4 className="font-display font-bold text-[#ef4444] text-lg tracking-wider uppercase leading-none">
                            PROOF REJECTED
                          </h4>
                          <span className="text-xs text-white uppercase font-mono tracking-wide mt-1 block">
                            REPUTATION PENALTY APPLIED
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[#ef4444] font-mono uppercase">
                          AI OBJECTION REPORT
                        </span>
                        <p className="text-xs text-[#737373] font-sans leading-relaxed bg-black/30 p-3 border border-[#1f1f1f]">
                          {reasoning || "No reasoning provided."}
                        </p>
                      </div>

                      {!showAppealForm ? (
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setVerdict(null);
                              setImagePreview(null);
                              setReasoning("");
                              setConfidence("");
                            }}
                            className="px-4 py-2 bg-transparent border border-[#ef4444] text-[#ef4444] font-display font-bold text-xs uppercase hover:bg-[#ef4444]/10 transition-colors"
                            style={{ borderRadius: "0px" }}
                          >
                            TRY AGAIN
                          </button>
                          <button
                            onClick={() => setShowAppealForm(true)}
                            className="px-4 py-2 bg-transparent border border-white text-white font-display font-bold text-xs uppercase hover:bg-white/10 transition-colors"
                            style={{ borderRadius: "0px" }}
                          >
                            FILE APPEAL
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 border-t border-[#1f1f1f] pt-4">
                          <label className="block text-[10px] font-display font-bold text-[#737373] tracking-wider uppercase">
                            WHY SHOULD THIS BE RECONSIDERED
                          </label>
                          <textarea
                            placeholder="Explain what the validators may have missed"
                            value={appealContext}
                            onChange={(e) => setAppealContext(e.target.value)}
                            className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3 text-xs text-white placeholder-[#444444] h-20"
                            style={{ borderRadius: "0px" }}
                          />

                          {appealImagePreview ? (
                            <div className="w-full h-40 bg-black border border-[#1f1f1f] relative">
                              <img
                                src={appealImagePreview}
                                alt="Appeal evidence"
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => setAppealImagePreview(null)}
                                className="absolute top-2 right-2 bg-black/80 hover:bg-black border border-[#ef4444] text-[#ef4444] px-2 py-1 text-[10px] font-mono uppercase"
                              >
                                REMOVE
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => appealFileInputRef.current?.click()}
                              className="border-2 border-dashed border-white/30 hover:border-white/60 cursor-pointer bg-black/40 p-6 flex flex-col items-center justify-center gap-2 transition-colors"
                            >
                              <Camera className="w-6 h-6 text-white/60" />
                              <span className="text-[10px] font-display font-bold text-white/60 tracking-wider uppercase">
                                ADD EVIDENCE PHOTO (OPTIONAL)
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={appealFileInputRef}
                                onChange={handleAppealFileChange}
                                className="hidden"
                              />
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowAppealForm(false)}
                              className="px-4 py-2 bg-transparent border border-[#1f1f1f] text-[#737373] font-display font-bold text-xs uppercase hover:border-white/40 transition-colors"
                              style={{ borderRadius: "0px" }}
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={handleSubmitAppeal}
                              disabled={!appealContext.trim() || isSubmittingAppeal}
                              className={`px-4 py-2 font-display font-bold text-xs uppercase transition-colors ${appealContext.trim() && !isSubmittingAppeal
                                ? "bg-[#a3e635] hover:bg-[#bbf7d0] text-black cursor-pointer"
                                : "bg-[#1f1f1f] text-[#444444] cursor-not-allowed"
                                }`}
                              style={{ borderRadius: "0px" }}
                            >
                              {isSubmittingAppeal ? "SUBMITTING APPEAL..." : "SUBMIT APPEAL"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {verdict === "inconclusive" && (
                    <div className="bg-[#1a1200] border border-[#f59e0b] p-6 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-[#f59e0b] shrink-0" />
                        <div>
                          <h4 className="font-display font-bold text-[#f59e0b] text-lg tracking-wider uppercase leading-none">
                            VERDICT INCONCLUSIVE
                          </h4>
                          <span className="text-xs text-white uppercase font-mono mt-1 block">
                            INSUFFICIENT PROOF CLARITY
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-[#f59e0b] font-mono uppercase">
                          VALIDATORS REPORT
                        </span>
                        <p className="text-xs text-[#737373] font-sans leading-relaxed bg-black/30 p-3 border border-[#1f1f1f]">
                          {reasoning || "No reasoning provided."}
                        </p>
                      </div>

                      {!showAppealForm ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setVerdict(null);
                              setImagePreview(null);
                              setReasoning("");
                              setConfidence("");
                            }}
                            className="px-4 py-2 bg-transparent border border-white text-white font-display font-bold text-xs uppercase hover:bg-white/10 transition-colors"
                            style={{ borderRadius: "0px" }}
                          >
                            TRY SUBMITTING AGAIN
                          </button>
                          <button
                            onClick={() => setShowAppealForm(true)}
                            className="px-4 py-2 bg-transparent border border-white text-white font-display font-bold text-xs uppercase hover:bg-white/10 transition-colors"
                            style={{ borderRadius: "0px" }}
                          >
                            FILE APPEAL
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 border-t border-[#1f1f1f] pt-4">
                          <label className="block text-[10px] font-display font-bold text-[#737373] tracking-wider uppercase">
                            WHAT SHOULD THE VALIDATORS RECONSIDER
                          </label>
                          <textarea
                            placeholder="Explain what might have been unclear in your original proof"
                            value={appealContext}
                            onChange={(e) => setAppealContext(e.target.value)}
                            className="w-full bg-black border border-[#1f1f1f] focus:border-[#a3e635] focus:outline-none p-3 text-xs text-white placeholder-[#444444] h-20"
                            style={{ borderRadius: "0px" }}
                          />

                          {appealImagePreview ? (
                            <div className="w-full h-40 bg-black border border-[#1f1f1f] relative">
                              <img
                                src={appealImagePreview}
                                alt="Appeal evidence"
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => setAppealImagePreview(null)}
                                className="absolute top-2 right-2 bg-black/80 hover:bg-black border border-[#ef4444] text-[#ef4444] px-2 py-1 text-[10px] font-mono uppercase"
                              >
                                REMOVE
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => appealFileInputRef.current?.click()}
                              className="border-2 border-dashed border-white/30 hover:border-white/60 cursor-pointer bg-black/40 p-6 flex flex-col items-center justify-center gap-2 transition-colors"
                            >
                              <Camera className="w-6 h-6 text-white/60" />
                              <span className="text-[10px] font-display font-bold text-white/60 tracking-wider uppercase">
                                ADD EVIDENCE PHOTO (OPTIONAL)
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={appealFileInputRef}
                                onChange={handleAppealFileChange}
                                className="hidden"
                              />
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowAppealForm(false)}
                              className="px-4 py-2 bg-transparent border border-[#1f1f1f] text-[#737373] font-display font-bold text-xs uppercase hover:border-white/40 transition-colors"
                              style={{ borderRadius: "0px" }}
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={handleSubmitAppeal}
                              disabled={!appealContext.trim() || isSubmittingAppeal}
                              className={`px-4 py-2 font-display font-bold text-xs uppercase transition-colors ${appealContext.trim() && !isSubmittingAppeal
                                  ? "bg-[#a3e635] hover:bg-[#bbf7d0] text-black cursor-pointer"
                                  : "bg-[#1f1f1f] text-[#444444] cursor-not-allowed"
                                }`}
                              style={{ borderRadius: "0px" }}
                            >
                              {isSubmittingAppeal ? "SUBMITTING APPEAL..." : "SUBMIT APPEAL"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="bg-[#111111] border border-[#1f1f1f] p-5 flex flex-col gap-5">
            <h3 className="text-[10px] font-display font-bold text-[#a3e635] tracking-widest uppercase border-b border-[#1f1f1f] pb-3">
              BOUNTY DETAILS
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[10px] text-[#444444] font-mono uppercase block">
                  REWARD AMOUNT
                </span>
                <span className="text-3xl font-mono font-bold text-[#a3e635]">
                  {bounty.reward_gen} GEN
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-[#1f1f1f] pt-4 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-[#444444] uppercase block">
                    CREATOR
                  </span>
                  <span className="text-[#737373] truncate block">
                    {bounty.creator.substring(0, 8)}...
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#444444] uppercase block">
                    CREATED
                  </span>
                  <span className="text-[#737373] block">
                    {new Date(bounty.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#1f1f1f] pt-4 text-xs font-mono">
                <span className="text-[9px] text-[#444444] uppercase block">
                  DEADLINE
                </span>
                <div className="flex items-center gap-1.5 text-[#a3e635] font-bold mt-1">
                  <Clock className="w-4 h-4 text-[#a3e635]" />
                  <span>
                    {bounty.deadline
                      ? new Date(bounty.deadline * 1000).toLocaleString()
                      : "Ends soon"}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#1f1f1f] pt-4 text-xs font-mono">
                <span className="text-[9px] text-[#444444] uppercase block">
                  WORKERS PARTICIPATING
                </span>
                <span className="text-white font-bold block mt-1">
                  {bounty.total_claims} / {bounty.max_workers} CLAIMED
                </span>
              </div>
            </div>

            <div className="border-t border-[#1f1f1f] pt-4">
              {bounty.status === "completed" ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-[#1f1f1f] text-[#737373] font-display font-bold text-xs uppercase tracking-wider text-center cursor-not-allowed"
                  style={{ borderRadius: "0px" }}
                >
                  JOB COMPLETED ✓
                </button>
              ) : isClaimedByMe ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-[#111111] text-[#a3e635] border border-[#a3e635] font-display font-bold text-xs uppercase tracking-wider text-center cursor-default"
                  style={{ borderRadius: "0px" }}
                >
                  JOB CLAIMED ✓
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!wallet) onConnectWallet();
                    else onClaim(bounty.bounty_id);
                  }}
                  className="w-full py-3.5 bg-[#a3e635] hover:bg-[#bbf7d0] text-black font-display font-bold text-xs uppercase tracking-wider text-center transition-colors cursor-pointer"
                  style={{ borderRadius: "0px" }}
                >
                  CLAIM THIS JOB →
                </button>
              )}
              <p className="text-[9px] text-[#444444] font-mono uppercase text-center mt-3 leading-snug">
                Payment releases automatically upon AI approval. No human review
                required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}