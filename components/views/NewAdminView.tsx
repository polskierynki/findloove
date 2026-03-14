'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Activity, AlertTriangle, TrendingUp, MessageCircle, Eye, Ban, Check, X, Flag, Trash2, Plus, Minus, BadgeCheck, Camera, Zap, Coins, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { navigateToUserChat } from '@/lib/chatNavigation';
import FloatingBadgeTooltip from '@/components/ui/FloatingBadgeTooltip';

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
  isVerified: boolean;
  verificationPending: boolean;
  isNew: boolean;
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
  target_profile_id: string | null;
  target_photo_index: number | null;
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

interface VerificationSubmissionItem extends VerificationQueueItem {
  adminNote: string | null;
  reviewedAt: string | null;
}

const ADMIN_USER_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80';
const ADMIN_SELFIE_FALLBACK_IMAGE = 'https://ui-avatars.com/api/?name=Selfie&background=111827&color=e5e7eb&size=200';
const ADMIN_USER_AVATAR_SIZES = '(max-width: 768px) 44px, 40px';
const ADMIN_REPORT_AVATAR_SIZES = '20px';
const ADMIN_SELFIE_THUMB_SIZES = '80px';
const ADMIN_SELFIE_MODAL_SIZES = '(max-width: 1024px) calc(100vw - 2rem), 64rem';

