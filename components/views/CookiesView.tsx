'use client';

import { ChevronLeft } from 'lucide-react';

interface CookiesViewProps {
  onBack: () => void;
}

export default function CookiesView({ onBack }: CookiesViewProps) {
  return (
    <div className="max-w-4xl mx-auto pb-32">
      {/* ── Header ── */}
      <div className="mb-8 animate-in slide-in-from-right duration-400">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
        >
          <ChevronLeft size={20} />
          Wróć
        </button>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Polityka cookies portalu findloove.pl</h1>
        <p className="text-slate-500 text-sm">Ostatnia aktualizacja: 6 marca 2026</p>
      </div>

      {/* ── Content ── */}
      <div className="prose prose-slate max-w-none bg-white p-8 rounded-lg shadow-sm">
        
        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Czym są cookies?</h2>
        <p>
          Cookies (pliki ciasteczka) to małe pliki tekstowe zapisywane na Twoim urządzeniu przez przeglądarkę. 
          Używane są do zapamiętywania informacji o Tobie i Twojej aktywności na stronie.
        </p>
        <p>
          Cookies mogą być:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>Sesyjne:</strong> Usuwane po zamknięciu przeglądarki</li>
          <li><strong>Trwałe:</strong> Pozostają na urządzeniu przez okres do 12 miesięcy</li>
          <li><strong>Własne:</strong> Ustawiane przez portal findloove.pl</li>
          <li><strong>Trzecich stron:</strong> Ustawiane przez dostawców (np. Google Analytics)</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Jakie cookies używamy?</h2>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">2.1. Cookies niezbędne (zawsze aktywne)</h3>
        <p>
          Wymagane do funkcjonowania portalu. <strong>Nie wymagają zgody.</strong>
        </p>
        <table className="w-full border-collapse my-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left">Nazwa</th>
              <th className="border border-slate-300 p-2 text-left">Opis</th>
              <th className="border border-slate-300 p-2 text-left">Czas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2"><code>session_token</code></td>
              <td className="border border-slate-300 p-2">Identyfikator sesji logowania</td>
              <td className="border border-slate-300 p-2">Sesyjna</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"><code>auth_jwt</code></td>
              <td className="border border-slate-300 p-2">Token autentykacji</td>
              <td className="border border-slate-300 p-2">7 dni</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"><code>user_theme</code></td>
              <td className="border border-slate-300 p-2">Preferencja trybu (jasny/ciemny)</td>
              <td className="border border-slate-300 p-2">12 miesięcy</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"><code>csrf_token</code></td>
              <td className="border border-slate-300 p-2">Bezpieczeństwo (CSRF protection)</td>
              <td className="border border-slate-300 p-2">Sesyjna</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"><code>cookie_consent</code></td>
              <td className="border border-slate-300 p-2">Zapamiętanie Twojej zgody na cookies</td>
              <td className="border border-slate-300 p-2">12 miesięcy</td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">2.2. Cookies analityczne (wymagają zgody)</h3>
        <p>
          Pomagają nam zrozumieć, jak używasz portalu. Zbierane dane są <strong>anonimowe</strong> 
          (nie łączymy ich z Twoją tożsamością).
        </p>
        <table className="w-full border-collapse my-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left">Dostawca</th>
              <th className="border border-slate-300 p-2 text-left">Cookies</th>
              <th className="border border-slate-300 p-2 text-left">Cel</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2"><strong>Google Analytics 4</strong></td>
              <td className="border border-slate-300 p-2"><code>_ga</code>, <code>_ga_*</code>, <code>_gid</code></td>
              <td className="border border-slate-300 p-2">Analityka stron, ścieżki użytkownika, źródła ruchu</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"><strong>Hotjar</strong></td>
              <td className="border border-slate-300 p-2"><code>_hjid</code>, <code>_hjc</code></td>
              <td className="border border-slate-300 p-2">Mapy ciepła, nagrania sesji (opcjonalne)</td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">2.3. Cookies marketingowe (wymagają zgody)</h3>
        <p>
          Używane do retargetingu i personalizacji ogłoszeń. <strong>Nie kupujemy Twoich danych.</strong>
        </p>
        <table className="w-full border-collapse my-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left">Dostawca</th>
              <th className="border border-slate-300 p-2 text-left">Cookies</th>
              <th className="border border-slate-300 p-2 text-left">Cel</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2"><strong>Facebook Pixel</strong></td>
              <td className="border border-slate-300 p-2"><code>_fbp</code>, <code>_fbc</code></td>
              <td className="border border-slate-300 p-2">Retargeting na Facebooku (pokaż Ci ogłoszenia gdy odwiedzisz FB)</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"><strong>Google Ads</strong></td>
              <td className="border border-slate-300 p-2"><code>_gac_*</code></td>
              <td className="border border-slate-300 p-2">Retargeting na Google Search & Display Network</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Jak zarządzać cookies?</h2>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">3.1. W portalu findloove.pl</h3>
        <p>
          Przejdź do <strong>Ustawienia → Preferencje → Cookies</strong> i zmień zgody.
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>✅ Akceptuj wszystkie</li>
          <li>❌ Odrzuć nienezbędne nur</li>
          <li>⚙️ Dostosuj (wybierz które analityczne/marketingowe)</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">3.2. W przeglądarce</h3>
        <p>
          Możesz usunąć cookies lub ustawić automatyczne usuwanie:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>Chrome:</strong> Ustawienia → Prywatność i bezpieczeństwo → Cookies i dane stron</li>
          <li><strong>Firefox:</strong> Ustawienia → Prywatność → Cookies i dane witryn</li>
          <li><strong>Safari:</strong> Preferencje → Prywatność → Zarządzaj danymi strony</li>
          <li><strong>Edge:</strong> Ustawienia → Prywatność, wyszukiwanie i usługi → Wyczyść dane przeglądania</li>
        </ul>

        <p>
          <strong>⚠️ Uwaga!</strong> Usunięcie cookies może wylogować Cię z konta i usunąć preferencje.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">3.3. Do Not Track (DNT)</h3>
        <p>
          Jeśli masz włączoną opcję "Do Not Track" w przeglądarce, próbujemy ją respektować 
          (np. nie śledzić w Google Analytics).
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Cookies mobilne (aplicja na iOS/Android)</h2>
        <p>
          Choć aplikacja mobilna nie używa tradycyjnych cookies HTML, stosuje podobne technologie:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>Local Storage:</strong> Przechowywanie tokenów i preferencji</li>
          <li><strong>Analytics SDK:</strong> Firebase Analytics (możliwość wyłączenia w ustawieniach)</li>
          <li><strong>Advertising ID:</strong> Dla celów marketingu (IDFA na iOS, Advertising ID na Android)</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Cookies dostawców trzecich</h2>
        <p>
          Kiedy klikasz na linki zewnętrzne (np. link do profilu na Facebooku), 
          Facebook, Google i inne serwisy mogą ustawiać własne cookies. 
          <strong>My nie kontrolujemy ich politykę.</strong> 
          Zalecamy przeczytanie ich zasad prywatności.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Jeśli nie wyrazisz zgody</h2>
        <ul className="ml-6 my-4 space-y-2">
          <li>✅ Portal będzie działać normalnie</li>
          <li>❌ Nie będziemy zbierać danych analitycznych</li>
          <li>❌ Nie będziesz widział spersonalizowanych ogłoszeń na Facebooku/Google</li>
          <li>❌ Nie będziemy mogli optymalizować doświadczenia użytkownika</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Zmiana zgody na cookies</h2>
        <p>
          Możesz zmienić decyzję o cookies w dowolnym momencie w <strong>Preferencjach RODO</strong> 
          w ustawieniach profilu. Zmiana zaczyna obowiązywać od razu po naciśnięciu "Zapisz".
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Jak długo przechowujemy cookies?</h2>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>Sesyjne:</strong> Do zamknięcia przeglądarki</li>
          <li><strong>Analityczne (GA):</strong> Do 2 lat</li>
          <li><strong>Marketingowe (Facebook, Google):</strong> Do 12 miesięcy</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Bezpieczeństwo cookies</h2>
        <p>
          Cookies zawierające wrażliwe dane (np. token autentykacji) są:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>HttpOnly:</strong> Niedostępne dla JavaScriptu (ochrona przed XSS)</li>
          <li><strong>Secure:</strong> Przesyłane tylko przez HTTPS</li>
          <li><strong>SameSite:</strong> Chroni przed CSRF (Cross-Site Request Forgery)</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Kontakt i pytania</h2>
        <p>
          Jeśli masz pytania o cookies lub naszą politykę:
        </p>
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 my-4">
          <p><strong>E-mail:</strong> cookies@findloove.pl</p>
          <p><strong>Telefon:</strong> +48 123 456 789</p>
          <p><strong>Live Chat:</strong> Dostępny w portalu 24/7</p>
        </div>

        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 mt-8">
          <p className="text-sm text-slate-700">
            <strong>Dziękujemy za przeczytanie!</strong><br />
            Cookies pomagają nam ulepszać portal dla Ciebie.<br />
            © 2026 findloove.pl sp. z o.o. Wszelkie prawa zastrzeżone.
          </p>
        </div>

      </div>
    </div>
  );
}
