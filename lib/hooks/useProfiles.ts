'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, SupabaseProfile, mapSupabaseProfile, filterNonAdminProfiles } from '@/lib/types';
import { MOCK_PROFILES } from '@/lib/data';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching profiles:', error);
          setError(error.message);
          setProfiles(filterNonAdminProfiles(MOCK_PROFILES));
        } else if (!data || data.length === 0) {
          console.warn('No profiles found in database, using mock data');
          setProfiles(filterNonAdminProfiles(MOCK_PROFILES));
        } else {
          const mappedProfiles = (data as SupabaseProfile[]).map(mapSupabaseProfile);
          console.log('✓ Fetched profiles from Supabase:', mappedProfiles.length);
          setProfiles(filterNonAdminProfiles(mappedProfiles));
        }
      } catch (err) {
        console.error('Exception fetching profiles:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setProfiles(filterNonAdminProfiles(MOCK_PROFILES));
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, []);

  return { profiles, loading, error };
}