export default function NewAdminView() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>([]);
  const [verificationSubmissions, setVerificationSubmissions] = useState<VerificationSubmissionItem[]>([]);
  const [selectedSelfiePreview, setSelectedSelfiePreview] = useState<{
    src: string;
    profileName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [verificationBusyId, setVerificationBusyId] = useState<string | null>(null);
  const [verificationDeleteBusyId, setVerificationDeleteBusyId] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSubmissionsError, setVerificationSubmissionsError] = useState<string | null>(null);
  const [verificationSubmissionsLoading, setVerificationSubmissionsLoading] = useState(false);
  const [verificationAdminNotes, setVerificationAdminNotes] = useState<Record<string, string>>({});

  // Token grant
  const [grantTargetId, setGrantTargetId] = useState('');
  const [grantAmount, setGrantAmount] = useState('100');
  const [grantReason, setGrantReason] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantResult, setGrantResult] = useState<{ ok: boolean; message: string } | null>(null);

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

  const loadVerificationSubmissions = async () => {
    setVerificationSubmissionsLoading(true);
    try {
      const token = await getAdminAccessToken();
      if (!token) {
        setVerificationSubmissions([]);
        setVerificationSubmissionsError('Brak aktywnej sesji admina.');
        return;
      }

      const response = await fetch('/api/admin/verification/submissions', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        submissions?: VerificationSubmissionItem[];
      };

      if (!response.ok) {
        setVerificationSubmissions([]);
        setVerificationSubmissionsError(payload.error || 'Nie udalo sie pobrac historii selfie.');
        return;
      }

      setVerificationSubmissions(payload.submissions || []);
      setVerificationSubmissionsError(null);
    } catch (error) {
      console.error('Error loading verification submissions:', error);
      setVerificationSubmissions([]);
      setVerificationSubmissionsError('Nie udalo sie pobrac historii selfie.');
    } finally {
      setVerificationSubmissionsLoading(false);
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

      const targetStatus = decision === 'approve' ? 'approved' : 'rejected';
      const reviewedAtIso = new Date().toISOString();

      setVerificationQueue((prev) => prev.filter((item) => item.id !== requestId));
      setVerificationSubmissions((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: targetStatus,
                reviewedAt: reviewedAtIso,
                adminNote: note || null,
              }
            : item,
        ),
      );
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
      // Fetch users — try full select first, fall back without is_popular_override if column missing
      let { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, image_url, created_at, status, city, strikes, is_popular_override, is_verified, verification_pending')
        .order('created_at', { ascending: false })
        .limit(200);

      if (usersError) {
        // Likely missing column (migration not run) — retry without optional columns
        const fallback = await supabase
          .from('profiles')
          .select('id, name, image_url, created_at, status, city, strikes, is_verified, verification_pending')
          .order('created_at', { ascending: false })
          .limit(200);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        usersData = fallback.data as any;
      }

      const now = Date.now();
      const NEW_ACCOUNT_MS = 7 * 24 * 3600 * 1000; // 7 days

      const mappedUsers: User[] = ((usersData || []) as Record<string, unknown>[]).map((u) => ({
        id: u.id as string,
        name: u.name as string,
        image_url: u.image_url as string,
        created_at: u.created_at as string,
        status: u.status as string,
        city: u.city as string,
        strikes: (u.strikes as number) ?? 0,
        isBanned: u.status === 'banned',
        isPopularOverride: Boolean(u.is_popular_override),
        isVerified: Boolean(u.is_verified),
        verificationPending: Boolean(u.verification_pending),
        isNew: now - Date.parse(u.created_at as string) < NEW_ACCOUNT_MS,
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

      // Resolve report target locations so admin can jump directly to problematic place
      const wallCommentIds = Array.from(
        new Set(
          rawReports
            .map((r: any) => (r.comment_type === 'wall' ? r.comment_id : null))
            .filter(Boolean),
        ),
      ) as string[];

      const photoCommentIds = Array.from(
        new Set(
          rawReports
            .map((r: any) => (r.comment_type === 'photo' ? r.photo_comment_id : null))
            .filter(Boolean),
        ),
      ) as string[];

      let wallCommentMap = new Map<string, { profile_id: string }>();
      if (wallCommentIds.length > 0) {
        const { data: wallCommentsData } = await supabase
          .from('profile_comments')
          .select('id, profile_id')
          .in('id', wallCommentIds);

        wallCommentMap = new Map(
          (wallCommentsData || []).map((item: any) => [
            item.id,
            { profile_id: item.profile_id },
          ]),
        );
      }

      let photoCommentMap = new Map<string, { profile_id: string; photo_index: number }>();
      if (photoCommentIds.length > 0) {
        const { data: photoCommentsData } = await supabase
          .from('profile_photo_comments')
          .select('id, profile_id, photo_index')
          .in('id', photoCommentIds);

        photoCommentMap = new Map(
          (photoCommentsData || []).map((item: any) => [
            item.id,
            { profile_id: item.profile_id, photo_index: item.photo_index },
          ]),
        );
      }

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
        const wallTarget = r.comment_id ? wallCommentMap.get(r.comment_id) : undefined;
        const photoTarget = r.photo_comment_id ? photoCommentMap.get(r.photo_comment_id) : undefined;

        const snapshotMatch = String(r.comment_content || '').match(/zdjecie\s*nr\s*(\d+)/i);
        const parsedPhotoIndex = snapshotMatch ? Number.parseInt(snapshotMatch[1], 10) - 1 : NaN;
        const fallbackPhotoIndex = Number.isFinite(parsedPhotoIndex) && parsedPhotoIndex >= 0
          ? parsedPhotoIndex
          : null;

        const targetProfileId =
          wallTarget?.profile_id
          || photoTarget?.profile_id
          || (r.comment_type === 'photo' && !r.photo_comment_id ? r.comment_author_id : null);

        const targetPhotoIndex =
          typeof photoTarget?.photo_index === 'number'
            ? photoTarget.photo_index
            : fallbackPhotoIndex;

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
          target_profile_id: targetProfileId || null,
          target_photo_index: targetPhotoIndex,
        };
      });

      setReports(mappedReports);

      const pendingVerifications = await loadVerificationQueue();
      await loadVerificationSubmissions();

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
    navigateToUserChat(router, userId);
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

  const handleGrantTokens = async () => {
    const targetId = grantTargetId.trim();
    const amount = parseInt(grantAmount, 10);
    const reason = grantReason.trim();

    if (!targetId) {
      setGrantResult({ ok: false, message: 'Wpisz ID profilu odbiorcy.' });
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
      setGrantResult({ ok: false, message: 'Kwota musi być liczbą całkowitą od 1 do 100 000.' });
      return;
    }

    setGrantBusy(true);
    setGrantResult(null);

    try {
      const token = await getAdminAccessToken();
      if (!token) {
        setGrantResult({ ok: false, message: 'Brak sesji admina.' });
        return;
      }

      const response = await fetch('/api/admin/tokens/grant', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: targetId, amount, reason: reason || 'Doładowanie od admina' }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        newBalance?: number;
        tokensAdded?: number;
        profileName?: string;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setGrantResult({ ok: false, message: data.error ?? 'Błąd wysyłania tokenów.' });
        return;
      }

      setGrantResult({
        ok: true,
        message: `✅ Wysłano ${data.tokensAdded} tokenów do "${data.profileName ?? targetId}". Nowe saldo: ${data.newBalance}.`,
      });
      setGrantTargetId('');
      setGrantAmount('100');
      setGrantReason('');
    } catch (err) {
      console.error('Grant tokens error:', err);
      setGrantResult({ ok: false, message: 'Błąd połączenia.' });
    } finally {
      setGrantBusy(false);
    }
  };

  const handleDeleteVerificationSubmission = async (requestId: string) => {
    if (verificationDeleteBusyId) return;

    const targetSubmission = verificationSubmissions.find((item) => item.id === requestId);
    const targetName = targetSubmission?.profileName || 'tego uzytkownika';
    const confirmed = window.confirm(
      `Czy na pewno chcesz usunac selfie zgloszone przez ${targetName}? Tej operacji nie da sie cofnac.`,
    );
    if (!confirmed) return;

    setVerificationDeleteBusyId(requestId);
    try {
      const token = await getAdminAccessToken();
      if (!token) {
        alert('Brak sesji admina. Odswiez strone i zaloguj sie ponownie.');
        return;
      }

      const response = await fetch('/api/admin/verification/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        storageWarning?: string | null;
      };

      if (!response.ok) {
        alert(payload.error || 'Nie udalo sie usunac selfie.');
        return;
      }

      const wasPending =
        targetSubmission?.status === 'pending_ai'
        || targetSubmission?.status === 'pending_admin';

      setVerificationSubmissions((prev) => prev.filter((item) => item.id !== requestId));
      setVerificationQueue((prev) => prev.filter((item) => item.id !== requestId));

      if (wasPending) {
        setStats((prev) => ({
          ...prev,
          pendingVerifications: Math.max(0, prev.pendingVerifications - 1),
        }));
      }

      const message = payload.message || 'Selfie zostalo usuniete.';
      if (payload.storageWarning) {
        alert(`${message} Uwaga: ${payload.storageWarning}`);
      } else {
        alert(message);
      }
    } catch (error) {
      console.error('Error deleting verification submission:', error);
      alert('Nie udalo sie usunac selfie.');
    } finally {
      setVerificationDeleteBusyId(null);
    }
  };

  const handleOpenReportDetails = (report: CommentReport) => {
    if (!report.target_profile_id) {
      alert('Nie udało się ustalić miejsca zgłoszenia. Komentarz lub zdjęcie mogły zostać już usunięte.');
      return;
    }

    const encodedProfileId = encodeURIComponent(report.target_profile_id);

    if (report.comment_type === 'wall') {
      const wallCommentParam = report.comment_id ? `?wallComment=${encodeURIComponent(report.comment_id)}` : '';
      router.push(`/profile/${encodedProfileId}${wallCommentParam}`);
      return;
    }

    const params = new URLSearchParams();
    params.set('comments', '1');
    params.set('photo', String(typeof report.target_photo_index === 'number' ? report.target_photo_index : 0));

    if (report.photo_comment_id) {
      params.set('photoComment', report.photo_comment_id);
    }

    router.push(`/profile/${encodedProfileId}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="relative z-10 pt-24 md:pt-28 pb-24 md:pb-16 px-4 md:px-6 lg:px-12 max-w-[2200px] mx-auto">
        <div className="mb-8 h-10 w-72 max-w-full rounded-full bg-white/10 animate-pulse" />

        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-6 mb-8">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="glass rounded-2xl p-4 md:p-6 border border-white/10 space-y-3">
              <div className="h-4 w-24 rounded-full bg-white/10 animate-pulse" />
              <div className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />
              <div className="h-3 w-16 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 glass rounded-2xl p-6 space-y-4">
            <div className="h-8 w-40 rounded-full bg-white/10 animate-pulse" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="h-11 w-11 rounded-full bg-white/10 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="h-8 w-32 rounded-full bg-white/10 animate-pulse" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
                <div className="h-3 w-20 rounded-full bg-white/10 animate-pulse" />
                <div className="h-4 w-full rounded-full bg-white/5 animate-pulse" />
                <div className="h-8 w-full rounded-xl bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 pt-24 md:pt-28 pb-24 md:pb-16 px-4 md:px-6 lg:px-12 max-w-[2200px] mx-auto">
      <h1 className="text-3xl md:text-4xl font-light text-white mb-6 md:mb-8 flex items-center gap-3">
        Panel Administratora <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-6 mb-8">
        <div className="glass rounded-2xl p-4 md:p-6 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-cyan-400 text-sm font-medium uppercase tracking-wider">Użytkownicy</h3>
            <Users className="text-cyan-400" size={24} />
          </div>
          <p className="text-2xl md:text-4xl font-light text-white">{stats.totalUsers}</p>
          <p className="text-xs text-cyan-400/60 mt-1">Łącznie</p>
        </div>

        <div className="glass rounded-2xl p-4 md:p-6 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-green-400 text-sm font-medium uppercase tracking-wider">Aktywni teraz</h3>
            <Activity className="text-green-400" size={24} />
          </div>
          <p className="text-2xl md:text-4xl font-light text-white">{stats.activeNow}</p>
          <p className="text-xs text-green-400/60 mt-1">Online</p>
        </div>

        <div className="glass rounded-2xl p-4 md:p-6 border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-red-400 text-sm font-medium uppercase tracking-wider">Zgłoszenia</h3>
            <AlertTriangle className="text-red-400" size={24} />
          </div>
          <p className="text-2xl md:text-4xl font-light text-white">{stats.newReports}</p>
          <p className="text-xs text-red-400/60 mt-1">Nowe</p>
        </div>

        <div className="glass rounded-2xl p-4 md:p-6 border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-amber-400 text-sm font-medium uppercase tracking-wider">Selfie</h3>
            <BadgeCheck className="text-amber-400" size={24} />
          </div>
          <p className="text-2xl md:text-4xl font-light text-white">{stats.pendingVerifications}</p>
          <p className="text-xs text-amber-400/60 mt-1">Do akceptacji</p>
        </div>

        <div className="glass rounded-2xl p-4 md:p-6 border border-amber-500/20 col-span-2 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-amber-400 text-sm font-medium uppercase tracking-wider">Przychody 24h</h3>
            <TrendingUp className="text-amber-400" size={24} />
          </div>
          <p className="text-2xl md:text-4xl font-light text-white">{stats.revenue24h.toLocaleString()} zł</p>
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

          <div className="md:hidden space-y-3 mb-4">
            {users.map((user) => (
              <div key={user.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start gap-3">
                  <div className="relative w-11 h-11 shrink-0 overflow-hidden rounded-full border border-white/10">
                    <Image
                      src={user.image_url || ADMIN_USER_FALLBACK_IMAGE}
                      alt={user.name}
                      fill
                      sizes={ADMIN_USER_AVATAR_SIZES}
                      className={`object-cover ${user.isBanned ? 'grayscale' : ''}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-white text-sm font-medium truncate ${user.isBanned ? 'line-through opacity-60' : ''}`}>
                      {user.name || 'Bez nazwy'}
                    </p>
                    <p className="text-xs text-cyan-400/60 truncate">{user.city || 'Brak'} • {new Date(user.created_at).toLocaleDateString('pl-PL')}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${user.isBanned ? 'bg-red-500/20 text-red-300 border border-red-500/35' : 'bg-green-500/20 text-green-300 border border-green-500/35'}`}>
                        {user.isBanned ? 'Zbanowany' : 'Aktywny'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${user.strikes >= 3 ? 'bg-red-500/20 text-red-300 border border-red-500/35' : user.strikes > 0 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/35' : 'bg-white/10 text-white/60 border border-white/15'}`}>
                        Strajki: {user.strikes}/3
                      </span>
                      {user.verificationPending && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-500/35">
                          Selfie pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button
                    title="Wiadomość"
                    onClick={() => handleSendMessageToUser(user.id)}
                    className="h-9 rounded-lg bg-white/10 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 transition-colors flex items-center justify-center"
                  >
                    <MessageCircle size={15} />
                  </button>
                  <button
                    title="Profil"
                    onClick={() => handleOpenProfilePreview(user.id)}
                    className="h-9 rounded-lg bg-white/10 hover:bg-blue-500/20 border border-white/10 text-blue-300 transition-colors flex items-center justify-center"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    title={user.isPopularOverride ? 'Wyłącz popularność' : 'Włącz popularność'}
                    onClick={() => void handleTogglePopularOverride(user.id)}
                    className={`h-9 rounded-lg border transition-colors flex items-center justify-center ${
                      user.isPopularOverride
                        ? 'bg-yellow-400/25 border-yellow-400/50 text-yellow-300'
                        : 'bg-white/10 border-white/10 text-white/40 hover:text-yellow-300 hover:border-yellow-400/40'
                    }`}
                  >
                    <Zap size={14} fill={user.isPopularOverride ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    title={user.isBanned ? 'Odbanuj' : 'Zbanuj'}
                    onClick={() => void handleToggleUserBan(user)}
                    disabled={busyUserId === user.id}
                    className={`h-9 rounded-lg border transition-colors flex items-center justify-center disabled:opacity-50 ${
                      user.isBanned
                        ? 'bg-green-500/20 border-green-500/40 text-green-300'
                        : 'bg-red-500/20 border-red-500/40 text-red-300'
                    }`}
                  >
                    {user.isBanned ? <Check size={15} /> : <Ban size={15} />}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <button
                    title="-1 strike"
                    onClick={() => handleAdjustStrikes(user.id, -1)}
                    disabled={user.strikes === 0}
                    className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-green-300 hover:border-green-500/40 disabled:opacity-30"
                  >
                    <Minus size={12} className="mx-auto" />
                  </button>
                  <span className="text-xs text-white/60 min-w-[58px] text-center">{user.strikes}/3</span>
                  <button
                    title="+1 strike"
                    onClick={() => handleAdjustStrikes(user.id, 1)}
                    disabled={user.strikes >= 3}
                    className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-red-300 hover:border-red-500/40 disabled:opacity-30"
                  >
                    <Plus size={12} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
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
                        <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-full border border-white/10">
                          <Image
                            src={user.image_url || ADMIN_USER_FALLBACK_IMAGE}
                            alt={user.name}
                            fill
                            sizes={ADMIN_USER_AVATAR_SIZES}
                            className={`object-cover ${user.isBanned ? 'grayscale' : ''}`}
                          />
                        </div>
                        <div>
                          <p className={`text-white text-sm font-medium ${user.isBanned ? 'line-through opacity-60' : ''}`}>
                            {user.name || 'Bez nazwy'}
                          </p>
                          <p className="text-xs text-cyan-400/60">{user.city || 'Brak'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <FloatingBadgeTooltip content={user.isBanned ? 'Konto zbanowane' : 'Konto aktywne'}>
                          <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center border ${
                            user.isBanned
                              ? 'bg-red-500/20 border-red-500/45 text-red-400'
                              : 'bg-green-500/20 border-green-500/45 text-green-300'
                          }`}>
                            {user.isBanned ? <Ban size={13} /> : <Check size={13} />}
                          </span>
                        </FloatingBadgeTooltip>

                        <FloatingBadgeTooltip
                          content={
                            user.isVerified
                              ? 'Tozsamosc zweryfikowana'
                              : user.verificationPending
                              ? 'Selfie oczekuje na decyzje moderatora'
                              : 'Brak weryfikacji selfie'
                          }
                        >
                          <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center border ${
                            user.isVerified
                              ? 'bg-green-500/20 border-green-500/45 text-emerald-300'
                              : user.verificationPending
                              ? 'bg-yellow-500/20 border-yellow-500/45 text-yellow-300'
                              : 'bg-red-500/20 border-red-500/45 text-red-300'
                          }`}>
                            {user.isVerified ? <BadgeCheck size={13} /> : user.verificationPending ? <Camera size={13} /> : <X size={13} />}
                          </span>
                        </FloatingBadgeTooltip>

                        <FloatingBadgeTooltip
                          content={
                            user.strikes >= 3
                              ? `Krytyczny stan: ${user.strikes}/3 strajkow`
                              : user.strikes > 0
                              ? `Ostrzezenie: ${user.strikes}/3 strajkow`
                              : 'Brak strajkow'
                          }
                        >
                          <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center border ${
                            user.strikes >= 3
                              ? 'bg-red-500/20 border-red-500/45 text-red-300'
                              : user.strikes > 0
                              ? 'bg-yellow-500/20 border-yellow-500/45 text-yellow-300'
                              : 'bg-green-500/20 border-green-500/45 text-green-300'
                          }`}>
                            <Flag size={13} />
                          </span>
                        </FloatingBadgeTooltip>

                        {user.isNew && (
                          <FloatingBadgeTooltip content="Nowe konto (do 7 dni)">
                            <span className="w-7 h-7 rounded-full inline-flex items-center justify-center border bg-yellow-500/20 border-yellow-500/45 text-yellow-300">
                              <Users size={13} />
                            </span>
                          </FloatingBadgeTooltip>
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
            Zgłodszenia
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
                    <div className="relative w-5 h-5 shrink-0 overflow-hidden rounded-full border border-white/10">
                      <Image
                        src={report.author_image || ADMIN_USER_FALLBACK_IMAGE}
                        alt={report.author_name}
                        fill
                        sizes={ADMIN_REPORT_AVATAR_SIZES}
                        className="object-cover"
                      />
                    </div>
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
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      title="Przejdź do miejsca zgłoszenia"
                      onClick={() => handleOpenReportDetails(report)}
                      className="bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-300 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye size={13} />
                      Szczegóły
                    </button>
                    <button
                      title="Usuń komentarz i daj strike autorowi (3 strike = ban permanentny)"
                      onClick={() => void handleStrikeAndDelete(report)}
                      className="bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-400 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Usuń + Strike
                    </button>
                    <button
                      title="Odrzuć zgłoszenie bez konsekwencji"
                      onClick={() => void handleDismissReport(report.id)}
                      className="bg-white/5 hover:bg-white/10 border border-white/15 text-white/60 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
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
                || ADMIN_SELFIE_FALLBACK_IMAGE;

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
                      <Image
                        src={selfieSrc}
                        alt={`Selfie ${item.profileName}`}
                        width={80}
                        height={80}
                        sizes={ADMIN_SELFIE_THUMB_SIZES}
                        className="h-20 w-20 object-cover transition-transform duration-300 group-hover/selfie:scale-105"
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

      <div className="mt-8 glass rounded-2xl p-6 border border-cyan-500/25">
        <h2 className="text-2xl font-light text-white mb-4 flex items-center gap-2">
          <Camera size={20} className="text-cyan-300" />
          Wszystkie zgłoszone selfie
        </h2>

        <p className="text-sm text-cyan-100/70 mb-4">
          Archiwum zawiera każde selfie wysłane do weryfikacji. Użytkownik nie może sam usunąć selfie, ale administrator może je usunąć tutaj.
        </p>

        {verificationSubmissionsError && (
          <div className="mb-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {verificationSubmissionsError}
          </div>
        )}

        {verificationSubmissionsLoading ? (
          <div className="text-center text-cyan-400/60 py-8">Ladowanie archiwum selfie...</div>
        ) : verificationSubmissions.length === 0 ? (
          <div className="text-center text-cyan-400/50 py-10 border border-white/10 rounded-xl bg-white/[0.02]">
            <Camera size={30} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Brak zapisanych zgłoszeń selfie.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {verificationSubmissions.map((item) => {
              const isDeleting = verificationDeleteBusyId === item.id;
              const selfieSrc =
                item.selfiePreviewUrl
                || item.profileImage
                || ADMIN_SELFIE_FALLBACK_IMAGE;

              const statusClass =
                item.status === 'approved'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
                  : item.status === 'rejected'
                  ? 'bg-red-500/15 border-red-500/35 text-red-200'
                  : 'bg-amber-500/15 border-amber-500/35 text-amber-200';

              const statusLabel =
                item.status === 'approved'
                  ? 'Zaakceptowane'
                  : item.status === 'rejected'
                  ? 'Odrzucone'
                  : 'Oczekuje';

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-cyan-500/20 bg-black/20 p-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedSelfiePreview({ src: selfieSrc, profileName: item.profileName })}
                      className="relative shrink-0 overflow-hidden rounded-xl border border-cyan-500/30 group/selfie"
                      title="Kliknij, aby powiekszyc selfie"
                    >
                      <Image
                        src={selfieSrc}
                        alt={`Selfie ${item.profileName}`}
                        width={80}
                        height={80}
                        sizes={ADMIN_SELFIE_THUMB_SIZES}
                        className="h-20 w-20 object-cover transition-transform duration-300 group-hover/selfie:scale-105"
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleOpenProfilePreview(item.profileId)}
                          className="text-white font-medium hover:text-cyan-200 transition-colors"
                        >
                          {item.profileName}
                        </button>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {item.profileVerified && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/35 text-emerald-200">
                            Konto zweryfikowane
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-cyan-200/70 mt-1">
                        {item.profileCity || 'Brak miasta'}
                        {typeof item.profileAge === 'number' ? ` • ${item.profileAge} lat` : ''}
                      </p>

                      <p className="text-xs text-white/60 mt-1">
                        Dodano: {new Date(item.createdAt).toLocaleString('pl-PL')}
                        {item.reviewedAt ? ` • Decyzja: ${new Date(item.reviewedAt).toLocaleString('pl-PL')}` : ''}
                      </p>

                      {item.aiReason && (
                        <p className="text-xs text-white/70 mt-1">Ocena SI: {item.aiReason}</p>
                      )}

                      {item.adminNote && (
                        <p className="text-xs text-cyan-200/80 mt-1">Notatka moderatora: {item.adminNote}</p>
                      )}
                    </div>

                    <button
                      onClick={() => void handleDeleteVerificationSubmission(item.id)}
                      disabled={isDeleting}
                      className="rounded-lg bg-red-500/15 border border-red-500/35 text-red-100 px-4 py-2 text-sm hover:bg-red-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      title="Usuń selfie i wpis weryfikacyjny"
                    >
                      <Trash2 size={14} />
                      {isDeleting ? 'Usuwanie...' : 'Usuń selfie'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Token Grant Section */}
      <div className="mt-8 glass rounded-2xl p-6 border border-fuchsia-500/25">
        <h2 className="text-2xl font-light text-white mb-4 flex items-center gap-2">
          <Coins size={20} className="text-fuchsia-400" />
          Wyślij tokeny użytkownikowi
        </h2>

        <p className="text-sm text-white/50 mb-5">
          Wpisz ID profilu odbiorcy, liczbę tokenów i powód. Operacja zostanie zalogowana i pojawi się w historii transakcji użytkownika.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-1">
            <label className="text-xs text-fuchsia-300/70 uppercase tracking-wider mb-1.5 block">ID profilu odbiorcy</label>
            <input
              type="text"
              placeholder="uuid profilu..."
              value={grantTargetId}
              onChange={(e) => setGrantTargetId(e.target.value)}
              className="w-full bg-black/30 border border-white/10 focus:border-fuchsia-400/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all font-mono"
              disabled={grantBusy}
            />
          </div>
          <div>
            <label className="text-xs text-fuchsia-300/70 uppercase tracking-wider mb-1.5 block">Liczba tokenów</label>
            <div className="flex items-center gap-2">
              {[50, 100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setGrantAmount(String(preset))}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    grantAmount === String(preset)
                      ? 'bg-fuchsia-500/30 border-fuchsia-500/50 text-fuchsia-200'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                  disabled={grantBusy}
                >
                  {preset}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={100000}
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-24 bg-black/30 border border-white/10 focus:border-fuchsia-400/50 rounded-xl px-3 py-2 text-sm text-white outline-none text-center"
                disabled={grantBusy}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-fuchsia-300/70 uppercase tracking-wider mb-1.5 block">Powód / opis</label>
            <input
              type="text"
              placeholder="np. Nagroda za aktywność"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              className="w-full bg-black/30 border border-white/10 focus:border-fuchsia-400/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
              disabled={grantBusy}
            />
          </div>
        </div>

        {grantResult && (
          <div
            className={`mb-4 rounded-xl px-4 py-2.5 text-sm border ${
              grantResult.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {grantResult.message}
          </div>
        )}

        {/* User quick-pick from list */}
        <div className="mb-4">
          <p className="text-xs text-white/30 mb-2">Lub wybierz z listy użytkowników:</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {users.slice(0, 20).map((u) => (
              <button
                key={u.id}
                onClick={() => setGrantTargetId(u.id)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  grantTargetId === u.id
                    ? 'bg-fuchsia-500/30 border-fuchsia-500/50 text-fuchsia-200'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
                disabled={grantBusy}
              >
                {u.name || 'Bez nazwy'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => void handleGrantTokens()}
          disabled={grantBusy || !grantTargetId.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          <Send size={15} />
          {grantBusy ? 'Wysyłanie…' : `Wyślij ${grantAmount} tokenów`}
        </button>
      </div>

      {selectedSelfiePreview && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
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
              <Image
                src={selectedSelfiePreview.src}
                alt={`Selfie ${selectedSelfiePreview.profileName}`}
                width={1200}
                height={1600}
                sizes={ADMIN_SELFIE_MODAL_SIZES}
                className="h-auto w-full max-h-[85vh] object-contain bg-black"
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
