'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

import { AppView, ViewType, Profile, LookingForCategory, SupabaseProfile, mapSupabaseProfile } from '@/lib/types';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useLikes } from '@/lib/hooks/useLikes';
import { useGuestRestrictions } from '@/lib/hooks/useGuestRestrictions';
import { useProfileCompletion } from '@/lib/hooks/useProfileCompletion';
import { LegalProvider } from '@/lib/context/LegalContext';

import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import Notification from '@/components/layout/Notification';
import AIAssistant from '@/components/layout/AIAssistant';
import GuestModal from '@/components/layout/GuestModal';
import GuestBanner from '@/components/layout/GuestBanner';
import ProfileCompletionModal from '@/components/layout/ProfileCompletionModal';

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

const ROUTABLE_APP_VIEWS: AppView[] = [
  'home',
  'discover',
  'profile',
  'messages',
  'safety',
  'likes',
  'search',
  'auth',
  'register',
  'terms',
  'privacy',
  'cookies',
  'admin',
  'myprofile',
];

function isRoutableAppView(value: string | null): value is AppView {
  return Boolean(value) && ROUTABLE_APP_VIEWS.includes(value as AppView);
}

const STATIC_PATH_TO_VIEW: Record<string, AppView> = {
  '/': 'home',
  '/discover': 'discover',
  '/messages': 'messages',
  '/safety': 'safety',
  '/likes': 'likes',
  '/search': 'search',
  '/auth': 'auth',
  '/register': 'register',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/cookies': 'cookies',
  '/admin': 'admin',
  '/myprofile': 'myprofile',
};

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

function extractProfileIdFromPath(pathname: string): string | null {
  const normalizedPath = normalizePathname(pathname);
  if (!normalizedPath.startsWith('/profile/')) return null;

  const parts = normalizedPath.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  try {
    return decodeURIComponent(parts[1]);
  } catch {
    return parts[1];
  }
}

function getViewFromPathname(pathname: string): AppView | null {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === '/profile' || normalizedPath.startsWith('/profile/')) {
    return 'profile';
  }

  return STATIC_PATH_TO_VIEW[normalizedPath] || null;
}

function getPathForView(view: AppView, profileId?: string | null): string {
  if (view === 'home') return '/';
  if (view === 'profile') {
    return profileId ? `/profile/${encodeURIComponent(profileId)}` : '/profile';
  }
  return `/${view}`;
}

