'use client';

import { useEffect, useState } from 'react';
import { Users, Activity, AlertTriangle, TrendingUp, MessageCircle, Eye, Ban, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
  status: string;
  city: string;
  isBanned: boolean;
}

interface Report {
  id: string;
  reporter_name: string;
  reported_user_name: string;
  reported_user_id: string;
  reason: string;
  created_at: string;
}

export default function NewAdminView() {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeNow: 0,
    newReports: 0,
    revenue24h: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, image_url, created_at, status, city')
        .order('created_at', { ascending: false })
        .limit(20);

      const mappedUsers: User[] = (usersData || []).map((u) => ({
        ...u,
        isBanned: u.status === 'banned',
      }));

      setUsers(mappedUsers);

      // Fetch reports (mock for demo)
      setReports([
        {
          id: '1',
          reporter_name: 'Anna K.',
          reported_user_name: 'Jan N.',
          reported_user_id: '123',
          reason: 'Nieodpowiednie treści',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          reporter_name: 'Michał P.',
          reported_user_name: 'Kasia M.',
          reported_user_id: '456',
          reason: 'Spam',
          created_at: new Date().toISOString(),
        },
      ]);

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const activeNow = Math.floor(totalUsers * 0.15); // Mock
      const newReports = 2;
      const revenue24h = 12450;

      setStats({ totalUsers, activeNow, newReports, revenue24h });
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
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
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: false, status: 'active' } : u))
      );
    } catch (err) {
      console.error('Error unbanning user:', err);
      alert('Błąd przy odblokowaniu użytkownika');
    }
  };

  const handleResolveReport = (reportId: string, shouldBan: boolean) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    if (shouldBan) {
      handleBanUser(report.reported_user_id);
    }

    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setStats((prev) => ({ ...prev, newReports: prev.newReports - 1 }));
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm text-cyan-400 font-medium pb-3 px-2">Użytkownik</th>
                  <th className="text-left text-sm text-cyan-400 font-medium pb-3 px-2">Status</th>
                  <th className="text-left text-sm text-cyan-400 font-medium pb-3 px-2">Data Reg.</th>
                  <th className="text-right text-sm text-cyan-400 font-medium pb-3 px-2">Akcje</th>
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
                            {user.name || 'Bez nazwы'}
                          </p>
                          <p className="text-xs text-cyan-400/60">{user.city || 'Brak'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs px-2 py-1 rounded-full">
                          Zbanowany
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-500/20 border border-green-500/40 text-green-400 text-xs px-2 py-1 rounded-full">
                          Aktywny
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-xs text-cyan-400/60">
                        {new Date(user.created_at).toLocaleDateString('pl-PL')}
                      </p>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2 justify-end">
                        <button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400 transition-colors">
                          <MessageCircle size={16} />
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400 transition-colors">
                          <Eye size={16} />
                        </button>
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUnbanUser(user.id)}
                            className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center text-green-400 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanUser(user.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors"
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
            Zgłoszenia
          </h2>

          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="glass rounded-xl p-4 border border-red-500/20 hover:border-red-500/40 transition-colors"
                >
                  <div className="mb-3">
                    <p className="text-xs text-cyan-400/60 mb-1">
                      Zgłaszający: <span className="text-white">{report.reporter_name}</span>
                    </p>
                    <p className="text-sm text-white font-medium">
                      Zgłoszony: {report.reported_user_name}
                    </p>
                    <p className="text-xs text-red-400 mt-1">{report.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveReport(report.id, true)}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Ban size={14} />
                      Zbanuj
                    </button>
                    <button
                      onClick={() => handleResolveReport(report.id, false)}
                      className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <X size={14} />
                      Odrzuć
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-cyan-400/50 py-12">
                <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Brak zgłoszeń</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
