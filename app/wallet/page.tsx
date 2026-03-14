'use client';

import WalletView from '@/components/views/WalletView';
import { LegalProvider } from '@/lib/context/LegalContext';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const router = useRouter();

  return (
    <LegalProvider>
      <div className="min-h-screen pt-28 pb-24 px-6 lg:px-12 max-w-[2200px] mx-auto">
        <WalletView onNavigate={(v) => router.push(v === 'auth' ? '/auth' : '/')} />
      </div>
    </LegalProvider>
  );
}