export default function App() {
  const router = useRouter();
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
  const applyingUrlStateRef = useRef(false);
  const [discoverIndex, setDiscoverIndex] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchLookingFor, setSearchLookingFor] = useState<LookingForCategory | undefined>(undefined);
  const [showPremiumView, setShowPremiumView] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [urlPathname, setUrlPathname] = useState('/');
  const [urlSearch, setUrlSearch] = useState('');
  const hideGuestModalOnAuthViews = view === 'auth' || view === 'register';

  // Track browser URL updates (initial load + back/forward).
  useEffect(() => {
    const syncLocation = () => {
      setUrlPathname(normalizePathname(window.location.pathname));
      setUrlSearch(window.location.search);
    };

    syncLocation();
    window.addEventListener('popstate', syncLocation);
    return () => window.removeEventListener('popstate', syncLocation);
  }, []);

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
      let profileBySession: SupabaseProfile | null = null;
      try {
        const { data: profileById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileById) {
          profileBySession = profileById as SupabaseProfile;
        } else if (session.user.email) {
          const { data: profileByEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', session.user.email)
            .maybeSingle();
          profileBySession = (profileByEmail as SupabaseProfile) || null;
        }

        // Backward-compatible auth: if profile row is missing, create a minimal one.
        if (!profileBySession) {
          const fallbackEmail = session.user.email?.trim().toLowerCase() || null;
          const metadataName =
            (typeof session.user.user_metadata?.name === 'string' && session.user.user_metadata.name.trim()) ||
            (fallbackEmail ? fallbackEmail.split('@')[0] : '') ||
            'Uzytkownik';
          const metadataAge = Number(session.user.user_metadata?.age);
          const fallbackAge = Number.isFinite(metadataAge) && metadataAge >= 18 ? metadataAge : 50;
          const metadataCity =
            typeof session.user.user_metadata?.city === 'string'
              ? session.user.user_metadata.city.trim()
              : '';

          const { data: createdProfile, error: createProfileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: session.user.id,
                email: fallbackEmail,
                name: metadataName,
                age: fallbackAge,
                city: metadataCity,
                bio: '',
                interests: [],
                image_url: '',
              },
              { onConflict: 'id' },
            )
            .select('*')
            .maybeSingle();

          if (createProfileError) {
            console.error('Nie udalo sie utworzyc profilu dla zalogowanego uzytkownika:', createProfileError);
          } else {
            profileBySession = (createdProfile as SupabaseProfile) || null;
          }
        }

        premiumFromProfile = isPremiumActiveFromProfile(profileBySession);
      } catch (premiumError) {
        console.error('Nie udało się pobrać statusu premium:', premiumError);
      }

      setIsPremium(premiumFromProfile || localPremium);

      // Admin ma zawsze pełny dostęp (email główny lub rola z bazy)
      const hasAdminAccess =
        session.user.email === adminEmail ||
        profileBySession?.role === 'admin' ||
        profileBySession?.role === 'super_admin';

      isAdminRef.current = hasAdminAccess;
      setIsAdmin(hasAdminAccess);

      // Dla głównego konta admina przygotowujemy profil, ale nie przekierowujemy automatycznie
      // Admin może wejść do panelu przez nawigację
      if (session.user.email === adminEmail) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', adminProfileId)
          .single();

        if (data) {
          const adminProfile = mapSupabaseProfile(data as SupabaseProfile);
          setSelectedProfile(adminProfile);
          // Usunięto automatyczne setView('admin') - admin może teraz swobodnie nawigować
        }
      }
    } else {
      setIsLoggedIn(false);
      setUserName('');
      isAdminRef.current = false;
      setIsAdmin(false);
      setIsPremium(false);
    }
  }

  // Read URL state (path/query) and one-time actions (password reset success).
  useEffect(() => {
    const searchParams = new URLSearchParams(urlSearch);
    const legacyViewParam = searchParams.get('view');
    const legacyProfileIdParam = searchParams.get('id');
    const resetParam = searchParams.get('reset');

    const viewFromPath = getViewFromPathname(urlPathname);
    const viewFromQuery = legacyViewParam && isRoutableAppView(legacyViewParam)
      ? legacyViewParam
      : null;
    const routeView = viewFromPath || viewFromQuery;

    const profileIdFromPath = extractProfileIdFromPath(urlPathname);
    const routeProfileId = profileIdFromPath || (routeView === 'profile' ? legacyProfileIdParam : null);

    let canonicalView: AppView = routeView || view;
    let canonicalProfileId: string | null = routeProfileId;

    if (resetParam === 'success') {
      setNotification('Hasło zostało zmienione. Zaloguj się nowym hasłem.');
      window.setTimeout(() => setNotification(null), 3500);
    }

    if (routeView) {
      if (routeView === 'profile') {
        if (routeProfileId) {
          const profileFromUrl = profiles.find((profile) => profile.id === routeProfileId);

          if (profileFromUrl) {
            if (selectedProfile?.id !== profileFromUrl.id) {
              setSelectedProfile(profileFromUrl);
            }
            if (view !== 'profile') {
              applyingUrlStateRef.current = true;
              setView('profile');
            }
          } else if (!loading) {
            canonicalView = 'home';
            canonicalProfileId = null;
            if (view !== 'home') {
              applyingUrlStateRef.current = true;
              setView('home');
            }
          }
        } else {
          canonicalView = 'home';
          canonicalProfileId = null;
          if (view !== 'home') {
            applyingUrlStateRef.current = true;
            setView('home');
          }
        }
      } else if (routeView === 'messages' && !isLoggedIn) {
        canonicalView = 'auth';
        canonicalProfileId = null;
        if (view !== 'auth') {
          applyingUrlStateRef.current = true;
          setView('auth');
        }
      } else if (view !== routeView) {
        applyingUrlStateRef.current = true;
        setView(routeView);
      }
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('view');
    nextParams.delete('id');
    nextParams.delete('reset');

    const expectedPath = getPathForView(
      canonicalView,
      canonicalView === 'profile' ? canonicalProfileId || selectedProfile?.id || null : null,
    );
    const nextQuery = nextParams.toString();
    const nextSearch = nextQuery ? `?${nextQuery}` : '';
    const currentPath = normalizePathname(window.location.pathname);
    const currentSearch = window.location.search;

    const hasLegacyRoutingParams = searchParams.has('view') || searchParams.has('id') || searchParams.has('reset');
    const shouldReplaceUrl = hasLegacyRoutingParams || currentPath !== expectedPath || currentSearch !== nextSearch;

    if (shouldReplaceUrl) {
      const nextUrl = `${expectedPath}${nextSearch}`;
      const currentUrl = `${currentPath}${currentSearch}`;

      if (nextUrl !== currentUrl) {
        window.history.replaceState(null, '', nextUrl);
      }

      if (expectedPath !== urlPathname) {
        setUrlPathname(expectedPath);
      }
      if (nextSearch !== urlSearch) {
        setUrlSearch(nextSearch);
      }
    }
  }, [isLoggedIn, loading, profiles, selectedProfile?.id, urlPathname, urlSearch]);

  // Keep URL in sync with current in-app view so tabs/profiles are shareable.
  useEffect(() => {
    const viewFromPath = getViewFromPathname(urlPathname);
    const searchParams = new URLSearchParams(urlSearch);
    const viewFromQuery = searchParams.get('view');

    // Let URL-driven state initialize first (direct link open / back-forward).
    if (applyingUrlStateRef.current && viewFromPath && viewFromPath !== view) {
      return;
    }
    if (
      applyingUrlStateRef.current &&
      !viewFromPath &&
      viewFromQuery &&
      isRoutableAppView(viewFromQuery) &&
      viewFromQuery !== view
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('view');
    nextParams.delete('id');
    nextParams.delete('reset');

    if (view === 'profile') {
      const currentProfileIdFromPath = extractProfileIdFromPath(urlPathname);
      if (!selectedProfile?.id && currentProfileIdFromPath) {
        return;
      }
      if (!selectedProfile?.id) {
        return;
      }
    }

    const expectedPath = getPathForView(view, view === 'profile' ? selectedProfile?.id || null : null);
    const nextQuery = nextParams.toString();
    const nextSearch = nextQuery ? `?${nextQuery}` : '';
    const currentPath = normalizePathname(window.location.pathname);
    const currentSearch = window.location.search;

    if (expectedPath !== currentPath || nextSearch !== currentSearch) {
      window.history.replaceState(null, '', `${expectedPath}${nextSearch}`);
    }

    if (expectedPath !== urlPathname) {
      setUrlPathname(expectedPath);
    }
    if (nextSearch !== urlSearch) {
      setUrlSearch(nextSearch);
    }

    applyingUrlStateRef.current = false;
  }, [selectedProfile?.id, urlPathname, urlSearch, view]);

  // Supabase auth state effect
  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };
    getSession();

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // Profile completion restrictions hook (admin ma zawsze odblokowany dostęp)
  const profileCompletion = useProfileCompletion(isLoggedIn, isAdmin);

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

  const openProfileById = async (profileId: string) => {
    if (!profileId) return;

    const alreadyLoaded = profiles.find((profile) => profile.id === profileId);
    if (alreadyLoaded) {
      openProfile(alreadyLoaded);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (error || !data) {
      notify('Nie udało się otworzyć wizytówki autora komentarza.');
      return;
    }

    const mappedProfile = mapSupabaseProfile(data as SupabaseProfile);
    setSelectedProfile(mappedProfile);
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
      <div className="min-h-screen bg-[linear-gradient(135deg,#07050f_0%,#110a22_50%,#07050f_100%)] text-white pb-24 md:pb-10 text-base selection:bg-fuchsia-500/30 selection:text-fuchsia-100">
        {notification && <Notification message={notification} />}

      {/* OLD Header removed - using NewHeader from layout.tsx */}

      <main className="max-w-[2200px] mx-auto px-6 lg:px-12 pt-28">
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
                onBack={() => {
                  setView('home');
                  router.push('/');
                }}
                onNotify={notify}
                onRegister={() => {
                  setView('register');
                  router.push('/register');
                }}
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
                onOpenAuthorProfile={openProfileById}
                isAdmin={isAdmin}
                guestRestrictions={guestRestrictions}
                onGuestFeatureBlock={guestRestrictions.triggerFeatureModal}
              />
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
                onBack={() => {
                  setView('auth');
                  router.push('/auth');
                }}
                onComplete={(registeredName, isAuthenticated) => {
                  setUserName(registeredName);

                  if (isAuthenticated) {
                    setIsLoggedIn(true);
                    setTokens(3);
                    notify(`Witaj, ${registeredName}! 🎉 Otrzymujesz 3 Serduszka na start!`);
                    setView('home');
                    router.push('/');
                    return;
                  }

                  notify('Konto utworzone. Potwierdz e-mail i zaloguj sie.');
                  setView('auth');
                  router.push('/auth');
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
          if (v === 'myprofile') {
            router.push('/myprofile');
          } else {
            setView(v);
          }
        }}
      />
      <div className="md:hidden">
        <BottomNav
          currentView={view}
          isLoggedIn={isLoggedIn}
          onNavigate={(v) => {
            setShowPremiumView(false);
            if (v === 'myprofile') {
              router.push('/myprofile');
            } else {
              setView(v);
            }
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
              onClose={() => {
                if (guestRestrictions.showTimeoutModal) {
                  guestRestrictions.closeTimeoutModal();
                } else {
                  guestRestrictions.closeModal();
                }
              }}
              onRegister={() => {
                if (guestRestrictions.showTimeoutModal) {
                  guestRestrictions.closeTimeoutModal();
                } else {
                  guestRestrictions.closeModal();
                }
                setView('register');
              }}
              onLogin={() => {
                if (guestRestrictions.showTimeoutModal) {
                  guestRestrictions.closeTimeoutModal();
                } else {
                  guestRestrictions.closeModal();
                }
                setView('auth');
              }}
              variant={
                guestRestrictions.showFeatureModal ? 'feature' : 
                guestRestrictions.showTimeoutModal ? 'timeout' : 
                'clicks'
              }
              featureName={guestRestrictions.featureName}
              remainingTime={guestRestrictions.remainingTime}
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

        {/* Profile completion modal for logged-in users (pomijane dla admina) */}
        {isLoggedIn && !isAdmin && (
          <ProfileCompletionModal
            isOpen={showCompletionModal}
            onClose={() => setShowCompletionModal(false)}
            completionLevel={profileCompletion.completionLevel}
            onGoToProfile={() => {
              setShowCompletionModal(false);
              router.push('/myprofile');
            }}
          />
        )}

      </div>
    </LegalProvider>
  );
}
