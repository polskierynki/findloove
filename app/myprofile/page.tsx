'use client';

import NewMyProfileView from '@/components/views/NewMyProfileView';
import { LegalProvider } from '@/lib/context/LegalContext';

export default function MyProfilePage() {
  return (
    <LegalProvider>
      <div className="min-h-screen">
        <NewMyProfileView />
      </div>
    </LegalProvider>
  );
}
