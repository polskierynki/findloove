'use client';

import { ChevronLeft } from 'lucide-react';

interface PrivacyViewProps {
  onBack: () => void;
}

export default function PrivacyView({ onBack }: PrivacyViewProps) {
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
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Polityka prywatności portalu findloove.pl</h1>
        <p className="text-slate-500 text-sm">Ostatnia aktualizacja: 6 marca 2026</p>
      </div>

      {/* ── Content ── */}
      <div className="prose prose-slate max-w-none bg-white p-8 rounded-lg shadow-sm">
        
        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Wstęp</h2>
        <p>
          Szanujemy Twoją prywatność. Niniejsza Polityka Prywatności wyjaśnia, jak portal <strong>findloove.pl</strong> 
          zbiera, wykorzystuje, przechowuje i chroni Twoje dane osobowe. 
          Lektura tej polityki jest ważna dla zrozumienia naszych praktyk bezpieczeństwa.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Administrator danych i kontakt RODO</h2>
        <p>
          <strong>Administrator danych:</strong> findloove.pl sp. z o.o., ul. Wiśniowa 15, 00-000 Warszawa<br />
          <strong>E-mail:</strong> rodo@findloove.pl<br />
          <strong>Dane rejestru:</strong> KRS 1234567, NIP 1234567890
        </p>
        <p>
          Do pytań dotyczących przetwarzania Twoich danych odpowiada nasz Inspektora Ochrony Danych (IOD).
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Jakie dane zbieramy?</h2>
        <p>
          3.1. <strong>Dane podane przy rejestracji:</strong>
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Imię, wiek, miasto, płeć biologiczna</li>
          <li>Adres e-mail i numer telefonu</li>
          <li>Hasło (zakodowane)</li>
          <li>Biografia, zainteresowania, orientacja seksualna</li>
          <li>Zdjęcia profilowe i galeria</li>
          <li>Informacje o weryfikacji (np. selfie do weryfikacji twarzy)</li>
        </ul>

        <p>
          3.2. <strong>Dane zbierane automatycznie:</strong>
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Adres IP, typ przeglądarki, system operacyjny</li>
          <li>Historia aktywności (kiedy logowałeś się, które profile oglądałeś)</li>
          <li>Cookies i piksele śledzące</li>
          <li>Informacje o lokalizacji (jeśli wyrazisz zgodę)</li>
          <li>Dane o interakcjach (polubienia, wiadomości, blokady)</li>
        </ul>

        <p>
          3.3. <strong>Dane od partnerów (opcjonalnie):</strong>
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Dane z systemów weryfikacji twarzy (FaceMatch AI)</li>
          <li>Dane z dostawców płatności (stripe, PayU) — tylko wymagane dla transakcji</li>
          <li>Dane z mediów społecznych (jeśli zalogowałeś się przez Facebook/Google)</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Cel i podstawa prawna przetwarzania</h2>
        <p>
          4.1. Przetwarzamy Twoje dane na podstawie:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>Umowa:</strong> Świadczenie usługi portalu (art. 6 ust. 1 lit. b RODO)</li>
          <li><strong>Zgoda:</strong> Marketing, cookies analityczne, weryfikacja twarzy (art. 6 ust. 1 lit. a RODO)</li>
          <li><strong>Obowiązek prawny:</strong> Podatki, sprawozdania do urzędów (art. 6 ust. 1 lit. c RODO)</li>
          <li><strong>Interes uzasadniony:</strong> Bezpieczeństwo, przeciwdziałanie oszustom (art. 6 ust. 1 lit. f RODO)</li>
        </ul>

        <p>
          4.2. Konkretne cele:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Założenie i zarządzanie kontem</li>
          <li>Świadczenie funkcji (wyszukiwanie, wiadomości, galeria)</li>
          <li>Weryfikacja bezpieczeństwa i zapobieganie oszustom</li>
          <li>Obsługa płatności i Serduszek</li>
          <li>Poprawianie doświadczenia użytkownika (analityka)</li>
          <li>Wysyłka informacji o nowych funkcjach (newsletter)</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Z kim dzielimy Twoje dane?</h2>
        <p>
          5.1. Twoje dane są widoczne dla innych Użytkowników w zakresie: 
          imię, wiek, miasto, bio, zainteresowania, zdjęcia, status weryfikacji.
        </p>

        <p>
          5.2. <strong>Podwykonawcy (przetwarzający na naszą zlecenie):</strong>
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>Supabase:</strong> Baza danych (hosting w Europie, RODO compliant)</li>
          <li><strong>PayU / Stripe:</strong> Przetwarzanie płatności</li>
          <li><strong>SendGrid:</strong> Wysyłanie e-maili (spam – nie wysyłamy!)</li>
          <li><strong>Google Analytics:</strong> Analityka anonimowa (bez osobowych danych)</li>
          <li><strong>Veriff / FaceMatch:</strong> Weryfikacja twarzy (opcjonalne)</li>
        </ul>

        <p>
          5.3. <strong>Ujawnianie obligatoryjne:</strong> 
          Możemy ujawnić dane wymagane przez prawo (policja, prokuratura, sąd).
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Jak długo przechowujemy Twoje dane?</h2>
        <p>
          6.1. <strong>Aktywne konto:</strong> Dane przechowywane są całą czas, aż do usunięcia konta.
        </p>
        <p>
          6.2. <strong>Po usunięciu konta:</strong> 
          Dane osobowe usuwane są w ciągu 30 dni. Wiadomości mogą pozostać dla drugiej strony.
        </p>
        <p>
          6.3. <strong>Dane archiwalne:</strong> 
          Dla celów prawnych i bezpieczeństwa (np. przeciwdziałanie oszustom) możemy przechowywać 
          część danych przez do 3 lat.
        </p>
        <p>
          6.4. <strong>Cookies:</strong> Przechowywane przez okres do 12 miesięcy (analityczne i marketingowe).
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Transfery danych poza UE</h2>
        <p>
          Twoje dane są przechowywane na serwerach w Europie (datacenter Supabase w Irlandii/Niemczech). 
          W razie przesyłki danych do krajów spoza UE (np. API dostawców w USA), 
          stosujemy standardowe klauzule umowne RODO.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Bezpieczeństwo danych</h2>
        <p>
          8.1. Stosujemy:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Szyfrowanie SSL/TLS dla transmisji (HTTPS)</li>
          <li>Hasła kodowane algorytmem bcrypt</li>
          <li>Dostęp ograniczony do upoważnionych pracowników</li>
          <li>Regularne audyty bezpieczeństwa</li>
          <li>Backup i recovery plan</li>
        </ul>
        <p>
          8.2. <strong>Wciąż ryzyko!</strong> 
          Żaden system nie jest 100% bezpieczny. Zachęcamy do używania silnych haseł, 
          weryfikacji 2FA i ostrożności przy kliknięciu linków.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Twoje prawa RODO</h2>
        <p>
          Masz prawo do:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li><strong>Dostępu:</strong> Żądanie dostępu do swoich danych (SAR – Subject Access Request)</li>
          <li><strong>Sprostowania:</strong> Zmiana błędnych danych</li>
          <li><strong>Usunięcia („prawo być zapomnianym"):</strong> Usunięcie danych, z wyjątkami prawnymi</li>
          <li><strong>Ograniczenia przetwarzania:</strong> Zawieszenie niektórych operacji na dane</li>
          <li><strong>Przenoszenia danych:</strong> Otrzymanie danych w formacie maszynowo czytelnym</li>
          <li><strong>Sprzeciwu:</strong> Sprzeciw wobec przetwarzania dla celów marketingu</li>
          <li><strong>Wycofania zgody:</strong> W dowolnym momencie</li>
        </ul>
        <p>
          Żeby skorzystać, napisz na <strong>rodo@findloove.pl</strong> lub użyj panelu ustawień profilu.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Cookies i tracking</h2>
        <p>
          10.1. <strong>Cookies niezbędne:</strong> Logowanie, bezpieczeństwo – zawsze aktywne.
        </p>
        <p>
          10.2. <strong>Cookies analityczne:</strong> Google Analytics – wymagają zgody.
        </p>
        <p>
          10.3. <strong>Cookies marketingowe:</strong> Retargeting Facebook, Google Ads – wymagają zgody.
        </p>
        <p>
          10.4. Zgody można zmienić w <strong>Preferencjach RODO</strong> w ustawieniach profilu.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. Kontakt RODO i skargi</h2>
        <p>
          <strong>Pytania lub wnioski dotyczące prywatności?</strong>
        </p>
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 my-4">
          <p><strong>E-mail:</strong> rodo@findloove.pl</p>
          <p><strong>Telefon:</strong> +48 123 456 789</p>
          <p><strong>Opóźnienie odpowiedzi:</strong> Zwykle 14 dni (RODO: do 30 dni)</p>
        </div>

        <p>
          Jeśli nie życzysz sobie naszą odpowiedź, masz prawo wnieść skargę do:
        </p>
        <p>
          <strong>Prezesa Urzędu Ochrony Danych Osobowych<br />
          ul. Stawki 2, 00-193 Warszawa<br />
          Phone: +48 22 531 03 00<br />
          Email: uodo@uodo.gov.pl</strong>
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Zmiany polityki</h2>
        <p>
          Możemy aktualizować tę politykę. Jeśli będą istotne zmiany, poinformujemy Cię e-mailem.
        </p>

        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 mt-8">
          <p className="text-sm text-slate-700">
            <strong>Dziękujemy za zaufanie!</strong><br />
            Zespół findloove.pl<br />
            © 2026 findloove.pl sp. z o.o. Wszelkie prawa zastrzeżone.
          </p>
        </div>

      </div>
    </div>
  );
}
