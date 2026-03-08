'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { MOCK_PROFILES } from '@/lib/data';
import { AdminReport, filterNonAdminProfiles, Profile, SupabaseProfile, mapSupabaseProfile } from '@/lib/types';
import {
  AlertTriangle,
  BarChart3,
  Crown,
  Eye,
  Flag,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserCheck,
  UserLock,
  Users,
  Wallet,
} from 'lucide-react';
import ConfirmModal from '../layout/ConfirmModal';

const MessageModal = dynamic(() => import('../layout/MessageModal'), { ssr: false });

type AdminTab = 'overview' | 'users' | 'moderation' | 'monetization';
type UserFilter = 'all' | 'blocked' | 'active' | 'unverified' | 'pending' | 'premium';
type UserSort = 'newest' | 'oldest' | 'az' | 'za';
type DashboardDataSource = 'live' | 'demo' | 'error';

interface SubscriptionRow {
  id: string;
  profile_id: string;
  provider: string;
  plan_code: string;
  status: string;
  amount_gross: number;
  currency: string;
  current_period_start: string;
  current_period_end?: string | null;
  updated_at?: string;
}

interface AdminStats {
  totalUsers: number;
  active24h: number;
  newUsers7d: number;
  blockedUsers: number;
  verifiedUsers: number;
  pendingSelfie: number;
  openReports: number;
  messages24h: number;
  likes24h: number;
  premiumActive: number;
  revenue30dGross: number;
}

