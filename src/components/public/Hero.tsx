'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown, Wallet } from 'lucide-react';
import type { PlatformSettings } from '../../types';

interface HeroProps {
  onCtaClick: () => void;
  onWalletCheck: () => void;
  isOpen: boolean;
  settings?: PlatformSettings | null;
}

// Custom inline SVG icons for X (Twitter) and OpenSea for authentic branding
const XIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`fill-currentColor ${className}`}
    fill="currentColor"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Authentic OpenSea Logomark with brand blue circle (#2081E2) and white boat
const OpenSeaIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="12" fill="#2081E2" />
    <path
      d="M5.92 12.403l.051-.081 3.123-4.884a.107.107 0 0 1 .187.014c.52 1.169.972 2.623.76 3.528-.088.372-.335.876-.614 1.342a2.405 2.405 0 0 1-.117.199.106.106 0 0 1-.09.045H6.013a.106.106 0 0 1-.091-.163zm13.914 1.68a.109.109 0 0 1-.065.101c-.243.103-1.07.485-1.414.962-.878 1.222-1.548 2.97-3.048 2.97H9.053a4.019 4.019 0 0 1-4.013-4.028v-.072c0-.058.048-.106.108-.106h3.485c.07 0 .12.063.115.132-.026.226.017.459.125.67.206.42.636.682 1.099.682h1.726v-1.347H9.99a.11.11 0 0 1-.089-.173l.063-.09c.16-.231.391-.586.621-.992.156-.274.308-.566.43-.86.024-.052.043-.107.065-.16.033-.094.067-.182.091-.269a4.57 4.57 0 0 0 .065-.223c.057-.25.081-.514.081-.787 0-.108-.004-.221-.014-.327-.005-.117-.02-.235-.034-.352a3.415 3.415 0 0 0-.048-.312 6.494 6.494 0 0 0-.098-.468l-.014-.06c-.03-.108-.056-.21-.09-.317a11.824 11.824 0 0 0-.328-.972 5.212 5.212 0 0 0-.142-.355c-.072-.178-.146-.339-.213-.49a3.564 3.564 0 0 1-.094-.197 4.658 4.658 0 0 0-.103-.213c-.024-.053-.053-.104-.072-.152l-.211-.388c-.029-.053.019-.118.077-.101l1.32.357h.01l.173.05.192.054.07.019v-.783c0-.379.302-.686.679-.686a.66.66 0 0 1 .477.202.69.69 0 0 1 .2.484V6.65l.141.039c.01.005.022.01.031.017.034.024.084.062.147.11.05.038.103.086.165.137a10.351 10.351 0 0 1 .574.504c.214.199.454.432.684.691.065.074.127.146.192.226.062.079.132.156.19.232.079.104.16.212.235.324.033.053.074.108.105.161.096.142.178.288.257.435.034.067.067.141.096.213.089.197.159.396.202.598a.65.65 0 0 1 .029.132v.01c.014.057.019.12.024.184a2.057 2.057 0 0 1-.106.874c-.031.084-.06.17-.098.254-.075.17-.161.343-.264.502-.034.06-.075.122-.113.182-.043.063-.089.123-.127.18a3.89 3.89 0 0 1-.173.221c-.053.072-.106.144-.166.209-.081.098-.16.19-.245.278-.048.058-.1.118-.156.17-.052.06-.108.113-.156.161-.084.084-.15.147-.208.202l-.137.122a.102.102 0 0 1-.072.03h-1.051v1.346h1.322c.295 0 .576-.104.804-.298.077-.067.415-.36.816-.802a.094.094 0 0 1 .05-.03l3.65-1.057a.108.108 0 0 1 .138.103z"
      fill="#FFFFFF"
    />
  </svg>
);

