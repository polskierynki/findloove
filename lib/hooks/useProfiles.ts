'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, SupabaseProfile, mapSupabaseProfile, filterNonAdminProfiles } from '@/lib/types';
import { MOCK_PROFILES } from '@/lib/data';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>(MOCK_PROFILES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // fallback do danych testowych
        setProfiles(filterNonAdminProfiles(MOCK_PROFILES));
        if (error) setError(error.message);
      } else {
        const mappedProfiles = (data as SupabaseProfile[]).map(mapSupabaseProfile);
        setProfiles(filterNonAdminProfiles(mappedProfiles));
      }
      setLoading(false);
    }

    fetchProfiles();
  }, []);

  return { profiles, loading, error };
}
