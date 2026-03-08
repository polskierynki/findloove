'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

import { AppView, ViewType, Profile, LookingForCategory, SupabaseProfile, mapSupabaseProfile } from '@/lib/types';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useLikes } from '@/lib/hooks/useLikes';
import { useGuestRestrictions } from '@/lib/hooks/useGuestRestrictions';
import { useProfileCompletion } from '@/lib/hooks/useProfileCompletion';
import { LegalProvider } from '@/lib/context/LegalContext';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import Notification from '@/components/layout/Notification';
import AIAssistant from '@/components/layout/AIAssistant';
import GuestModal from '@/components/layout/GuestModal';
import GuestBanner from '@/components/layout/GuestBanner';
import ProfileCompletionModal from '@/components/layout/ProfileCompletionModal';
import PasswordResetModal from '@/components/layout/PasswordResetModal';

import HomeView from '@/components/views/HomeView';
import AdminDashboard from '@/components/views/AdminDashboard';
import DiscoverView from '@/components/views/DiscoverView';
import ProfileDetailView from '@/components/views/ProfileDetailView';
import MessagesView from '@/components/views/MessagesView';
import SafetyView from '@/components/views/SafetyView';
import LikesView from '@/components/views/LikesView';
import SearchView from '@/components/views/SearchView';
import AuthView from '@/components/views/AuthView';
import RegisterView from '@/components/views/RegisterView';
import PremiumView from '@/components/views/PremiumView';
import TermsView from '@/components/views/TermsView';
import PrivacyView from '@/components/views/PrivacyView';
import CookiesView from '@/components/views/CookiesView';
import MyProfileView from '@/components/views/MyProfileView';

const PREMIUM_LOCAL_STORAGE_KEY = 'zl_premium_demo';
const PREMIUM_DEMO_DAYS = 30;

function readLocalPremiumFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PREMIUM_LOCAL_STORAGE_KEY) === '1';
}

