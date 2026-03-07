'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminReport, Profile, SupabaseProfile, mapSupabaseProfile } from '@/lib/types';

const AdminDashboard = () => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [reportsResponse, profilesResponse] = await Promise.all([
        supabase.from('admin_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);

      if (!reportsResponse.error && reportsResponse.data) {
        setReports(reportsResponse.data as AdminReport[]);
      }

      if (!profilesResponse.error && profilesResponse.data) {
        setProfiles((profilesResponse.data as SupabaseProfile[]).map(mapSupabaseProfile));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    return {
      totalReports: reports.length,
      totalProfiles: profiles.length,
      pendingReports: reports.filter((r) => r.status === 'pending').length,
    };
  }, [reports, profiles]);

  if (loading) {
    return <div className="p-8 text-center">Ladowanie danych panelu...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Panel Administratora</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white shadow rounded-lg">
          <p className="text-sm text-gray-500">Zgloszenia</p>
          <p className="text-2xl font-semibold">{stats.totalReports}</p>
        </div>
        <div className="p-4 bg-white shadow rounded-lg">
          <p className="text-sm text-gray-500">Uzytkownicy</p>
          <p className="text-2xl font-semibold">{stats.totalProfiles}</p>
        </div>
        <div className="p-4 bg-white shadow rounded-lg">
          <p className="text-sm text-gray-500">Oczekujace</p>
          <p className="text-2xl font-semibold text-red-500">{stats.pendingReports}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{report.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(report.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
