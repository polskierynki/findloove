'use client';

import { useCallback, useEffect, useState } from 'react';
import { Coins, ShoppingCart, ClockCounterClockwise, Gift, Crown, Confetti, ArrowDown, ArrowUp, Wallet } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  bonusTokens: number;
  priceGrosze: number;
  isPopular: boolean;
}

interface TokenTransaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string;
  created_at: string;
}

const PACKAGES: TokenPackage[] = [
  { id: 'starter',      name: 'Starter',   tokens: 200,  bonusTokens: 0,    priceGrosze: 900,   isPopular: false },
  { id: 'standard',     name: 'Standard',  tokens: 500,  bonusTokens: 150,  priceGrosze: 2500,  isPopular: true  },
  { id: 'popular',      name: 'Popularny', tokens: 1000, bonusTokens: 500,  priceGrosze: 5000,  isPopular: false },
  { id: 'premium_pack', name: 'Premium+',  tokens: 2000, bonusTokens: 1500, priceGrosze: 10000, isPopular: false },
];

function formatPln(grosz: number): string {
  return (grosz / 100).toFixed(2).replace('.', ',') + ' PLN';
}

function transactionIcon(type: string) {
  if (type === 'purchase')      return <ArrowDown weight="bold" className="text-emerald-400" size={15} />;
  if (type === 'welcome_bonus') return <Confetti weight="bold" className="text-amber-400" size={15} />;
  if (type === 'admin_grant')   return <Crown weight="bold" className="text-fuchsia-400" size={15} />;
  if (type === 'gift_sent')     return <Gift weight="bold" className="text-pink-400" size={15} />;
  return <ArrowUp weight="bold" className="text-white/40" size={15} />;
}