const EMPTY_STATS: AdminStats = {
  totalUsers: 0,
  active24h: 0,
  newUsers7d: 0,
  blockedUsers: 0,
  verifiedUsers: 0,
  pendingSelfie: 0,
  openReports: 0,
  messages24h: 0,
  likes24h: 0,
  premiumActive: 0,
  revenue30dGross: 0,
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trial']);

function isWithinHours(dateLike?: string, hours = 24): boolean {
  if (!dateLike) return false;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
}

function isWithinDays(dateLike?: string, days = 7): boolean {
  if (!dateLike) return false;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function formatDateTime(dateLike?: string): string {
  if (!dateLike) return '-';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pl-PL');
}

function formatMoney(gross: number, currency = 'PLN'): string {
  const amount = gross / 100;
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isProfilePremium(profile: Profile): boolean {
  if (profile.isPremium) return true;
  if (!profile.premiumUntil) return false;
  return new Date(profile.premiumUntil).getTime() > Date.now();
}

function roleLabel(role?: string): string {
  if (!role || role === 'user') return 'Użytkownik';
  if (role === 'admin') return 'Admin';
  if (role === 'super_admin') return 'Super Admin';
  return role;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DashboardDataSource>('live');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const [reportsEnabled, setReportsEnabled] = useState(true);
  const [billingEnabled, setBillingEnabled] = useState(true);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [sort, setSort] = useState<UserSort>('newest');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState<string | undefined>(undefined);
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTo, setMessageTo] = useState<Profile | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const pendingSelfieProfiles = useMemo(
    () => profiles.filter((profile) => profile.verificationPending && profile.role !== 'super_admin'),
    [profiles],
  );

  const reportStats = useMemo(() => {
    const pending = reports.filter((report) => report.status === 'pending').length;
    const inReview = reports.filter((report) => report.status === 'in_review').length;
    const resolved = reports.filter((report) => report.status === 'resolved').length;
    return { pending, inReview, resolved };
  }, [reports]);

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    let list = profiles.filter((profile) => {
      if (filter === 'blocked' && !profile.isBlocked) return false;
      if (filter === 'active' && profile.isBlocked) return false;
      if (filter === 'unverified' && profile.isVerified) return false;
      if (filter === 'pending' && !profile.verificationPending) return false;
      if (filter === 'premium' && !isProfilePremium(profile)) return false;

      if (!normalizedSearch) return true;

      const haystack = `${profile.name} ${profile.email || ''} ${profile.city} ${profile.status}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    list = [...list].sort((a, b) => {
      if (sort === 'newest') {
        return (
          new Date(b.createdAt || b.lastActive || 0).getTime() -
          new Date(a.createdAt || a.lastActive || 0).getTime()
        );
      }
      if (sort === 'oldest') {
        return (
          new Date(a.createdAt || a.lastActive || 0).getTime() -
          new Date(b.createdAt || b.lastActive || 0).getTime()
        );
      }
      if (sort === 'az') return a.name.localeCompare(b.name, 'pl');
      return b.name.localeCompare(a.name, 'pl');
    });

    return list;
  }, [profiles, filter, search, sort]);

  const maxPage = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredProfiles.length / pageSize));
  const paginatedProfiles =
    pageSize === -1
      ? filteredProfiles
      : filteredProfiles.slice((page - 1) * pageSize, page * pageSize);

  const conversionVerification =
    stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0;
  const conversionPremium =
    stats.totalUsers > 0 ? Math.round((stats.premiumActive / stats.totalUsers) * 100) : 0;
  const moderationRate =
    stats.totalUsers > 0 ? Math.round((stats.blockedUsers / stats.totalUsers) * 100) : 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkStatus = () => setIsOnline(window.navigator.onLine);

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  async function fetchDashboardData() {
    setNotification(null);
    setLastError(null);
    try {
      const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const monthAgoTs = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const [
        profilesResponse,
        reportsResponse,
        messages24hResponse,
        likes24hResponse,
        subscriptionsResponse,
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_reports').select('*').order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayAgoIso),
        supabase.from('likes').select('*', { count: 'exact', head: true }).gte('created_at', dayAgoIso),
        supabase
          .from('subscriptions')
          .select(
            'id, profile_id, provider, plan_code, status, amount_gross, currency, current_period_start, current_period_end, updated_at',
          )
          .order('created_at', { ascending: false }),
      ]);

      const fallbackProfiles = filterNonAdminProfiles(MOCK_PROFILES);
      const partialErrors: string[] = [];

      if (profilesResponse.error) partialErrors.push(`profiles: ${profilesResponse.error.message}`);
      if (reportsResponse.error) partialErrors.push(`admin_reports: ${reportsResponse.error.message}`);
      if (messages24hResponse.error) partialErrors.push(`messages: ${messages24hResponse.error.message}`);
      if (likes24hResponse.error) partialErrors.push(`likes: ${likes24hResponse.error.message}`);
      if (subscriptionsResponse.error) partialErrors.push(`subscriptions: ${subscriptionsResponse.error.message}`);

      const mappedProfiles = profilesResponse.error || !profilesResponse.data
        ? fallbackProfiles
        : (profilesResponse.data as SupabaseProfile[]).map(mapSupabaseProfile);

      if (profilesResponse.error || !profilesResponse.data) {
        setNotification('Nie udało się pobrać profili z bazy. Wyświetlam profile demo.');
      }

      if (reportsResponse.error) {
        setReportsEnabled(false);
        setReports([]);
      } else {
        setReportsEnabled(true);
        setReports((reportsResponse.data || []) as AdminReport[]);
      }

      if (subscriptionsResponse.error) {
        setBillingEnabled(false);
        setSubscriptions([]);
      } else {
        setBillingEnabled(true);
        setSubscriptions((subscriptionsResponse.data || []) as SubscriptionRow[]);
      }

      const userProfiles = mappedProfiles.filter(
        (profile) => profile.role !== 'super_admin' && profile.role !== 'admin',
      );

      const useDemoProfiles = userProfiles.length === 0;
      setDataSource(useDemoProfiles ? 'demo' : 'live');
      const visibleProfiles = useDemoProfiles
        ? [
            ...mappedProfiles.filter((profile) => profile.role === 'super_admin' || profile.role === 'admin'),
            ...fallbackProfiles,
          ]
        : mappedProfiles;

      if (useDemoProfiles && !(profilesResponse.error || !profilesResponse.data)) {
        setNotification('Brak zwykłych kont w bazie. Wyświetlam profile demo.');
      }

      setProfiles(visibleProfiles);

      const usersForStats = useDemoProfiles ? fallbackProfiles : userProfiles;

      const openReportsCount = reportsResponse.error
        ? 0
        : ((reportsResponse.data || []) as AdminReport[]).filter(
            (report) => !['resolved', 'rejected'].includes(report.status),
          ).length;

      const subsList = subscriptionsResponse.error
        ? []
        : ((subscriptionsResponse.data || []) as SubscriptionRow[]);

      const premiumActiveCount = usersForStats.filter((profile) => isProfilePremium(profile)).length;

      const revenue30dGross = subsList
        .filter((subscription) => {
          const startTs = new Date(subscription.current_period_start).getTime();
          return ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) && startTs >= monthAgoTs;
        })
        .reduce((sum, subscription) => sum + (subscription.amount_gross || 0), 0);

      setStats({
        totalUsers: usersForStats.length,
        active24h: usersForStats.filter((profile) => isWithinHours(profile.lastActive || profile.createdAt, 24))
          .length,
        newUsers7d: usersForStats.filter((profile) => isWithinDays(profile.createdAt, 7)).length,
        blockedUsers: usersForStats.filter((profile) => profile.isBlocked).length,
        verifiedUsers: usersForStats.filter((profile) => profile.isVerified).length,
        pendingSelfie: usersForStats.filter((profile) => profile.verificationPending).length,
        openReports: openReportsCount,
        messages24h: messages24hResponse.count || 0,
        likes24h: likes24hResponse.count || 0,
        premiumActive: premiumActiveCount,
        revenue30dGross,
      });

      if (partialErrors.length > 0) {
        setLastError(partialErrors.join(' | '));
      }

      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      console.error('Błąd ładowania panelu admina:', error);
      const fallbackProfiles = filterNonAdminProfiles(MOCK_PROFILES);
      const message = error instanceof Error ? error.message : 'Nieznany błąd';

      setProfiles(fallbackProfiles);
      setReports([]);
      setSubscriptions([]);
      setReportsEnabled(false);
      setBillingEnabled(false);
      setDataSource('error');
      setLastError(message);
      setLastSyncAt(new Date().toISOString());
      setStats({
        ...EMPTY_STATS,
        totalUsers: fallbackProfiles.length,
        verifiedUsers: fallbackProfiles.filter((profile) => profile.isVerified).length,
        pendingSelfie: fallbackProfiles.filter((profile) => profile.verificationPending).length,
        premiumActive: fallbackProfiles.filter((profile) => isProfilePremium(profile)).length,
      });
      setNotification('Panel admina miał problem z pobraniem danych. Pokazuję dane demo.');
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await fetchDashboardData();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenMessage = (profile: Profile) => {
    setMessageTo(profile);
    setMessageContent('');
    setMessageSuccess(null);
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    setMessageSending(true);
    setTimeout(() => {
      setMessageSending(false);
      setMessageSuccess('Wiadomość wysłana!');
      setMessageContent('');
    }, 1000);
  };

  const handleBlock = async (id: string, block: boolean) => {
    const profile = profileMap.get(id);
    if (profile?.role === 'super_admin') {
      setNotification('Nie możesz zablokować konta Super Admin.');
      return;
    }

    const action = block ? 'zablokować' : 'odblokować';
    setConfirmTitle(block ? 'Blokada użytkownika' : 'Odblokowanie użytkownika');
    setConfirmMessage(`Czy na pewno chcesz ${action} tego użytkownika?`);
    setOnConfirm(() => async () => {
      setConfirmOpen(false);
      await supabase.from('profiles').update({ is_blocked: block }).eq('id', id);
      await fetchDashboardData();
      setNotification(block ? 'Użytkownik zablokowany.' : 'Użytkownik odblokowany.');
    });
    setConfirmOpen(true);
  };

  const handleVerify = async (id: string, verify: boolean) => {
    await supabase
      .from('profiles')
      .update({ is_verified: verify, verification_pending: false })
      .eq('id', id);
    await fetchDashboardData();
    setNotification(verify ? 'Użytkownik zweryfikowany.' : 'Weryfikacja cofnięta.');
  };

  const handleDelete = async (id: string) => {
    const profile = profileMap.get(id);
    if (profile?.role === 'super_admin') {
      setNotification('Nie możesz usunąć konta Super Admin.');
      return;
    }

    setConfirmTitle('Usuwanie użytkownika');
    setConfirmMessage('Czy na pewno chcesz usunąć tego użytkownika?');
    setOnConfirm(() => async () => {
      setConfirmOpen(false);
      await supabase.from('profiles').delete().eq('id', id);
      await fetchDashboardData();
      setNotification('Użytkownik usunięty.');
    });
    setConfirmOpen(true);
  };

  const handleReportStatus = async (reportId: string, status: string) => {
    if (!reportsEnabled) {
      setNotification('Tabela zgłoszeń nie jest dostępna.');
      return;
    }

    const resolved = status === 'resolved' || status === 'rejected';
    await supabase
      .from('admin_reports')
      .update({
        status,
        reviewed_at: resolved ? new Date().toISOString() : null,
      })
      .eq('id', reportId);

    await fetchDashboardData();
    setNotification('Status zgłoszenia zaktualizowany.');
  };

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-start gap-3 mb-5">
          <ShieldCheck className="text-amber-600 mt-1" size={30} />
          <div>
            <h2 className="text-2xl font-bold text-amber-900">Panel administratora</h2>
            <p className="text-sm text-slate-500">
              Układ jak w portalach randkowych: KPI, moderacja, użytkownicy i monetyzacja.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm font-semibold transition-colors"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Odśwież
          </button>
        </div>

        <div className="bg-white border border-amber-100 rounded-2xl p-2 mb-5 shadow-sm flex flex-wrap gap-2">
          {[
            { id: 'overview' as const, label: 'Przegląd', icon: BarChart3 },
            { id: 'users' as const, label: 'Użytkownicy', icon: Users },
            { id: 'moderation' as const, label: 'Moderacja', icon: Flag },
            { id: 'monetization' as const, label: 'Monetyzacja', icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                <Icon size={15} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div
          className={`mb-4 rounded-xl border px-4 py-2 text-xs ${
            dataSource === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : dataSource === 'demo'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 font-semibold">
              Źródło danych: {dataSource === 'live' ? 'Live' : dataSource === 'demo' ? 'Demo fallback' : 'Fallback po błędzie'}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 font-semibold">
              Ostatnia synchronizacja: {formatDateTime(lastSyncAt || undefined)}
            </span>
            {lastError && (
              <span className="inline-flex max-w-full items-center rounded-full bg-white/70 px-2 py-0.5 font-semibold break-all">
                Ostatni błąd: {lastError}
              </span>
            )}
          </div>
        </div>

        {notification && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 font-semibold text-sm">
            {notification}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-24">Ładowanie danych panelu...</div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Użytkownicy</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.totalUsers}</p>
                    <p className="text-xs text-slate-500 mt-1">+{stats.newUsers7d} nowych / 7 dni</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Aktywni 24h</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.active24h}</p>
                    <p className="text-xs text-slate-500 mt-1">ruch bieżący</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Moderacja</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.openReports}</p>
                    <p className="text-xs text-slate-500 mt-1">otwarte zgłoszenia</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Premium aktywne</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.premiumActive}</p>
                    <p className="text-xs text-slate-500 mt-1">konwersja {conversionPremium}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={16} className="text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Lejek produktowy</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>Zweryfikowane profile</span>
                          <span>{conversionVerification}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${conversionVerification}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>Konwersja na Premium</span>
                          <span>{conversionPremium}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${conversionPremium}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                          <span>Wskaźnik blokad</span>
                          <span>{moderationRate}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${moderationRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Aktywność 24h</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600"><MessageCircle size={14} /> Wiadomości</span>
                        <strong className="text-slate-800">{stats.messages24h}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600"><Eye size={14} /> Polubienia</span>
                        <strong className="text-slate-800">{stats.likes24h}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600"><UserLock size={14} /> Selfie pending</span>
                        <strong className="text-slate-800">{stats.pendingSelfie}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600"><Crown size={14} /> Przychód 30d</span>
                        <strong className="text-slate-800">{formatMoney(stats.revenue30dGross)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Szukaj po imieniu, emailu, mieście"
                      className="pl-9 pr-3 py-2 border rounded-lg text-sm w-72"
                    />
                  </div>

                  <select
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value as UserFilter);
                      setPage(1);
                    }}
                    className="px-2 py-2 border rounded-lg text-sm"
                  >
                    <option value="all">Wszyscy</option>
                    <option value="blocked">Zablokowani</option>
                    <option value="active">Aktywni</option>
                    <option value="unverified">Nieweryfikowani</option>
                    <option value="pending">Do weryfikacji selfie</option>
                    <option value="premium">Premium</option>
                  </select>

                  <span className="ml-2 text-sm font-semibold">Sortuj:</span>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as UserSort);
                      setPage(1);
                    }}
                    className="px-2 py-2 border rounded-lg text-sm"
                  >
                    <option value="newest">Najnowsi</option>
                    <option value="oldest">Najstarsi</option>
                    <option value="az">A → Z</option>
                    <option value="za">Z → A</option>
                  </select>

                  <span className="ml-2 text-sm font-semibold">Na stronę:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-2 border rounded-lg text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={-1}>max</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border rounded-xl shadow-sm">
                    <thead>
                      <tr className="bg-amber-50 text-amber-900 text-sm">
                        <th className="p-2 text-left">Imię</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Miasto</th>
                        <th className="p-2 text-left">Wiek</th>
                        <th className="p-2 text-left">Rola</th>
                        <th className="p-2 text-left">Weryfikacja</th>
                        <th className="p-2 text-left">Premium</th>
                        <th className="p-2 text-left">Blokada</th>
                        <th className="p-2 text-left">Aktywność</th>
                        <th className="p-2 text-left">Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProfiles.map((profile) => {
                        const premium = isProfilePremium(profile);
                        const superAdmin = profile.role === 'super_admin';

                        return (
                          <tr key={profile.id} className={profile.isBlocked ? 'bg-rose-50' : ''}>
                            <td className="p-2 font-bold">{profile.name}</td>
                            <td className="p-2 text-xs">{profile.email || '-'}</td>
                            <td className="p-2">{profile.city}</td>
                            <td className="p-2">{profile.age}</td>
                            <td className="p-2 text-xs font-semibold">{roleLabel(profile.role)}</td>
                            <td className="p-2">
                              {profile.isVerified ? (
                                <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                                  <UserCheck size={14} /> Tak
                                </span>
                              ) : profile.verificationPending ? (
                                <span className="text-amber-600 font-semibold text-xs">Oczekuje</span>
                              ) : (
                                <button
                                  onClick={() => handleVerify(profile.id, true)}
                                  className="text-xs text-amber-700 underline"
                                >
                                  Zweryfikuj
                                </button>
                              )}
                            </td>
                            <td className="p-2 text-xs">
                              {premium ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                  <Crown size={12} /> Aktywne
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-2">
                              {profile.isBlocked ? (
                                <button
                                  onClick={() => handleBlock(profile.id, false)}
                                  className="text-xs text-emerald-700 underline"
                                  disabled={superAdmin}
                                >
                                  Odblokuj
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlock(profile.id, true)}
                                  className="text-xs text-rose-700 underline"
                                  disabled={superAdmin}
                                >
                                  Zablokuj
                                </button>
                              )}
                            </td>
                            <td className="p-2 text-xs">{formatDateTime(profile.lastActive)}</td>
                            <td className="p-2">
                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={() => handleDelete(profile.id)}
                                  className="text-xs text-rose-700 underline flex items-center gap-1 disabled:text-slate-400"
                                  disabled={superAdmin}
                                >
                                  <Trash2 size={13} /> Usuń
                                </button>
                                <button
                                  onClick={() => handleOpenMessage(profile)}
                                  className="text-xs text-amber-700 underline flex items-center gap-1"
                                >
                                  <Mail size={13} /> Napisz
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {pageSize !== -1 && maxPage > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Poprzednia
                    </button>
                    <span className="text-sm">
                      Strona {page} z {maxPage}
                    </span>
                    <button
                      onClick={() => setPage((current) => Math.min(maxPage, current + 1))}
                      disabled={page === maxPage}
                      className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Następna
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <UserLock size={16} className="text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                      Weryfikacje selfie ({pendingSelfieProfiles.length})
                    </h3>
                  </div>

                  {pendingSelfieProfiles.length === 0 ? (
                    <p className="text-sm text-slate-500">Brak oczekujących weryfikacji selfie.</p>
                  ) : (
                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                      {pendingSelfieProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{profile.name}</p>
                            <p className="text-xs text-slate-500">
                              {profile.email || '-'} · {profile.city}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVerify(profile.id, true)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            >
                              Akceptuj
                            </button>
                            <button
                              onClick={() => handleVerify(profile.id, false)}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200"
                            >
                              Odrzuć
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Flag size={16} className="text-rose-600" />
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Zgłoszenia</h3>
                    </div>
                    <div className="text-xs text-slate-500">
                      pending: {reportStats.pending} · review: {reportStats.inReview} · resolved: {reportStats.resolved}
                    </div>
                  </div>

                  {!reportsEnabled ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5" />
                      Tabela `admin_reports` nie jest jeszcze dostępna na tej bazie.
                    </div>
                  ) : reports.length === 0 ? (
                    <p className="text-sm text-slate-500">Brak zgłoszeń do obsługi.</p>
                  ) : (
                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                      {reports.map((report) => {
                        const reported = profileMap.get(report.reported_profile_id);
                        const reporter = report.reporter_profile_id
                          ? profileMap.get(report.reporter_profile_id)
                          : null;

                        return (
                          <div key={report.id} className="border border-slate-200 rounded-xl p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-slate-800">{report.reason}</p>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                                {report.status}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mb-2">
                              Zgłoszony: {reported?.name || report.reported_profile_id} · Zgłaszający:{' '}
                              {reporter?.name || report.reporter_profile_id || 'anonim'}
                            </p>

                            {report.details && (
                              <p className="text-xs text-slate-600 mb-2 rounded-lg bg-slate-50 px-2 py-1">
                                {report.details}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-400">{formatDateTime(report.created_at)}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReportStatus(report.id, 'in_review')}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
                                  In review
                                </button>
                                <button
                                  onClick={() => handleReportStatus(report.id, 'resolved')}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                >
                                  Resolve
                                </button>
                                <button
                                  onClick={() => handleReportStatus(report.id, 'rejected')}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                >
                                  Odrzuć
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'monetization' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Aktywne Premium</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stats.premiumActive}</p>
                    <p className="text-xs text-slate-500 mt-1">konwersja {conversionPremium}% bazy</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Przychód 30 dni</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                      {formatMoney(stats.revenue30dGross)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">na bazie aktywnych subskrypcji</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Wiadomości / Premium</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">
                      {stats.premiumActive > 0
                        ? Math.round(stats.messages24h / stats.premiumActive)
                        : 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">wskaźnik engagement 24h</p>
                  </div>
                </div>

                {!billingEnabled ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5" />
                    Tabela `subscriptions` nie jest dostępna. Uruchom migrację `supabase/migration_fixed.sql`.
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-amber-50 text-amber-900 text-sm">
                          <th className="p-2 text-left">Użytkownik</th>
                          <th className="p-2 text-left">Plan</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Kwota</th>
                          <th className="p-2 text-left">Provider</th>
                          <th className="p-2 text-left">Okres start</th>
                          <th className="p-2 text-left">Okres koniec</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.slice(0, 50).map((subscription) => {
                          const profile = profileMap.get(subscription.profile_id);
                          return (
                            <tr key={subscription.id} className="border-t border-slate-100 text-sm">
                              <td className="p-2 font-semibold">
                                {profile?.name || subscription.profile_id.slice(0, 8)}
                              </td>
                              <td className="p-2 text-xs">{subscription.plan_code}</td>
                              <td className="p-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                                  {subscription.status}
                                </span>
                              </td>
                              <td className="p-2 text-xs">
                                {formatMoney(subscription.amount_gross || 0, subscription.currency || 'PLN')}
                              </td>
                              <td className="p-2 text-xs">{subscription.provider}</td>
                              <td className="p-2 text-xs">{formatDateTime(subscription.current_period_start)}</td>
                              <td className="p-2 text-xs">{formatDateTime(subscription.current_period_end || undefined)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {subscriptions.length === 0 && (
                      <div className="p-5 text-sm text-slate-500">Brak subskrypcji do wyświetlenia.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <MessageModal
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        recipient={messageTo}
        content={messageContent}
        onContentChange={setMessageContent}
        onSend={handleSendMessage}
        sending={messageSending}
        success={messageSuccess}
      />
    </>
  );
}
