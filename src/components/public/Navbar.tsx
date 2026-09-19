import React from 'react';
import { Search } from 'lucide-react';

interface NavbarProps {
  isOpen: boolean;
  onOpenStatusCheck: () => void;
  onScrollToQuests: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isOpen,
  onOpenStatusCheck,
  onScrollToQuests,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262f3d] bg-[#0e1217]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img
            src="/3.png"
            alt="ROBINOS Logo"
            referrerPolicy="no-referrer"
            className="w-9 h-9 sm:w-11 sm:h-11 object-cover rounded-xl border border-[#303a4c] shadow-[0_4px_12px_rgba(0,0,0,0.3)] shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-arcade text-sm sm:text-lg md:text-xl tracking-wider text-[#facc15]">ROBINOS</span>
            </div>
          </div>
        </div>

        {/* Status Indicator & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Status Badge (Tablet / Desktop) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#181d26] border border-[#262f3d] rounded-xl text-xs font-arcade text-[10px]">
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                isOpen ? 'bg-[#facc15] shadow-[0_0_8px_#facc15]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
              }`}
            />
            <span className={isOpen ? 'text-[#facc15]' : 'text-red-400'}>
              {isOpen ? 'EARLY ACCESS OPEN' : 'CLOSED'}
            </span>
          </div>

          {/* Check Status */}
          <button
            id="nav-check-status-btn"
            onClick={onOpenStatusCheck}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-arcade text-[#f0fdf4] bg-[#181d26] hover:bg-[#202734] border border-[#262f3d] hover:border-[#facc15]/50 rounded-xl transition-all shadow-sm"
            title="Check your application status"
          >
            <Search className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
            <span className="hidden xs:inline sm:inline">STATUS</span>
          </button>

          {/* Apply CTA */}
          <button
            id="nav-apply-btn"
            onClick={onScrollToQuests}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-arcade font-bold text-[#121820] bg-[#facc15] hover:bg-[#fde047] rounded-xl shadow-[0_2px_10px_rgba(250,204,21,0.25)] transition-all hover:scale-[1.02] active:scale-[0.99] whitespace-nowrap"
          >
            GET ACCESS
          </button>

        </div>
      </div>
    </header>
  );
};
