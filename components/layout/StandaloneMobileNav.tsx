'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/layout/BottomNav';
import { resolveProfileIdForAuthUser } from '@/lib/profileAuth';
import type { AppView } from '@/lib/types';

const ADMIN_EMAIL = 'lio1985lodz@gmail.com';

function shouldShowStandaloneNav(pathname: string): boolean {
  if (!pathname) return false;

  if (pathname.startsWith('/profile/')) return true;
  if (pathname === '/admin') return true;
  if (pathname === '/myprofile') return true;
  if (pathname === '/notifications') return true;
  if (pathname === '/wallet') return true;

  return false;
}

export default function StandaloneMobileNav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const shouldShow = useMemo(() => shouldShowStandaloneNav(pathname || ''), [pathname]);

  useEffect(() => {
    let active = true;

    const syncAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      const user = session?.user ?? null;
      setIsLoggedIn(Boolean(user));

      if (!user) {
        setIsAdmin(false);
        return;
      }

      let role: string | null = null;
      const resolvedProfileId = await resolveProfileIdForAuthUser(user);

      if (resolvedProfileId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', resolvedProfileId)
          .maybeSingle();

        role = ((profileData as { role?: string | null } | null)?.role ?? null);
      }

      if (!active) return;

      const isAdminByRole = role === 'admin' || role === 'super_admin';
      const isAdminByEmail = (user.email || '').trim().toLowerCase() === ADMIN_EMAIL;

      setIsAdmin(isAdminByRole || isAdminByEmail);
    };

    void syncAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setIsLoggedIn(Boolean(user));

      if (!user) {
        setIsAdmin(false);
        return;
      }

      void (async () => {
        let role: string | null = null;
        const resolvedProfileId = await resolveProfileIdForAuthUser(user);

        if (resolvedProfileId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', resolvedProfileId)
            .maybeSingle();

          role = ((profileData as { role?: string | null } | null)?.role ?? null);
        }

        if (!active) return;

        const isAdminByRole = role === 'admin' || role === 'super_admin';
        const isAdminByEmail = (user.email || '').trim().toLowerCase() === ADMIN_EMAIL;

        setIsAdmin(isAdminByRole || isAdminByEmail);
      })();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!shouldShow) return null;

  return (
    <div className="md:hidden">
      <BottomNav
        currentView={'home' as AppView}
        onNavigate={() => {
          // Route navigation is handled inside BottomNav via router.push.
        }}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
      />
    </div>
  );
}
