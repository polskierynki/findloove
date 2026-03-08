'use client';

import { createContext, useContext, useState } from 'react';

interface LegalContextType {
  showTerms: boolean;
  showPrivacy: boolean;
  openTerms: () => void;
  openPrivacy: () => void;
  closeTerms: () => void;
  closePrivacy: () => void;
}

const LegalContext = createContext<LegalContextType | undefined>(undefined);

export function LegalProvider({ children }: { children: React.ReactNode }) {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const openTerms = () => setShowTerms(true);
  const openPrivacy = () => setShowPrivacy(true);
  const closeTerms = () => setShowTerms(false);
  const closePrivacy = () => setShowPrivacy(false);

  return (
    <LegalContext.Provider
      value={{
        showTerms,
        showPrivacy,
        openTerms,
        openPrivacy,
        closeTerms,
        closePrivacy,
      }}
    >
      {children}
    </LegalContext.Provider>
  );
}

export function useLegal() {
  const context = useContext(LegalContext);
  if (!context) {
    throw new Error('useLegal must be used within LegalProvider');
  }
  return context;
}
