import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, Copy, Check, X, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

interface ApplicationSuccessModalProps {
  data: {
    application_id: string;
    wallet_address: string;
    x_username: string;
  };
  onClose: () => void;
  onOpenStatusCheck: (id: string) => void;
}

export const ApplicationSuccessModal: React.FC<ApplicationSuccessModalProps> = ({
  data,
  onClose,
  onOpenStatusCheck,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    // Fire festive green/gold confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ff88', '#2eff9e', '#facc15', '#ffffff'],
      });
    } catch {
      // ignore
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.application_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#141922] border border-[#262f3d] rounded-2xl p-5 sm:p-8 shadow-[0_16px_48px_rgba(0,0,0,0.6)] text-center my-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#facc15] p-1 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#292215] border border-[#6b5118] text-[#facc15] rounded-2xl mx-auto flex items-center justify-center mb-3 sm:mb-4 shadow-[0_4px_16px_rgba(250,204,21,0.2)]">
          <CheckCircle className="w-7 h-7 sm:w-9 sm:h-9" />
        </div>

        <h3 className="font-arcade text-lg sm:text-2xl text-[#facc15] mb-2 break-words uppercase">
          APPLICATION RECEIVED!
        </h3>
        <p className="text-xs text-[#94a3b8] mb-5 sm:mb-6 leading-relaxed">
          Your Early Access application has been logged on the ROBINOS system. The moderation team is verifying task proofs.
        </p>

        {/* Application ID Card */}
        <div className="p-4 bg-[#181d26] border border-[#262f3d] rounded-xl mb-5 sm:mb-6">
          <div className="text-[10px] text-[#94a3b8] font-arcade mb-1">YOUR APPLICATION ID</div>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span className="font-arcade text-xl sm:text-2xl text-[#facc15] tracking-wider">
              {data.application_id}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 bg-[#222a38] hover:bg-[#2e394b] border border-[#303a4c] text-[#facc15] rounded-lg transition-colors"
              title="Copy Application ID"
            >
              {copied ? <Check className="w-4 h-4 text-[#facc15]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {copied && <p className="text-[10px] text-[#facc15] mt-1 font-arcade">COPIED TO CLIPBOARD!</p>}
        </div>

        {/* Metadata summary */}
        <div className="text-left text-xs bg-[#181d26] border border-[#262f3d] rounded-xl p-3.5 space-y-2 mb-5 sm:mb-6 font-code">
          <div className="flex justify-between gap-2">
            <span className="text-[#94a3b8] shrink-0 font-sans text-[11px]">WALLET:</span>
            <span className="text-[#f0fdf4] truncate max-w-[150px] sm:max-w-[240px]">{data.wallet_address}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#94a3b8] shrink-0 font-sans text-[11px]">X ACCOUNT:</span>
            <span className="text-[#facc15] truncate">{data.x_username}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#94a3b8] shrink-0 font-sans text-[11px]">STATUS:</span>
            <span className="px-2 py-0.5 bg-[#292215] text-[#facc15] border border-[#6b5118] rounded text-[10px] font-arcade">
              PENDING
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button
            onClick={() => onOpenStatusCheck(data.application_id)}
            className="flex-1 py-3 text-xs font-arcade font-bold text-[#121820] bg-[#facc15] hover:bg-[#fde047] rounded-xl flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(250,204,21,0.25)] transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            <span>CHECK REAL-TIME STATUS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="py-3 px-6 text-xs font-arcade text-[#94a3b8] hover:text-[#f0fdf4] bg-[#181d26] hover:bg-[#202734] border border-[#262f3d] rounded-xl transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
