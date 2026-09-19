'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/src/components/admin/AdminDashboard';
import { api } from '@/src/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data && data.early_access) {
        setIsOpen(Boolean(data.early_access.is_open));
      }
    } catch {
      // Handled
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-[#080b10] text-[#f0fdf4] selection:bg-[#facc15] selection:text-[#121820] overflow-x-hidden w-full">
      <AdminDashboard
        isOpen={isOpen}
        onReturnToPublic={() => router.push('/')}
        onRefreshGlobalConfig={fetchSettings}
      />
    </div>
  );
}

