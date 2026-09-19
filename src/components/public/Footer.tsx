import React from 'react';
import { ExternalLink } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenStatusCheck: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="border-t border-[#262f3d] bg-[#0b0e14] py-8 sm:py-10 text-xs text-[#94a3b8] w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="ROBINOS Logo"
              referrerPolicy="no-referrer"
              className="w-6 h-6 object-cover rounded-md border border-[#303a4c]"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="font-arcade text-base text-[#facc15] tracking-wider">ROBINOS</span>
            <span className="text-[10px] text-[#94a3b8]/60 font-pixel">· BRING ONCHAIN CULTURE BACK</span>
          </div>

          <div className="text-[10px] text-[#94a3b8]/60 text-center sm:text-right font-arcade">
            © {new Date().getFullYear()} ROBINOS NFT. ALL ONCHAIN RIGHTS RESERVED.
          </div>
        </div>
      </div>
    </footer>
  );
};
