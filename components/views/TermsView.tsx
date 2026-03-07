'use client';

import { ChevronLeft } from 'lucide-react';

interface TermsViewProps {
  onBack: () => void;
}

export default function TermsView({ onBack }: TermsViewProps) {
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
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Regulamin portalu findloove.pl</h1>
        <p className="text-slate-500 text-sm">Ostatnia aktualizacja: 6 marca 2026</p>
      </div>

      {/* ── Content ── */}
      <div className="prose prose-slate max-w-none bg-white p-8 rounded-lg shadow-sm">
        
        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Definicje i postanowienia ogólne</h2>
        <p>
          1.1. Niniejszy Regulamin określa zasady korzystania z portalu <strong>findloove.pl</strong> (dalej: <em>Portal</em>), 
          dostępnego pod adresem www.findloove.pl, stanowiącego serwis społeczny do poznawania nowych ludzi.
        </p>
        <p>
          1.2. <em>Portal</em> świadczy usługi pośrednictwa w poznawaniu nowych osób, wymianę wiadomości, 
          przegląd profili oraz system weryfikacji bezpieczeństwa.
        </p>
        <p>
          1.3. Kto to <em>Użytkownik</em>? Każda osoba fizyczna pełnoletnia (powyżej 18 lat), 
          która założyła konto na <em>Portalu</em> i wyraziła zgodę na <em>Regulamin</em>.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Rejestracja i konto użytkownika</h2>
        <p>
          2.1. Rejestracja wymaga podania autentycznych danych: imienia, wieku, miasta oraz zainteresowań. 
          Zakazane są profile fałszywe, boty i działalność handlowa.
        </p>
        <p>
          2.2. Każdy Użytkownik odpowiada za bezpieczeństwo swojego hasła. 
          <em>Portal</em> nie ponosi odpowiedzialności za nieautoryzowany dostęp do konta.
        </p>
        <p>
          2.3. <em>Portal</em> zastrzega sobie prawo do usunięcia konta, które:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>zawiera fałszywe lub obraźliwe dane</li>
          <li>łamie zasady bezpieczeństwa i etykę wspólnoty</li>
          <li>jest używane do spamu, oszustw lub molestowania</li>
          <li>nie potwierdza weryfikacji w ciągu 30 dni</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Warunki użytkowania</h2>
        <p>
          3.1. Użytkownik zobowiązuje się do:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Korzystania z <em>Portalu</em> zgodnie z prawem polskim i niniejszym Regulaminem</li>
          <li>Poszanowania godności i prywatności innych Użytkowników</li>
          <li>Niepublikowania treści obraźliwych, rasistowskich, homofobicznych czy zawierających przemoc</li>
          <li>Nieudostępniania osobistych danych innych użytkowników bez zgody</li>
          <li>Niedokonywania oszustw, wyłudżeń ani manipulacji emocjonalnych</li>
        </ul>
        <p>
          3.2. Zakazane są:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Linki phishingowe, wirus i złośliwe oprogramowanie</li>
          <li>Sprzedaż produktów, usług lub inwestycji na <em>Portalu</em></li>
          <li>Zbieranie danych Użytkowników (scraping) bez zgody</li>
          <li>Molestowanie, groźby, szantaż lub prośby o pieniądze</li>
          <li>Używanie bota lub automatycznych narzędzi do interakcji</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Weryfikacja profilu i bezpieczeństwo</h2>
        <p>
          4.1. Dla bezpieczeństwa wszystkich Użytkowników <em>Portal</em> oferuje weryfikację profilu poprzez:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Potwierdzenie adresu e-mail i numeru telefonu</li>
          <li>Weryfikacja twarzy (selfie) w celu potwierdzenia autentyczności profilu</li>
          <li>Sprawdzenie bazy znanych oszustów i predatorów</li>
        </ul>
        <p>
          4.2. Profile zweryfikowane oznaczone są ikoną <strong>✓</strong>. 
          Zachęcamy do kontaktu głównie ze zweryfikowanymi użytkownikami.
        </p>
        <p>
          4.3. W przypadku podejrzenia oszustwa lub molestowania, skontaktuj się z naszym <em>Centrum Bezpieczeństwa</em> 
          pod adresem bezpieczenstwo@findloove.pl.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. System płatności i Serduszka</h2>
        <p>
          5.1. <em>Portal</em> oferuje darmowe konto z podstawowymi funkcjami. 
          Niektóre funkcje (np. pełna galeria zdjęć, nieograniczone wiadomości) wymagają <strong>Serduszek (💛)</strong> — 
          wirtualnej waluty.
        </p>
        <p>
          5.2. Nowi użytkownicy otrzymują <strong>3 Serduszka</strong> za darmo po rejestracji.
        </p>
        <p>
          5.3. Dodatkowe Serduszka można kupić poprzez:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Kartę kredytową (VISA, Mastercard)</li>
          <li>Przelew bankowy (PayU)</li>
          <li>Portfele cyfrowe (PayPal, Google Pay, Apple Pay)</li>
        </ul>
        <p>
          5.4. Wszystkie transakcje są bezpieczne i szyfrowane. Dane karty nie są przechowywane na naszych serwerach.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Prawo autorskie i licencjonowanie treści</h2>
        <p>
          6.1. Wszystkie zdjęcia, teksty i materiały publikowane na <em>Portalu</em> 
          pozostają własnością ich twórcy (Użytkownika lub <em>Portalu</em>).
        </p>
        <p>
          6.2. Publikując profil, Użytkownik udziela <em>Portalowi</em> 
          licencji do wyświetlania i przechowywania danych na potrzeby działania serwisu.
        </p>
        <p>
          6.3. Zakazane jest kopiowanie, dystrybuowanie lub modyfikowanie treści bez zgody autora.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Zastrzeżenie odpowiedzialności</h2>
        <p>
          7.1. <em>Portal</em> nie jest odpowiedzialny za straty wynikające z:
        </p>
        <ul className="ml-6 my-4 space-y-2">
          <li>Treści publikowane przez Użytkowników</li>
          <li>Interakcje między Użytkownikami (czy to osobiste spotkania, czy wymiana danych)</li>
          <li>Manipulacje emocjonalne, oszustwa lub brak bezpieczeństwa osobistego Użytkownika</li>
          <li>Przerwania lub błędy w działaniu <em>Portalu</em></li>
        </ul>
        <p>
          7.2. <em>Portal</em> nie gwarantuje znalezienia miłości, przyjaźni ani konkretnych wyników 
          z korzystania z serwisu.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Polityka usuwania konta</h2>
        <p>
          8.1. Użytkownik może usunąć konto w dowolnym momencie poprzez ustawienia profilu.
        </p>
        <p>
          8.2. Po usunięciu konta, wszystkie dane osobowe zostaną skasowane w ciągu 30 dni 
          (wyjątek: dane niezbędne dla celów prawnych i bezpieczeństwa).
        </p>
        <p>
          8.3. Wiadomości wysłane przez Użytkownika pozostają w koncie odbiorcy.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Zmiany Regulaminu</h2>
        <p>
          9.1. <em>Portal</em> zastrzega sobie prawo do modyfikacji Regulaminu. 
          Istotne zmiany będą komunikowane e-mailem.
        </p>
        <p>
          9.2. Dalsze korzystanie z <em>Portalu</em> po zmianach oznacza zaakceptowanie nowych warunków.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Kontakt i reklamacje</h2>
        <p>
          W razie pytań, reklamacji lub naruszeń Regulaminu skontaktuj się z nami:
        </p>
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 my-4">
          <p><strong>E-mail:</strong> regulamin@findloove.pl</p>
          <p><strong>Telefon:</strong> +48 123 456 789</p>
          <p><strong>Adres:</strong> ul. Wiśniowa 15, 00-000 Warszawa</p>
          <p><strong>Godziny:</strong> Pon-Pią 9:00–18:00 CET</p>
        </div>

        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 mt-8">
          <p className="text-sm text-slate-700">
            <strong>Z szacunkiem,</strong><br />
            Zespół findloove.pl<br />
            © 2026 findloove.pl sp. z o.o. Wszelkie prawa zastrzeżone.
          </p>
        </div>

      </div>
    </div>
  );
}
