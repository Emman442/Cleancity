import { useEffect } from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: "success" | "error" | "warning";
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((toast) => {
        const borderCol = 
          toast.type === "success" ? "border-l-[#a3e635]" :
          toast.type === "error" ? "border-l-[#ef4444]" :
          "border-l-[#f59e0b]";
        
        const Icon = 
          toast.type === "success" ? CheckCircle :
          toast.type === "error" ? AlertCircle :
          AlertTriangle;

        const iconCol = 
          toast.type === "success" ? "text-[#a3e635]" :
          toast.type === "error" ? "text-[#ef4444]" :
          "text-[#f59e0b]";

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`bg-[#111111] border border-[#1f1f1f] ${borderCol} border-l-4 p-4 flex gap-3 items-start justify-between relative transition-all duration-300 shadow-2xl`}
            style={{ borderRadius: "0px" }}
          >
            <div className="flex gap-3">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconCol}`} />
              <div>
                <h4 className="font-display font-semibold text-xs tracking-wider uppercase text-white">
                  {toast.title}
                </h4>
                <p className="text-xs text-[#737373] mt-1 font-sans">
                  {toast.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => onClose(toast.id)}
              className="text-[#444444] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
