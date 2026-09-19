'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';
import type { PlatformSettings } from '@/src/types';
import { Navbar } from '@/src/components/public/Navbar';
import { Hero } from '@/src/components/public/Hero';
import { EarlyAccessQuests } from '@/src/components/public/EarlyAccessQuests';
import { StatusLookupSection } from '@/src/components/public/StatusLookupSection';
import { ApplicationSuccessModal } from '@/src/components/public/ApplicationSuccessModal';
import { StatusLookupModal } from '@/src/components/public/StatusLookupModal';
import { Footer } from '@/src/components/public/Footer';

export default function HomePage() {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Modals state
  const [statusLookupOpen, setStatusLookupOpen] = useState(false);
  const [statusLookupQuery, setStatusLookupQuery] = useState('');
  const [successModalData, setSuccessModalData] = useState<{
    application_id: string;
    wallet_address: string;
    x_username: string;
  } | null>(null);

  // Fetch initial platform settings
  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data) {
        setSettings(data);
        if (data.early_access) {
          setIsOpen(Boolean(data.early_access.is_open));
        }
      }
    } catch {
      // Safe fallback already handled in api.getSettings
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const scrollToQuests = () => {
    const el = document.getElementById('early-access-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToStatusLookup = () => {
    const el = document.getElementById('status-lookup-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      const input = document.getElementById('allocation-lookup-input') as HTMLInputElement | null;
      if (input) {
        setTimeout(() => input.focus(), 400);
      }
    } else {
      setStatusLookupQuery('');
      setStatusLookupOpen(true);
    }
  };

  const handleOpenStatusCheckWithId = (id: string) => {
    setStatusLookupQuery(id);
    const el = document.getElementById('status-lookup-section');
    const input = document.getElementById('allocation-lookup-input') as HTMLInputElement | null;
    if (el && input) {
      input.value = id;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      el.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        const btn = document.getElementById('allocation-lookup-btn');
        btn?.click();
      }, 300);
    } else {
      setStatusLookupOpen(true);
    }
    setSuccessModalData(null);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#f0fdf4] flex flex-col selection:bg-[#facc15] selection:text-[#121820] overflow-x-hidden w-full max-w-full">
      {/* Top Navigation */}
      <Navbar
        isOpen={isOpen}
        onOpenStatusCheck={scrollToStatusLookup}
        onScrollToQuests={scrollToQuests}
      />

      {/* Main Content */}
      <main className="flex-1">
        <Hero
          onCtaClick={scrollToQuests}
          onWalletCheck={scrollToStatusLookup}
          isOpen={isOpen}
          settings={settings}
        />
        <EarlyAccessQuests
          key={refreshKey}
          isOpen={isOpen}
          onSuccess={(data) => setSuccessModalData(data)}
        />
        <StatusLookupSection />
      </main>

      {/* Footer */}
      <Footer onOpenStatusCheck={scrollToStatusLookup} />

      {/* Application Success Celebration Modal */}
      {successModalData && (
        <ApplicationSuccessModal
          data={successModalData}
          onClose={() => setSuccessModalData(null)}
          onOpenStatusCheck={(id) => handleOpenStatusCheckWithId(id)}
        />
      )}

      {/* Direct Status Check Floating Modal */}
      {statusLookupOpen && (
        <StatusLookupModal
          onClose={() => setStatusLookupOpen(false)}
          initialQuery={statusLookupQuery}
        />
      )}
    </div>
  );
}