function transactionLabel(type: string): string {
  switch (type) {
    case 'purchase':        return 'Zakup';
    case 'welcome_bonus':   return 'Bonus powitalny';
    case 'admin_grant':     return 'Prezent od admina';
    case 'gift_sent':       return 'Wysłany prezent';
    case 'purchase_pending':return 'Oczekuje';
    default:                return type;
  }
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface WalletViewProps {
  onNavigate?: (view: string) => void;
}

export default function WalletView({ onNavigate }: WalletViewProps) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPackageId, setBuyingPackageId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Resolve profile ID for current auth user ──
  const resolveProfileId = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const uid = session.user.id;
    const email = session.user.email ?? null;

    // try id match
    const { data: byId } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', uid)
      .maybeSingle();
    if (byId?.id) return byId.id as string;

    // try auth_user_id match
    const { data: byAuth } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', uid)
      .maybeSingle();
    if (byAuth?.id) return byAuth.id as string;

    // try email match
    if (email) {
      const { data: byEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (byEmail?.id) return byEmail.id as string;
    }

    return null;
  }, []);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const pid = await resolveProfileId();
      if (!pid) {
        setLoading(false);
        return;
      }
      setProfileId(pid);

      // Load balance
      const { data: profileData } = await supabase
        .from('profiles')
        .select('token_balance')
        .eq('id', pid)
        .maybeSingle();
      setBalance(Number((profileData as { token_balance?: number | null } | null)?.token_balance ?? 0));

      // Load transaction history (last 30)
      const { data: txData } = await supabase
        .from('token_transactions')
        .select('id, amount, balance_after, type, description, created_at')
        .eq('profile_id', pid)
        .order('created_at', { ascending: false })
        .limit(30);

      setTransactions((txData || []) as TokenTransaction[]);
    } catch (err) {
      console.error('Error loading wallet:', err);
    } finally {
      setLoading(false);
    }
  }, [resolveProfileId]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const handleBuyPackage = async (pkg: TokenPackage) => {
    if (!profileId || buyingPackageId) return;
    setBuyingPackageId(pkg.id);
    setLastResult(null);

    try {
      const response = await fetch('/api/tokens/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, packageId: pkg.id }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        mode?: string;
        newBalance?: number;
        tokensAdded?: number;
        paymentUrl?: string;
        error?: string;
      };

      if (!response.ok || data.error) {
        setLastResult({ ok: false, message: data.error ?? 'Błąd zakupu.' });
        return;
      }

      if (data.mode === 'demo') {
        setBalance(data.newBalance ?? 0);
        setLastResult({
          ok: true,
          message: `✅ [TRYB DEMO] Dodano ${data.tokensAdded} tokenów! Nowe saldo: ${data.newBalance}`,
        });
        await loadWallet(); // refresh history
      } else if (data.mode === 'p24' && data.paymentUrl) {
        // Redirect to P24 payment page
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      console.error('Buy package error:', err);
      setLastResult({ ok: false, message: 'Błąd połączenia. Spróbuj ponownie.' });
    } finally {
      setBuyingPackageId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Coins size={36} className="text-amber-400 animate-pulse" />
        <p className="text-white/50">Ładowanie portfela…</p>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
        <Wallet size={40} className="text-white/30" />
        <p className="text-white/50 text-lg">Zaloguj się, aby zobaczyć portfel.</p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('auth')}
            className="mt-2 px-6 py-2.5 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/30 transition-colors"
          >
            Zaloguj się
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <Wallet size={28} weight="duotone" className="text-amber-400" /> Portfel
        </h1>
        <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
      </div>

      {/* ── Balance card ── */}
      <div className="glass rounded-[2rem] p-8 relative overflow-hidden border border-amber-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-sm text-amber-400/70 uppercase tracking-widest mb-2">Twoje saldo</p>
          <div className="flex items-end gap-3">
            <span className="text-6xl font-light text-white tabular-nums">
              {(balance ?? 0).toLocaleString('pl-PL')}
            </span>
            <span className="text-2xl text-amber-400 mb-2 flex items-center gap-1.5">
              <Coins size={22} weight="duotone" /> tokenów
            </span>
          </div>
          <p className="mt-3 text-sm text-white/40">
            Tokeny służą do wysyłania prezentów i specjalnych akcji na portalu.
          </p>
        </div>
      </div>

      {/* ── Notification / result ── */}
      {lastResult && (
        <div
          className={`rounded-2xl px-5 py-3.5 text-sm border ${
            lastResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {lastResult.message}
        </div>
      )}

      {/* ── Packages ── */}
      <div>
        <h2 className="text-lg font-light text-white mb-4 flex items-center gap-2">
          <ShoppingCart size={20} weight="duotone" className="text-cyan-400" /> Doładuj konto
        </h2>

        {/* Demo notice */}
        <div className="mb-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-4 py-3 text-xs text-cyan-300/80">
          💡 <strong>Tryb demo</strong> — płatności są symulowane. Aby uruchomić prawdziwe transakcje, skonfiguruj zmienne środowiskowe Przelewy24 (<code>P24_MERCHANT_ID</code>, <code>P24_POS_ID</code>, <code>P24_CRC_KEY</code>, <code>P24_API_KEY</code>).
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PACKAGES.map((pkg) => {
            const totalTokens = pkg.tokens + pkg.bonusTokens;
            const isBuying = buyingPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`relative glass rounded-2xl p-5 border transition-all ${
                  pkg.isPopular
                    ? 'border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {pkg.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[11px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full">
                    Najpopularniejszy
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-medium">{pkg.name}</p>
                    <p className="text-3xl font-light text-amber-400 mt-1">
                      {pkg.tokens.toLocaleString('pl-PL')}
                      <span className="text-base text-amber-400/60 ml-1">tokenów</span>
                    </p>
                    {pkg.bonusTokens > 0 && (
                      <p className="text-xs text-emerald-400 mt-0.5">
                        + {pkg.bonusTokens.toLocaleString('pl-PL')} bonus = {totalTokens.toLocaleString('pl-PL')} łącznie
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-white">{formatPln(pkg.priceGrosze)}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">
                      {((pkg.priceGrosze / 100) / totalTokens * 100).toFixed(1)} gr / token
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void handleBuyPackage(pkg)}
                  disabled={!!buyingPackageId}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    pkg.isPopular
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isBuying ? 'Przetwarzanie…' : `Kup za ${formatPln(pkg.priceGrosze)}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Transaction history ── */}
      <div>
        <h2 className="text-lg font-light text-white mb-4 flex items-center gap-2">
          <ClockCounterClockwise size={20} weight="duotone" className="text-fuchsia-400" /> Historia transakcji
        </h2>

        {transactions.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-white/30">
            Brak transakcji. Doładuj konto, aby zacząć!
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {transactions.map((tx, idx) => (
              <div
                key={tx.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${
                  idx < transactions.length - 1 ? 'border-b border-white/5' : ''
                } hover:bg-white/3 transition-colors`}
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  {transactionIcon(tx.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tx.description}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    {transactionLabel(tx.type)} · {new Date(tx.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('pl-PL')}
                  </p>
                  <p className="text-[11px] text-white/30 tabular-nums">
                    {tx.balance_after.toLocaleString('pl-PL')} po transakcji
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Gift value reference ── */}
      <div className="glass rounded-2xl p-5 border border-white/10">
        <p className="text-sm text-white/50 mb-3 uppercase tracking-widest text-xs">Ceny prezentów</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { emoji: '🌹', name: 'Róża',        price: 50    },
            { emoji: '💖', name: 'Serce',        price: 100   },
            { emoji: '🧸', name: 'Miś',          price: 300   },
            { emoji: '🍾', name: 'Szampan',      price: 500   },
            { emoji: '💍', name: 'Pierścionek',  price: 1000  },
            { emoji: '💎', name: 'Diament',      price: 5000  },
            { emoji: '🛥️', name: 'Jacht',       price: 10000 },
            { emoji: '🏎️', name: 'Ferrari',     price: 50000 },
          ].map((g) => (
            <div key={g.name} className="flex items-center gap-2 text-sm">
              <span className="text-xl">{g.emoji}</span>
              <div>
                <p className="text-white/70 text-xs">{g.name}</p>
                <p className="text-amber-400 font-medium">💰 {g.price.toLocaleString('pl-PL')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
