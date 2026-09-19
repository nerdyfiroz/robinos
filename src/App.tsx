import React, { useState, useEffect } from 'react';
import { api } from './lib/api.js';
import type { PlatformSettings } from './types.js';
import { Navbar } from './components/public/Navbar.js';
import { Hero } from './components/public/Hero.js';
import { EarlyAccessQuests } from './components/public/EarlyAccessQuests.js';
import { StatusLookupSection } from './components/public/StatusLookupSection.js';
import { ApplicationSuccessModal } from './components/public/ApplicationSuccessModal.js';
import { StatusLookupModal } from './components/public/StatusLookupModal.js';
import { Footer } from './components/public/Footer.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';

export default function App() {
  const [view, setView] = useState<'public' | 'admin'>('public');
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  // Modals state
  const [statusLookupOpen, setStatusLookupOpen] = useState(false);
  const [statusLookupQuery, setStatusLookupQuery] = useState('');
  const [successModalData, setSuccessModalData] = useState<{
    application_id: string;
    wallet_address: string;
    x_username: string;
  } | null>(null);

  // Sync route with window pathname (domain/admin) and hash (#admin)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#admin') {
        setView('admin');
      } else {
        setView('public');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (newView: 'public' | 'admin') => {
    setView(newView);
    if (newView === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

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
      // trigger event
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

  // If viewing admin dashboard
  if (view === 'admin') {
    return (
      <AdminDashboard
        isOpen={isOpen}
        onReturnToPublic={() => navigateTo('public')}
        onRefreshGlobalConfig={fetchSettings}
      />
    );
  }

  // Public Early Access Platform
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#f0fdf4] flex flex-col selection:bg-[#facc15] selection:text-[#121820] overflow-x-hidden w-full max-w-full">
      {/* Top Navigation */}
      <Navbar
        isOpen={isOpen}
        onOpenStatusCheck={scrollToStatusLookup}
        onOpenAdmin={() => navigateTo('admin')}
        onScrollToQuests={scrollToQuests}
      />

      {/* Main Content */}
      <main className="flex-1">
        <Hero
          onCtaClick={scrollToQuests}
          isOpen={isOpen}
          settings={settings}
        />
        <EarlyAccessQuests
          isOpen={isOpen}
          onSuccess={(data) => setSuccessModalData(data)}
        />
        <StatusLookupSection onScrollToQuests={scrollToQuests} />
      </main>

      {/* Footer */}
      <Footer
        onOpenAdmin={() => navigateTo('admin')}
        onOpenStatusCheck={scrollToStatusLookup}
      />

      {/* Success Modal */}
      {successModalData && (
        <ApplicationSuccessModal
          data={successModalData}
          onClose={() => setSuccessModalData(null)}
          onOpenStatusCheck={handleOpenStatusCheckWithId}
        />
      )}

      {/* Status Check Modal */}
      {statusLookupOpen && (
        <StatusLookupModal
          initialQuery={statusLookupQuery}
          onClose={() => {
            setStatusLookupOpen(false);
            setStatusLookupQuery('');
          }}
        />
      )}
    </div>
  );
}