export const Hero: React.FC<HeroProps> = ({ onCtaClick, onWalletCheck, isOpen, settings }) => {
  // Mint target: September 24, 2026 at 6:30 PM UTC+6 (12:30:00 UTC)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      // Target: September 24, 2026 at 18:30 UTC+6 (12:30:00 UTC)
      const target = Date.UTC(2026, 8, 24, 12, 30, 0);
      const diff = Math.max(0, target - Date.now());

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const collection = settings?.collection || {
    name: 'ROBINOS',
    supply: 5555,
    mint_price: '0.0004 ETH (~$1)',
    chain: 'Robinhood',
    launch_date: '24th Sept',
    x_url: 'https://x.com/RobinosNFT',
    opensea_status: 'Live',
    opensea_url: 'https://opensea.io/collection/robinosnft/overview',
  };

  const rawLaunch = collection.launch_date?.trim();
  const displayLaunchDate =
    rawLaunch && rawLaunch !== 'SEPTEMBER_' && rawLaunch !== 'September_'
      ? rawLaunch
      : '24th Sept';

  const openseaUrl =
    collection.opensea_url &&
    collection.opensea_url !== 'https://opensea.io/collection/robinos-nft'
      ? collection.opensea_url
      : 'https://opensea.io/collection/robinosnft/overview';

  const isMintLive =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0;

  return (
    <section className="relative overflow-hidden py-10 sm:py-16 lg:py-20 border-b border-[#262f3d] bg-grid-pattern w-full">
      {/* Glow highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-[#facc15]/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="text-center max-w-4xl mx-auto">
          {/* Official Robinos Character Avatar */}
          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="relative">
              <div className="absolute -inset-1 bg-[#facc15]/20 blur-md rounded-2xl"></div>
              <img
                src="/3.png"
                alt="ROBINOS NFT Character"
                referrerPolicy="no-referrer"
                className="relative w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl border-2 border-[#facc15] shadow-[0_8px_24px_rgba(250,204,21,0.25)] mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>

          {/* Main Title */}
          <h1 className="font-arcade text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#facc15] mb-3 sm:mb-4 drop-shadow-[0_4px_16px_rgba(250,204,21,0.25)] break-words uppercase">
            {collection.name || 'ROBINOS'}
          </h1>

          {/* Subtitle */}
          <p className="font-pixel text-xs sm:text-lg md:text-2xl text-[#cbd5e1] tracking-normal sm:tracking-wide mb-6 sm:mb-8 break-words">
            BRING ONCHAIN CULTURE BACK.
          </p>

          {/* Redesigned Clean Collection Details */}
          <div className="my-6 max-w-2xl mx-auto bg-[#181d26] border border-[#262f3d] rounded-2xl p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#262f3d]">
              <div className="pt-2 sm:pt-0 sm:px-2">
                <div className="text-[10px] text-[#94a3b8] font-arcade uppercase tracking-wider mb-1">
                  SUPPLY
                </div>
                <div className="font-pixel text-base sm:text-lg text-[#facc15] font-bold">
                  {collection.supply ? collection.supply.toLocaleString() : '5,555'}
                </div>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-2">
                <div className="text-[10px] text-[#94a3b8] font-arcade uppercase tracking-wider mb-1">
                  PRICE
                </div>
                <div className="font-pixel text-xs sm:text-sm text-[#f0fdf4] font-bold">
                  {collection.mint_price || '0.0004 ETH'}
                </div>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-2">
                <div className="text-[10px] text-[#94a3b8] font-arcade uppercase tracking-wider mb-1">
                  CHAIN
                </div>
                <div className="font-pixel text-xs sm:text-sm text-[#f0fdf4] font-bold uppercase truncate">
                  {collection.chain || 'ROBINHOOD'}
                </div>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-2">
                <div className="text-[10px] text-[#94a3b8] font-arcade uppercase tracking-wider mb-1">
                  LAUNCH
                </div>
                <div className="font-pixel text-xs sm:text-sm text-[#facc15] font-bold uppercase truncate">
                  {displayLaunchDate}
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Clock (Pixelated) */}
          <div className="flex flex-col items-center justify-center my-3 sm:my-4">
            <div className="text-[10px] sm:text-xs text-[#94a3b8] font-arcade tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isMintLive ? 'bg-green-400 animate-ping' : 'bg-[#facc15] animate-pulse'}`} />
              <span>{isMintLive ? 'MINT IS LIVE' : 'MINT STARTS IN (24TH SEPT · 12:30 UTC)'}</span>
            </div>
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-4 md:gap-6 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#181d26] border border-[#262f3d] rounded-2xl max-w-full shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              <div className="text-center min-w-[42px] sm:min-w-[55px]">
                <div className="font-arcade text-sm sm:text-xl md:text-2xl text-[#facc15]">{String(timeLeft.days).padStart(2, '0')}</div>
                <div className="text-[8px] sm:text-[9px] text-[#94a3b8] mt-0.5 font-arcade">DAYS</div>
              </div>
              <span className="text-[#facc15]/60 font-arcade text-xs sm:text-base">:</span>
              <div className="text-center min-w-[42px] sm:min-w-[55px]">
                <div className="font-arcade text-sm sm:text-xl md:text-2xl text-[#facc15]">{String(timeLeft.hours).padStart(2, '0')}</div>
                <div className="text-[8px] sm:text-[9px] text-[#94a3b8] mt-0.5 font-arcade">HOURS</div>
              </div>
              <span className="text-[#facc15]/60 font-arcade text-xs sm:text-base">:</span>
              <div className="text-center min-w-[42px] sm:min-w-[55px]">
                <div className="font-arcade text-sm sm:text-xl md:text-2xl text-[#facc15]">{String(timeLeft.minutes).padStart(2, '0')}</div>
                <div className="text-[8px] sm:text-[9px] text-[#94a3b8] mt-0.5 font-arcade">MINUTES</div>
              </div>
              <span className="text-[#facc15]/60 font-arcade text-xs sm:text-base">:</span>
              <div className="text-center min-w-[42px] sm:min-w-[55px]">
                <div className="font-arcade text-sm sm:text-xl md:text-2xl text-[#facc15]">{String(timeLeft.seconds).padStart(2, '0')}</div>
                <div className="text-[8px] sm:text-[9px] text-[#94a3b8] mt-0.5 font-arcade">SECONDS</div>
              </div>
            </div>
          </div>

          {/* CTA & Social Actions: Early Access, X (Twitter), and OpenSea */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full max-w-xl mx-auto">
            {/* Primary Access CTA */}
            <button
              id="hero-get-early-access-btn"
              onClick={onCtaClick}
              className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-arcade font-bold tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(250,204,21,0.25)] transition-all hover:scale-[1.02] active:scale-[0.99] ${
                isOpen
                  ? 'bg-[#facc15] hover:bg-[#fde047] text-[#121820]'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)]'
              }`}
            >
              <span>{isOpen ? 'GET EARLY ACCESS' : 'EARLY ACCESS CLOSED'}</span>
              <ArrowDown className="w-4 h-4 animate-bounce shrink-0" />
            </button>

            {/* Wallet Status Lookup */}
            <button
              type="button"
              id="hero-check-wallet-btn"
              onClick={onWalletCheck}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm font-arcade font-bold tracking-wider text-[#f0fdf4] bg-[#181d26] hover:bg-[#202734] border border-[#262f3d] hover:border-[#facc15]/50 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.02] active:scale-[0.99]"
              title="Check wallet status"
            >
              <Wallet className="w-4 h-4 text-[#facc15]" />
              <span>WALLET CHECKER</span>
            </button>

            {/* X (Twitter) Link with X Icon - Icon only, no text */}
            <a
              id="hero-x-link"
              href={collection.x_url || 'https://x.com/RobinosNFT'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Robinos on X"
              className="p-3.5 sm:p-4 text-[#f0fdf4] bg-[#181d26] hover:bg-[#202734] border border-[#262f3d] hover:border-[#facc15]/50 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all group hover:scale-105 active:scale-95 shrink-0"
              title="Robinos on X"
            >
              <XIcon className="w-5 h-5 text-[#f0fdf4] group-hover:text-[#facc15] transition-colors" />
            </a>

            {/* OpenSea Link - Direct link to official OpenSea collection */}
            <a
              id="hero-opensea-btn"
              href={openseaUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Robinos on OpenSea"
              className="p-3.5 sm:p-4 text-[#f0fdf4] bg-[#181d26] hover:bg-[#202734] border border-[#262f3d] hover:border-[#2081E2]/60 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all group hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              title="Robinos on OpenSea"
            >
              <OpenSeaIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