function isPremiumActiveFromProfile(profile: {
  is_premium?: boolean | null;
  premium_until?: string | null;
} | null): boolean {
  if (!profile) return false;
  const premiumUntilTs = profile.premium_until
    ? new Date(profile.premium_until).getTime()
    : 0;
  const premiumByDate = premiumUntilTs > Date.now();
  return Boolean(profile.is_premium) || premiumByDate;
}

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Premium i limity randek
  const [isPremium, setIsPremium] = useState(false); // tymczasowo, docelowo z profilu
  const [speedDates, setSpeedDates] = useState<number[]>([]); // timestamps randek w ms
  // Listen for admin dashboard event
  useEffect(() => {
    const handler = () => setShowAdminDashboard(true);
    window.addEventListener('admin-dashboard', handler);
    return () => window.removeEventListener('admin-dashboard', handler);
  }, []);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const adminEmail = 'lio1985lodz@gmail.com';
  const adminProfileId = '00000000-0000-0000-0000-000000000001';
  const isAdminRef = useRef(false);
  const [discoverIndex, setDiscoverIndex] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchLookingFor, setSearchLookingFor] = useState<LookingForCategory | undefined>(undefined);
  const [showPremiumView, setShowPremiumView] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const hideGuestModalOnAuthViews = view === 'auth' || view === 'register';

  /* ─── Auth & token state ─── */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [userName, setUserName] = useState('');
  const [unlockedGalleries, setUnlockedGalleries] = useState<string[]>([]);
  const { profiles, loading } = useProfiles();

  // Helper to handle session and admin redirect
  async function handleSession(session: Session | null) {
    if (session && session.user) {
      setIsLoggedIn(true);
      setUserName(session.user.email || '');

      // Odczyt statusu premium (profil + fallback localStorage)
      const localPremium = readLocalPremiumFlag();
      let premiumFromProfile = false;
      try {
        let premiumProfile: SupabaseProfile | null = null;

        const { data: profileById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileById) {
          premiumProfile = profileById as SupabaseProfile;
        } else if (session.user.email) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', session.user.email)
            .maybeSingle();
          premiumProfile = (profileByEmail as SupabaseProfile) || null;
        }

        premiumFromProfile = isPremiumActiveFromProfile(premiumProfile);
      } catch (premiumError) {
        console.error('Nie udało się pobrać statusu premium:', premiumError);
      }

      setIsPremium(premiumFromProfile || localPremium);

      // Check for admin
      if (session.user.email === adminEmail) {
        isAdminRef.current = true;
        setIsAdmin(true);
        // Pobierz profil admina bezpośrednio z bazy (nie używamy filtrowanej listy profiles)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', adminProfileId)
          .single();
        
        if (data) {
          const adminProfile = mapSupabaseProfile(data as SupabaseProfile);
          setSelectedProfile(adminProfile);
          setView('admin');
        }
      } else {
        isAdminRef.current = false;
        setIsAdmin(false);
      }
    } else {
      setIsLoggedIn(false);
      setUserName('');
      isAdminRef.current = false;
      setIsAdmin(false);
      setIsPremium(false);
    }
  }

  // Supabase auth state effect
  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };
    getSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Obsługa resetowania hasła
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
      handleSession(session);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const [unlockedLikes, setUnlockedLikes] = useState(false);

  const spendToken = (): boolean => {
    if (tokens <= 0) return false;
    setTokens(t => t - 1);
    return true;
  };

  const spendTokens = (amount: number): boolean => {
    if (tokens < amount) return false;
    setTokens(t => t - amount);
    return true;
  };

  const unlockGallery = (id: string) => {
    if (spendToken()) setUnlockedGalleries(prev => [...prev, id]);
  };

  const unlockLikes = () => {
    if (spendTokens(2)) setUnlockedLikes(true);
  };

  // Guest restrictions hook
  const guestRestrictions = useGuestRestrictions(isLoggedIn);

  // Profile completion restrictions hook
  const profileCompletion = useProfileCompletion(isLoggedIn);

  // Funkcja do sprawdzania limitu randek (3/h dla darmowych)
  const canStartSpeedDate = () => {
    if (isPremium) return true;
    const now = Date.now();
    // Ostatnia godzina
    const lastHour = speedDates.filter(ts => now - ts < 60 * 60 * 1000);
    return lastHour.length < 3;
  };

  // Wywołaj przy rozpoczęciu randki
  const registerSpeedDate = () => {
    setSpeedDates(dates => [...dates, Date.now()]);
  };

  const { likeProfile } = useLikes();

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const nextProfile = () => {
    setDiscoverIndex((prev) => (prev + 1) % profiles.length);
  };

  const openProfile = (profile: Profile) => {
    // Track click for guest users
    if (!isLoggedIn) {
      guestRestrictions.trackClick();
    }
    setSelectedProfile(profile);
    setView('profile');
  };

  const openMessages = (profile?: Profile) => {
    if (!isLoggedIn) {
      notify('Zaloguj się lub zarejestruj, aby korzystać z czatu.');
      setView('auth');
      return;
    }
    if (profile) setSelectedProfile(profile);
    setView('messages');
  };

  useEffect(() => {
    if (!isLoggedIn && view === 'messages') {
      setView('auth');
    }
  }, [isLoggedIn, view]);

  const searchFor = (cat: LookingForCategory) => {
    setSearchLookingFor(cat);
    setView('search');
  };

  const activatePremiumDemo = async () => {
    const premiumUntil = new Date(Date.now() + PREMIUM_DEMO_DAYS * 24 * 60 * 60 * 1000).toISOString();

    setIsPremium(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREMIUM_LOCAL_STORAGE_KEY, '1');
    }

    setShowPremiumView(false);
    setView('discover');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const updatePayload = {
        is_premium: true,
        premium_until: premiumUntil,
      };

      let targetProfileId: string | null = null;

      if (session?.user?.id) {
        const { data: updatedById } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', session.user.id)
          .select('id')
          .maybeSingle();

        if (updatedById?.id) {
          targetProfileId = updatedById.id as string;
        }
      }

      if (!targetProfileId && session?.user?.email) {
        const { data: updatedByEmail } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('email', session.user.email)
          .select('id')
          .maybeSingle();

        if (updatedByEmail?.id) {
          targetProfileId = updatedByEmail.id as string;
        }
      }

      // Opcjonalny zapis audytowy aktywacji Premium Demo
      if (targetProfileId) {
        const nowIso = new Date().toISOString();

        const { data: insertedSubscription } = await supabase
          .from('subscriptions')
          .insert({
            profile_id: targetProfileId,
            provider: 'manual',
            plan_code: 'premium_demo',
            status: 'active',
            amount_gross: 0,
            currency: 'PLN',
            current_period_start: nowIso,
            current_period_end: premiumUntil,
            provider_customer_id: session?.user?.id || null,
            provider_subscription_id: `demo-${targetProfileId}-${Date.now()}`,
          })
          .select('id')
          .maybeSingle();

        await supabase
          .from('subscription_events')
          .insert({
            subscription_id: insertedSubscription?.id || null,
            provider: 'manual',
            event_type: 'premium_demo_activated',
            event_id: `premium-demo-${Date.now()}`,
            payload: {
              profile_id: targetProfileId,
              premium_until: premiumUntil,
            },
          });
      }
    } catch (error) {
      console.error('Nie udalo sie zapisac Premium Demo w bazie:', error);
    }

    notify('Premium aktywowane (demo)! Odblokowano Asystenta AI i limity Premium.');
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollTimer = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }, 80);

    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [view]);

  return (
    <LegalProvider>
      <div className="min-h-screen bg-[#FDFCF9] text-slate-900 pb-24 md:pb-10 text-base selection:bg-rose-100">
        {notification && <Notification message={notification} />}

      <Header
        onAssistantClick={() => setChatOpen((v) => !v)}
        assistantOpen={chatOpen}
        currentView={view}
        onNavigate={(v) => {
          setShowPremiumView(false);
          setView(v);
        }}
        isLoggedIn={isLoggedIn}
        tokens={tokens}
        userName={userName}
        isAdmin={isAdmin}
      />

      <main className="max-w-6xl mx-auto px-6 pt-12">
        {showPremiumView ? (
          <PremiumView
            isPremium={isPremium}
            onBack={() => setShowPremiumView(false)}
            onActivatePremium={activatePremiumDemo}
          />
        ) : showAdminDashboard ? (
          <AdminDashboard />
        ) : (
          <>
            {loading && (
              <div className="flex items-center justify-center h-64 text-slate-400 text-2xl">
                Ładowanie profili...
              </div>
            )}
            {!loading && view === 'admin' && isAdmin && (
              <AdminDashboard />
            )}
            {!loading && view === 'home' && (
              <HomeView
                profiles={profiles}
                onNavigate={setView}
                onSelectProfile={openProfile}
                onSearchFor={searchFor}
                userName={userName}
                isLoggedIn={isLoggedIn}
                guestRestrictions={guestRestrictions}
                profileCompletion={profileCompletion}
                onShowCompletionModal={() => setShowCompletionModal(true)}
              />
            )}
            {view === 'auth' && (
              <AuthView
                onBack={() => setView('home')}
                onNotify={notify}
                onRegister={() => setView('register')}
              />
            )}
            {!loading && view === 'discover' && (
              isLoggedIn ? (
                <DiscoverView
                  profiles={profiles}
                  discoverIndex={discoverIndex}
                  onNext={nextProfile}
                  onLike={async (profile) => {
                    await likeProfile(profile.id);
                    notify(`Polubiono profil: ${profile.name}!`);
                  }}
                  onViewProfile={openProfile}
                  onOpenMessages={openMessages}
                  onOpenPremium={() => setShowPremiumView(true)}
                  isPremium={isPremium}
                  canStartSpeedDate={canStartSpeedDate}
                  registerSpeedDate={registerSpeedDate}
                />
              ) : (
                <div className="max-w-2xl mx-auto bg-white px-8 py-24 md:py-32 rounded-3xl border border-slate-100 text-center text-slate-500 space-y-10 animate-in fade-in duration-300 flex flex-col items-center justify-center min-h-[60vh]">
                  <div className="text-3xl font-bold text-slate-700 mb-4">Tylko dla zalogowanych</div>
                  <div className="text-lg mb-10 max-w-xl mx-auto">Aby skorzystać z trybu szybkich randek, musisz być zalogowany lub zarejestrowany.<br/>Zaloguj się, aby odkryć nowe znajomości!</div>
                  <button
                    className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-10 py-4 rounded-2xl text-lg font-bold shadow-lg inline-flex items-center gap-2 transition-all duration-200"
                    onClick={() => setView('auth')}
                  >
                    Zaloguj się lub zarejestruj
                  </button>
                </div>
              )
            )}
            {view === 'profile' && selectedProfile && (
              <ProfileDetailView
                profile={selectedProfile}
                onBack={() => setView('home')}
                onMessage={() => openMessages()}
                onContactRequest={(name) => notify(`Wysłano prośbę o kontakt do: ${name}`)}
                onNotify={notify}
                isLoggedIn={isLoggedIn}
                tokens={tokens}
                onSpendToken={spendToken}
                unlockedGalleries={unlockedGalleries}
                onUnlockGallery={unlockGallery}
                onLoginRequest={() => setView('auth')}
                isAdmin={userName === adminEmail}
                guestRestrictions={guestRestrictions}
                onGuestFeatureBlock={guestRestrictions.triggerFeatureModal}
              />
            )}
            {view === 'myprofile' && (
              <MyProfileView />
            )}
            {view === 'messages' && (
              <MessagesView
                selectedProfile={selectedProfile}
                onBack={() => setView('home')}
                onNotify={notify}
                isLoggedIn={isLoggedIn}
                isPremium={isPremium}
                tokens={tokens}
                onSpendToken={spendToken}
                onLoginRequest={() => setView('auth')}
              />
            )}
            {view === 'safety' && <SafetyView onBack={() => setView('home')} />}
            {view === 'register' && (
              <RegisterView
                onBack={() => setView('auth')}
                onComplete={(registeredName) => {
                  setIsLoggedIn(true);
                  setTokens(3);
                  setUserName(registeredName);
                  notify(`Witaj, ${registeredName}! 🎉 Otrzymujesz 3 Serduszka na start!`);
                  setView('home');
                }}
              />
            )}
            {!loading && view === 'search' && (
              <SearchView
                profiles={profiles}
                onSelectProfile={openProfile}
                onBack={() => setView('home')}
                initialLookingFor={searchLookingFor}
                guestRestrictions={guestRestrictions}
              />
            )}
            {!loading && view === 'likes' && (
              <LikesView
                profiles={profiles}
                onBack={() => setView('home')}
                onMessage={openMessages}
                isLoggedIn={isLoggedIn}
                isPremium={isPremium}
                tokens={tokens}
                onSpendToken={() => spendTokens(2)}
                onUnlockLikes={unlockLikes}
                unlockedLikes={unlockedLikes || isPremium}
                onLoginRequest={() => setView('auth')}
              />
            )}
            {view === 'terms' && <TermsView onBack={() => setView('home')} />}
            {view === 'privacy' && <PrivacyView onBack={() => setView('home')} />}
            {view === 'cookies' && <CookiesView onBack={() => setView('home')} />}
          </>
        )}
      </main>
      <Footer
        onNavigate={(v) => {
          setShowPremiumView(false);
          setView(v);
        }}
      />
      <div className="md:hidden">
        <BottomNav
          currentView={view}
          isLoggedIn={isLoggedIn}
          onNavigate={(v) => {
            setShowPremiumView(false);
            setView(v);
          }}
        />
      </div>
      <AIAssistant isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      
      {/* Guest restrictions components */}
      {!isLoggedIn && (
        <>
          {!hideGuestModalOnAuthViews && (
            <GuestModal
              isOpen={guestRestrictions.showModal || guestRestrictions.showTimeoutModal || guestRestrictions.showFeatureModal}
              onClose={guestRestrictions.closeModal}
              onRegister={() => {
                guestRestrictions.closeModal();
                setView('register');
              }}
              onLogin={() => {
                guestRestrictions.closeModal();
                setView('auth');
              }}
              variant={
                guestRestrictions.showFeatureModal ? 'feature' : 
                guestRestrictions.showTimeoutModal ? 'timeout' : 
                'clicks'
              }
              featureName={guestRestrictions.featureName}
            />
          )}
          {!hideGuestModalOnAuthViews && (
            <GuestBanner
              onRegister={() => setView('register')}
              clickCount={guestRestrictions.clickCount}
              maxClicks={guestRestrictions.maxClicks}
            />
          )}
        </>
      )}

        {/* Profile completion modal for logged-in users */}
        {isLoggedIn && (
          <ProfileCompletionModal
            isOpen={showCompletionModal}
            onClose={() => setShowCompletionModal(false)}
            completionLevel={profileCompletion.completionLevel}
            onGoToProfile={() => {
              setShowCompletionModal(false);
              setView('myprofile');
            }}
          />
        )}

        {/* Password reset modal */}
        {showPasswordReset && (
          <PasswordResetModal
            onClose={() => setShowPasswordReset(false)}
            onSuccess={(msg) => {
              notify(msg);
              setShowPasswordReset(false);
            }}
            onError={(msg) => {
              notify(msg);
            }}
          />
        )}
      </div>
    </LegalProvider>
  );
}
