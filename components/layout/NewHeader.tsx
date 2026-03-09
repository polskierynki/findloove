'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bell, MessageCircle, Shield, Menu, X, Gift, Heart, BadgeCheck, MessageSquareText, User } from 'lucide-react';

export default function NewHeader() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    
    getUser();
  }, []);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <>
      {/* Floating Particles Background */}
      <div className="particles-container" id="particles"></div>

      {/* Fixed Top Header */}
      <header className="fixed top-0 w-full h-20 glass-panel z-50 flex items-center justify-between px-4 lg:px-8 xl:px-16 transition-all duration-300 gap-4 border-b border-white/5">
        {/* Logo */}
        <div
          className="flex-shrink-0 flex items-center gap-2 cursor-pointer group z-10"
          onClick={() => router.push('/')}
        >
          <span className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400 group-hover:text-glow-magenta transition-all duration-300">
            findloove.pl
          </span>
        </div>

        {/* Main Navigation (Hidden on mobile, centered) */}
        <nav className="hidden lg:flex flex-1 justify-center items-center gap-6 xl:gap-10 z-0">
          <button
            onClick={() => router.push('/')}
            className="nav-item active relative text-cyan-300 hover:text-cyan-100 font-medium transition-colors pb-1 whitespace-nowrap shadow-[0_0_10px_rgba(0,255,255,0.4)]"
          >
            Odkrywaj
          </button>
          <button
            onClick={() => router.push('/search')}
            className="nav-item relative text-cyan-300/60 hover:text-cyan-300 font-medium transition-colors pb-1 whitespace-nowrap"
          >
            Szukaj
          </button>
          <button
            onClick={() => router.push('/messages')}
            className="nav-item relative text-cyan-300/60 hover:text-cyan-300 font-medium transition-colors pb-1 whitespace-nowrap"
          >
            Wiadomości
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="nav-item relative text-cyan-300/60 hover:text-cyan-300 font-medium transition-colors pb-1 flex items-center gap-1.5 whitespace-nowrap"
          >
            Mój profil
          </button>
        </nav>

        {/* Right Side Icons & Avatar/Login */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 sm:gap-4 z-10">
          {/* Admin Panel */}
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              title="Panel Administratora"
              className="relative text-red-500 hover:text-white hover:bg-red-500 transition-all duration-300 flex items-center justify-center drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] bg-red-500/10 w-10 h-10 rounded-full border border-red-500/30 group"
            >
              <Shield size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Messages */}
          <button
            onClick={() => router.push('/messages')}
            className="relative text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 duration-300 w-10 h-10 flex items-center justify-center rounded-full hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]"
          >
            <MessageCircle size={26} />
            <span className="absolute top-1 right-0 w-[18px] h-[18px] bg-cyan-500 rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(0,255,255,0.8)] text-black border-2 border-[#110a22]">
              3
            </span>
          </button>

          {/* Notifications */}
          <div className="relative" id="notification-wrapper">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 duration-300 w-10 h-10 flex items-center justify-center rounded-full hover:shadow-[0_0_15px_rgba(0,255,255,0.6)]"
              id="bell-btn"
            >
              <Bell size={26} />
              <span className="absolute top-2 right-1.5 w-2.5 h-2.5 bg-fuchsia-500 rounded-full shadow-[0_0_8px_rgba(255,0,255,0.8)] border-2 border-[#110a22]"></span>
            </button>

            {/* Notification Dropdown - Enhanced with 4 notification types */}
            {notificationsOpen && (
              <div className="absolute top-full right-0 mt-4 w-80 sm:w-96 glass-modal rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[100] transform opacity-100 scale-100 transition-all duration-300 origin-top-right">
                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-black/20 flex justify-between items-center">
                  <h3 className="text-white font-medium flex items-center gap-2 text-lg">
                    <Bell size={20} className="text-fuchsia-400" /> Powiadomienia
                  </h3>
                  <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/30">
                    Oznacz przeczytane
                  </button>
                </div>

                {/* Notifications List */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {/* Item 1: Gift */}
                  <div
                    className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-4"
                    onClick={() => {
                      router.push('/profile');
                      setNotificationsOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                      <Gift size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">
                        <span className="font-medium text-white">Marek_88</span> wysłał Ci prezent (Róża)! 🌹
                      </p>
                      <p className="text-xs text-gray-500 mt-1">5 min temu</p>
                    </div>
                  </div>

                  {/* Item 2: Like */}
                  <div
                    className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-4 bg-white/[0.02]"
                    onClick={() => {
                      router.push('/profile');
                      setNotificationsOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                      <Heart size={20} className="text-red-500 fill-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">
                        <span className="font-medium text-white">Kamil</span> polubił Twój profil. Sprawdź, czy to match!
                      </p>
                      <p className="text-xs text-gray-500 mt-1">1 godz. temu</p>
                    </div>
                  </div>

                  {/* Item 3: Verification */}
                  <div
                    className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-4"
                    onClick={() => {
                      router.push('/profile');
                      setNotificationsOpen(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      <BadgeCheck size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">
                        Twój profil został pomyślnie <span className="text-blue-400 font-medium">zweryfikowany</span>.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Wczoraj, 14:30</p>
                    </div>
                  </div>

                  {/* Item 4: Comment */}
                  <div
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex gap-4"
                    onClick={() => {
                      router.push('/profile');
                      setNotificationsOpen(false);
                    }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&w=100&q=80"
                      className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                      alt="Ania_x"
                    />
                    <div>
                      <p className="text-sm text-gray-200">
                        <span className="font-medium text-white">Ania_x</span> skomentowała Twoje zdjęcie w galerii.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">2 dni temu</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 bg-black/40 text-center">
                  <button className="text-sm text-gray-400 hover:text-white transition-colors py-1 px-4 rounded-full hover:bg-white/5">
                    Zobacz wszystkie
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-white/20 mx-1 sm:mx-2 hidden sm:block"></div>

          {/* Login Button or Profile Avatar */}
          {!user ? (
            <button
              onClick={() => router.push('/auth')}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 px-5 lg:px-6 py-2 rounded-full font-medium text-sm transition-all shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]"
            >
              Zaloguj
            </button>
          ) : (
            <button
              onClick={() => router.push('/profile')}
              className="w-10 h-10 rounded-full overflow-hidden border border-cyan-500/30 hover:border-cyan-400 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]"
            >
              {profile?.image ? (
                <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {profile?.name?.charAt(0)}
                </div>
              )}
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-cyan-400 hover:text-cyan-300"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="fixed top-20 left-0 right-0 bg-black/90 backdrop-blur-lg border-b border-cyan-500/10 z-40 lg:hidden">
          <nav className="flex flex-col p-6 gap-4">
            <button
              onClick={() => {
                router.push('/');
                setMobileMenuOpen(false);
              }}
              className="text-left px-4 py-2 text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              Odkrywaj
            </button>
            <button
              onClick={() => {
                router.push('/search');
                setMobileMenuOpen(false);
              }}
              className="text-left px-4 py-2 text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              Szukaj
            </button>
            <button
              onClick={() => {
                router.push('/messages');
                setMobileMenuOpen(false);
              }}
              className="text-left px-4 py-2 text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              Wiadomości
            </button>
            <button
              onClick={() => {
                router.push('/profile');
                setMobileMenuOpen(false);
              }}
              className="text-left px-4 py-2 text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
            >
              Mój profil
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  router.push('/admin');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-4 py-2 text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 rounded-lg transition-colors"
              >
                Panel Admina
              </button>
            )}
          </nav>
        </div>
      )}

      <style jsx>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
        }
      `}</style>
      <script>{`
        document.addEventListener("DOMContentLoaded", () => {
          const container = document.getElementById('particles');
          if (!container) return;
          const colors = ['rgba(255, 0, 255, 0.4)', 'rgba(0, 255, 255, 0.4)', 'rgba(255, 215, 0, 0.2)'];
          for (let i = 0; i < 35; i++) {
            let p = document.createElement('div');
            p.className = 'particle';
            p.style.width = p.style.height = Math.random() * 3 + 1 + 'px';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.animationDuration = Math.random() * 15 + 10 + 's';
            p.style.animationDelay = Math.random() * 10 + 's';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.boxShadow = '0 0 ' + (Math.random() * 10 + 2) + 'px ' + p.style.backgroundColor;
            container.appendChild(p);
          }
        });
      `}</script>
    </>
  );
}
