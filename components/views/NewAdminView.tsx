'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Activity, AlertTriangle, TrendingUp, MessageCircle, Eye, Ban, Check, X, Flag, Trash2, Plus, Minus, BadgeCheck, Camera, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
  status: string;
  city: string;
  strikes: number;
  isBanned: boolean;
  isPopularOverride: boolean;
}

interface CommentReport {
  id: string;
  comment_id: string | null;
  photo_comment_id: string | null;
  comment_type: 'wall' | 'photo';
  comment_content: string;
  comment_author_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_name: string;
  reporter_image: string;
  author_name: string;
  author_image: string;
  author_strikes: number;
}

interface VerificationQueueItem {
  id: string;
  profileId: string;
  profileName: string;
  profileImage: string | null;
  profileCity: string | null;
  profileAge: number | null;
  profileVerified: boolean;
  status: 'pending_ai' | 'pending_admin' | 'approved' | 'rejected';
  aiScore: number | null;
  aiReason: string | null;
  selfiePreviewUrl: string | null;
  createdAt: string;
}

export default function NewAdminView() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>([]);
  const [selectedSelfiePreview, setSelectedSelfiePreview] = useState<{
    src: string;
    profileName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [verificationBusyId, setVerificationBusyId] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationAdminNotes, setVerificationAdminNotes] = useState<Record<string, string>>({});

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeNow: 0,
    newReports: 0,
    pendingVerifications: 0,
    revenue24h: 0,
  });

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedSelfiePreview) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedSelfiePreview(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedSelfiePreview]);

  const getAdminAccessToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  };

  const loadVerificationQueue = async (): Promise<number> => {
    try {
      const token = await getAdminAccessToken();
      if (!token) {
        setVerificationQueue([]);
        setVerificationError('Brak aktywnej sesji admina.');
        return 0;
      }

      const response = await fetch('/api/admin/verification/requests', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        queue?: VerificationQueueItem[];
      };

      if (!response.ok) {
        setVerificationQueue([]);
        setVerificationError(payload.error || 'Nie udalo sie pobrac kolejki selfie.');
        return 0;
      }

      const queue = payload.queue || [];
      setVerificationQueue(queue);
      setVerificationError(null);
      return queue.length;
    } catch (error) {
      console.error('Error loading verification queue:', error);
      setVerificationQueue([]);
      setVerificationError('Nie udalo sie pobrac kolejki selfie.');
      return 0;
    }
  };

  const handleReviewVerification = async (requestId: string, decision: 'approve' | 'reject') => {
    if (verificationBusyId) return;

    setVerificationBusyId(requestId);
    try {
      const token = await getAdminAccessToken();
      if (!token) {
        alert('Brak sesji admina. Odswiez strone i zaloguj sie ponownie.');
        return;
      }

      const note = (verificationAdminNotes[requestId] || '').trim();
      const response = await fetch('/api/admin/verification/review', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, decision, note }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        alert(payload.error || 'Nie udalo sie zapisac decyzji.');
        return;
      }

      const fallbackMessage = decision === 'approve'
        ? 'Selfie zostalo zaakceptowane.'
        : 'Selfie zostalo odrzucone.';
      alert(payload.message || fallbackMessage);

      setVerificationQueue((prev) => prev.filter((item) => item.id !== requestId));
      setStats((prev) => ({
        ...prev,
        pendingVerifications: Math.max(0, prev.pendingVerifications - 1),
      }));
      setVerificationAdminNotes((prev) => {
        if (!(requestId in prev)) return prev;
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    } catch (error) {
      console.error('Error reviewing verification request:', error);
      alert('Nie udalo sie zapisac decyzji moderatora.');
    } finally {
      setVerificationBusyId(null);
    }
  };

  const loadData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, image_url, created_at, status, city, strikes, is_popular_override')
        .order('created_at', { ascending: false })
        .limit(20);

      const mappedUsers: User[] = (usersData || []).map((u) => ({
        id: u.id,
        name: u.name,
        image_url: u.image_url,
        created_at: u.created_at,
        status: u.status,
        city: u.city,
        strikes: u.strikes ?? 0,
        isBanned: u.status === 'banned',
        isPopularOverride: Boolean((u as { is_popular_override?: boolean | null }).is_popular_override),
      }));

      setUsers(mappedUsers);

      // Fetch real comment reports (pending only)
      const { data: reportsData } = await supabase
        .from('comment_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      const rawReports = reportsData || [];

      // Collect unique profile ids to fetch names/images
      const profileIds = Array.from(
        new Set([
          ...rawReports.map((r: any) => r.reporter_id),
          ...rawReports.map((r: any) => r.comment_author_id),
        ].filter(Boolean))
      );

      let profileMap = new Map<string, { name: string; image_url: string; strikes: number }>();
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, image_url, strikes')
          .in('id', profileIds);
        profileMap = new Map(
          (profilesData || []).map((p: any) => [p.id, { name: p.name, image_url: p.image_url, strikes: p.strikes ?? 0 }])
        );
      }

      const mappedReports: CommentReport[] = rawReports.map((r: any) => {
        const reporter = profileMap.get(r.reporter_id);
        const author = profileMap.get(r.comment_author_id);
        return {
          id: r.id,
          comment_id: r.comment_id,
          photo_comment_id: r.photo_comment_id,
          comment_type: r.comment_type,
          comment_content: r.comment_content,
          comment_author_id: r.comment_author_id,
          reporter_id: r.reporter_id,
          reason: r.reason,
          status: r.status,
          created_at: r.created_at,
          reporter_name: reporter?.name || 'Nieznany',
          reporter_image: reporter?.image_url || '',
          author_name: author?.name || 'Nieznany',
          author_image: author?.image_url || '',
          author_strikes: author?.strikes ?? 0,
        };
      });

      setReports(mappedReports);

      const pendingVerifications = await loadVerificationQueue();

      const totalUsers = usersData?.length || 0;
      const activeNow = Math.floor(totalUsers * 0.15);
      const newReports = mappedReports.length;
      const revenue24h = 12450;

      setStats({ totalUsers, activeNow, newReports, pendingVerifications, revenue24h });
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (busyUserId === userId) return;
    setBusyUserId(userId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'banned' })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: true, status: 'banned' } : u))
      );
    } catch (err) {
      console.error('Error banning user:', err);
      alert('Błąd przy banowaniu użytkownika');
    } finally {
      setBusyUserId((prev) => (prev === userId ? null : prev));
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (busyUserId === userId) return;
    setBusyUserId(userId);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active', strikes: 0 })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: false, status: 'active', strikes: 0 } : u))
      );
    } catch (err) {
      console.error('Error unbanning user:', err);
      alert('Błąd przy odblokowaniu użytkownika');
    } finally {
      setBusyUserId((prev) => (prev === userId ? null : prev));
    }
  };

  const handleOpenProfilePreview = (userId: string) => {
    router.push(`/profile/${encodeURIComponent(userId)}`);
  };

  const handleSendMessageToUser = (userId: string) => {
    router.push(`/messages?user=${encodeURIComponent(userId)}`);
  };

  const handleToggleUserBan = async (user: User) => {
    const confirmed = window.confirm(
      user.isBanned
        ? `Czy na pewno chcesz odblokować użytkownika "${user.name || 'Bez nazwy'}"?`
        : `Czy na pewno chcesz zbanować użytkownika "${user.name || 'Bez nazwy'}"?`,
    );
    if (!confirmed) return;

    if (user.isBanned) {
      await handleUnbanUser(user.id);
      return;
    }

    await handleBanUser(user.id);
  };

  const handleTogglePopularOverride = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const nextValue = !user.isPopularOverride;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_popular_override: nextValue })
        .eq('id', userId);

      if (error) {
        const lowerMsg = error.message.toLowerCase();
        if (lowerMsg.includes('is_popular_override') || lowerMsg.includes('column')) {
          alert('Brak kolumny is_popular_override. Uruchom migracje: supabase/popularity_override_migration.sql');
        } else {
          alert(`Blad: ${error.message}`);
        }
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isPopularOverride: nextValue } : u))
      );
    } catch (err) {
      console.error('Error toggling popularity override:', err);
    }
  };

  // Ręczna korekta liczby strajków (+1 lub -1)
  const handleAdjustStrikes = async (userId: string, delta: 1 | -1) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newStrikes = Math.max(0, user.strikes + delta);
    const shouldBan = newStrikes >= 3;
    const shouldUnban = user.isBanned && newStrikes < 3;
    try {
      await supabase
        .from('profiles')
        .update({
          strikes: newStrikes,
          ...(shouldBan ? { status: 'banned' } : shouldUnban ? { status: 'active' } : {}),
        })
        .eq('id', userId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, strikes: newStrikes, isBanned: shouldBan || (u.isBanned && !shouldUnban), status: shouldBan ? 'banned' : shouldUnban ? 'active' : u.status }
            : u
        )
      );
    } catch (err) {
      console.error('Error adjusting strikes:', err);
    }
  };

  // Usuń komentarz + daj strike autorowi (autoban przy 3 strikach)
  const handleStrikeAndDelete = async (report: CommentReport) => {
    try {
      // 1. Usuń komentarz
      if (report.comment_type === 'wall' && report.comment_id) {
        await supabase.from('profile_comments').delete().eq('id', report.comment_id);
      } else if (report.comment_type === 'photo' && report.photo_comment_id) {
        await supabase.from('profile_photo_comments').delete().eq('id', report.photo_comment_id);
      }

      // 2. Inkrement strikes
      const newStrikes = report.author_strikes + 1;
      const shouldBan = newStrikes >= 3;

      await supabase
        .from('profiles')
        .update({ strikes: newStrikes, ...(shouldBan ? { status: 'banned' } : {}) })
        .eq('id', report.comment_author_id);

      // 3. Oznacz zgłoszenie jako rozwiązane
      await supabase
        .from('comment_reports')
        .update({ status: 'resolved' })
        .eq('id', report.id);

      // 4. Aktualizuj UI
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setStats((prev) => ({ ...prev, newReports: prev.newReports - 1 }));

      if (shouldBan) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === report.comment_author_id
              ? { ...u, isBanned: true, status: 'banned', strikes: newStrikes }
              : u
          )
        );
        alert(`Użytkownik "${report.author_name}" otrzymał 3. strike i został permanentnie zbanowany.`);
      }
    } catch (err) {
      console.error('Error striking user:', err);
      alert('Błąd przy nadawaniu strike');
    }
  };

  // Odrzuć zgłoszenie bez konsekwencji
  const handleDismissReport = async (reportId: string) => {
    try {
      await supabase
        .from('comment_reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId);

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((prev) => ({ ...prev, newReports: prev.newReports - 1 }));
    } catch (err) {
      console.error('Error dismissing report:', err);
    }
  };

  if (loading) {
    return <div className="pt-28 text-center text-cyan-400">Ładowanie panelu admina...</div>;
  }

  return (
    <div className="relative z-10 pt-28 pb-16 px-6 lg:px-12 max-w-[2200px] mx-auto">
      <h1 className="text-4xl font-light text-white mb-8 flex items-center gap-3">
        Panel Administratora <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
        <div className="glass rounded-2xl p-6 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-cyan-400 text-sm font-medium uppercase tracking-wider">Użytkownicy</h3>
            <Users className="text-cyan-400" size={24} />
          </div>
          <p className="text-4xl font-light text-white">{stats.totalUsers}</p>
          <p className="text-xs text-cyan-400/60 mt-1">Łącznie</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-green-400 text-sm font-medium uppercase tracking-wider">Aktywni teraz</h3>
            <Activity className="text-green-400" size={24} />
          </div>
          <p className="text-4xl font-light text-white">{stats.activeNow}</p>
          <p className="text-xs text-green-400/60 mt-1">Online</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-red-400 text-sm font-medium uppercase tracking-wider">Zgłoszenia</h3>
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <p className="text-4xl font-light text-white">{stats.newReports}</p>
          <p className="text-xs text-red-400/60 mt-1">Nowe</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-amber-400 text-sm font-medium uppercase tracking-wider">Selfie</h3>
            <BadgeCheck className="text-amber-400" size={24} />
          </div>
          <p className="text-4xl font-light text-white">{stats.pendingVerifications}</p>
          <p className="text-xs text-amber-400/60 mt-1">Do akceptacji</p>
        </div>

        <div className="glass rounded-2xl p-6 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-amber-400 text-sm font-medium uppercase tracking-wider">Przychody 24h</h3>
            <TrendingUp className="text-amber-400" size={24} />
          </div>
          <p className="text-4xl font-light text-white">{stats.revenue24h.toLocaleString()} zł</p>
          <p className="text-xs text-amber-400/60 mt-1">Ostatnia doba</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Users Table */}
        <div className="xl:col-span-2 glass rounded-2xl p-6">
          <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-3">
            Użytkownicy
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm text-cyan-400 font-medium pb-3 px-2">Użytkownik</th>
                  <th className="text-center text-sm text-cyan-400 font-medium pb-3 px-2">Status</th>
                  <th className="text-center text-sm text-cyan-400 font-medium pb-3 px-2">Strajki</th>
                  <th className="text-center text-sm text-cyan-400 font-medium pb-3 px-2">Data rejestracji</th>
                  <th className="text-center text-sm text-cyan-400 font-medium pb-3 px-2">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.image_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80'}
                          alt={user.name}
                          className={`w-10 h-10 rounded-full object-cover border border-white/10 ${
                            user.isBanned ? 'grayscale' : ''
                          }`}
                        />
                        <div>
                          <p className={`text-white text-sm font-medium ${user.isBanned ? 'line-through opacity-60' : ''}`}>
                            {user.name || 'Bez nazwy'}
                          </p>
                          <p className="text-xs text-cyan-400/60">{user.city || 'Brak'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex justify-center">
                        {user.isBanned ? (
                          <span className="inline-flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs px-2 py-1 rounded-full">
                            Zbanowany
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-500/20 border border-green-500/40 text-green-400 text-xs px-2 py-1 rounded-full">
                            Aktywny
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Zdejmij ostrzeżenie"
                          onClick={() => handleAdjustStrikes(user.id, -1)}
                          disabled={user.strikes === 0}
                          className="w-6 h-6 rounded-md bg-white/5 hover:bg-green-500/20 border border-white/10 hover:border-green-500/40 flex items-center justify-center text-white/40 hover:text-green-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <Minus size={11} />
                        </button>
                        <span className={`text-sm font-semibold min-w-[36px] text-center ${user.strikes >= 3 ? 'text-red-400' : user.strikes >= 2 ? 'text-orange-400' : user.strikes >= 1 ? 'text-yellow-400' : 'text-white/40'}`}>
                          {user.strikes} / 3
                        </span>
                        <button
                          title="Dodaj ostrzeżenie"
                          onClick={() => handleAdjustStrikes(user.id, 1)}
                          disabled={user.strikes >= 3}
                          className="w-6 h-6 rounded-md bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <p className="text-xs text-cyan-400/60">
                        {new Date(user.created_at).toLocaleDateString('pl-PL')}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          title="Wyślij wiadomość"
                          onClick={() => handleSendMessageToUser(user.id)}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400 transition-colors"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          title="Podgląd profilu"
                          onClick={() => handleOpenProfilePreview(user.id)}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          title={user.isPopularOverride ? 'Wylacz popularnosc' : 'Wlacz popularnosc (test)'}
                          onClick={() => void handleTogglePopularOverride(user.id)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            user.isPopularOverride
                              ? 'bg-yellow-400/25 border border-yellow-400/50 text-yellow-300 hover:bg-yellow-400/35'
                              : 'bg-white/10 hover:bg-yellow-400/20 border border-white/10 hover:border-yellow-400/40 text-white/30 hover:text-yellow-300'
                          }`}
                        >
                          <Zap size={15} fill={user.isPopularOverride ? 'currentColor' : 'none'} />
                        </button>
                        {user.isBanned ? (
                          <button
                            title="Odbanuj użytkownika"
                            onClick={() => void handleToggleUserBan(user)}
                            disabled={busyUserId === user.id}
                            className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check size={16} />
                          </button>
                        ) : (
                          <button
                            title="Zbanuj użytkownika"
                            onClick={() => void handleToggleUserBan(user)}
                            disabled={busyUserId === user.id}
                            className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reports Panel */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-2xl font-light text-white mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            Zgłoszenia komentarzy
          </h2>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {reports.length > 0 ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="glass rounded-xl p-4 border border-red-500/20 hover:border-red-500/35 transition-colors"
                >
                  {/* Type badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${report.comment_type === 'wall' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' : 'bg-purple-500/15 text-purple-400 border border-purple-500/25'}`}>
                      {report.comment_type === 'wall' ? 'Tablica' : 'Zdjęcie'}
                    </span>
                    <span className="text-[10px] text-white/30 ml-auto">
                      {new Date(report.created_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Comment content */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-white/60 italic line-clamp-2">„{report.comment_content}"</p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={report.author_image || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&q=60'}
                      alt={report.author_name}
                      className="w-5 h-5 rounded-full object-cover border border-white/10"
                    />
                    <span className="text-xs text-white/80 font-medium">{report.author_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto ${report.author_strikes >= 2 ? 'bg-red-500/20 text-red-400' : report.author_strikes >= 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/30'}`}>
                      {report.author_strikes} / 3 strajków
                    </span>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-red-400/80 mb-1">
                    <span className="text-white/30">Powód:</span> {report.reason}
                  </p>
                  <p className="text-[10px] text-white/30 mb-3">
                    Zgłoszone przez: {report.reporter_name}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      title="Usuń komentarz i daj strike autorowi (3 strike = ban permanentny)"
                      onClick={() => void handleStrikeAndDelete(report)}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-400 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Usuń + Strike
                    </button>
                    <button
                      title="Odrzuć zgłoszenie bez konsekwencji"
                      onClick={() => void handleDismissReport(report.id)}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/15 text-white/60 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X size={13} />
                      Odrzuć
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-cyan-400/50 py-12">
                <Flag size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Brak zgłoszeń</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 glass rounded-2xl p-6 border border-amber-500/25">
        <h2 className="text-2xl font-light text-white mb-4 flex items-center gap-2">
          <BadgeCheck size={20} className="text-amber-400" />
          Weryfikacja selfie
        </h2>

        <p className="text-sm text-amber-100/70 mb-4">
          Kolejka selfie do akceptacji moderatora. Score SI pomaga podjac decyzje.
        </p>

        {verificationError && (
          <div className="mb-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {verificationError}
          </div>
        )}

        {verificationQueue.length === 0 ? (
          <div className="text-center text-cyan-400/50 py-10 border border-white/10 rounded-xl bg-white/[0.02]">
            <BadgeCheck size={30} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Brak selfie oczekujacych na review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {verificationQueue.map((item) => {
              const isBusy = verificationBusyId === item.id;
              const selfieSrc =
                item.selfiePreviewUrl
                || item.profileImage
                || 'https://ui-avatars.com/api/?name=Selfie&background=111827&color=e5e7eb&size=200';

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-amber-500/20 bg-black/20 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedSelfiePreview({ src: selfieSrc, profileName: item.profileName })}
                      className="relative shrink-0 overflow-hidden rounded-xl border border-amber-500/30 group/selfie"
                      title="Kliknij, aby powiekszyc selfie"
                      aria-label={`Powieksz selfie ${item.profileName}`}
                    >
                      <img
                        src={selfieSrc}
                        alt={`Selfie ${item.profileName}`}
                        className="w-20 h-20 object-cover transition-transform duration-300 group-hover/selfie:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity duration-300 group-hover/selfie:opacity-100">
                        <span className="rounded-full bg-black/70 px-2 py-1 text-[10px] text-white flex items-center gap-1">
                          <Eye size={12} />
                          Powieksz
                        </span>
                      </div>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenProfilePreview(item.profileId)}
                          className="text-white font-medium hover:text-cyan-200 transition-colors"
                        >
                          {item.profileName}
                        </button>
                        {item.profileVerified && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/35 text-emerald-200">
                            Zweryfikowany
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-cyan-200/70 mt-1">
                        {item.profileCity || 'Brak miasta'}
                        {typeof item.profileAge === 'number' ? ` • ${item.profileAge} lat` : ''}
                      </p>

                      <p className="text-xs text-amber-200/80 mt-1">
                        Score SI:{' '}
                        {typeof item.aiScore === 'number'
                          ? `${Math.round(item.aiScore * 100)} / 100`
                          : 'brak'}
                      </p>

                      <p className="text-[11px] text-white/50 mt-1">
                        {new Date(item.createdAt).toLocaleString('pl-PL')}
                      </p>
                    </div>
                  </div>

                  {item.aiReason && (
                    <p className="text-xs text-white/70 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                      {item.aiReason}
                    </p>
                  )}

                  <textarea
                    rows={2}
                    value={verificationAdminNotes[item.id] || ''}
                    onChange={(event) =>
                      setVerificationAdminNotes((prev) => ({
                        ...prev,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Notatka moderatora (opcjonalnie)..."
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleReviewVerification(item.id, 'approve')}
                      disabled={isBusy}
                      className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-100 py-2 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} />
                      {isBusy ? 'Zapisywanie...' : 'Akceptuj'}
                    </button>

                    <button
                      onClick={() => void handleReviewVerification(item.id, 'reject')}
                      disabled={isBusy}
                      className="flex-1 rounded-lg bg-red-500/15 border border-red-500/35 text-red-100 py-2 text-sm hover:bg-red-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <X size={14} />
                      {isBusy ? 'Zapisywanie...' : 'Odrzuc'}
                    </button>

                    <button
                      onClick={() => handleOpenProfilePreview(item.profileId)}
                      className="rounded-lg bg-cyan-500/15 border border-cyan-500/35 text-cyan-100 px-3 py-2 text-sm hover:bg-cyan-500/25 transition-colors flex items-center justify-center"
                      title="Podglad profilu"
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedSelfiePreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setSelectedSelfiePreview(null)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedSelfiePreview(null)}
              className="absolute right-3 top-3 z-10 rounded-full border border-white/15 bg-black/55 p-2 text-white hover:bg-black/75 transition-colors"
              aria-label="Zamknij podglad selfie"
            >
              <X size={18} />
            </button>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/70 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
              <img
                src={selectedSelfiePreview.src}
                alt={`Selfie ${selectedSelfiePreview.profileName}`}
                className="w-full max-h-[85vh] object-contain bg-black"
              />
            </div>

            <p className="mt-3 text-center text-sm text-white/75">
              Selfie do weryfikacji: {selectedSelfiePreview.profileName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
