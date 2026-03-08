'use client';

import { useRouter } from 'next/navigation';
import MyProfileView from '@/components/views/MyProfileView';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { LegalProvider } from '@/lib/context/LegalContext';

export default function MyProfilePage() {
  const router = useRouter();

  return (
    <LegalProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-amber-50">
        <Header
          onAssistantClick={() => {}}
          currentView="myprofile"
          onNavigate={(view) => router.push(view === 'home' ? '/' : `/${view}`)}
          assistantOpen={false}
          isLoggedIn={true}
          tokens={0}
          userName=""
          isAdmin={false}
        />
        <main className="flex-1 pb-20 md:pb-6">
          <MyProfileView />
        </main>
        <Footer onNavigate={(view) => router.push(view === 'home' ? '/' : `/${view}`)} />
        <div className="md:hidden">
          <BottomNav
            currentView="myprofile"
            isLoggedIn={true}
            onNavigate={(view) => {
              if (view === 'myprofile') return;
              router.push(view === 'home' ? '/' : `/${view}`);
            }}
          />
        </div>
      </div>
    </LegalProvider>
  );
}
