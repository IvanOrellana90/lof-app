import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { strings as esStrings } from '../locales/es';
import { strings as enStrings } from '../locales/en';

type Language = 'es' | 'en';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  strings: typeof esStrings; // TypeScript infers the shape from esStrings
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Intentar recuperar de localStorage
    const saved = localStorage.getItem('lof-language');
    return (saved === 'es' || saved === 'en') ? saved : 'es';
  });

  useEffect(() => {
    localStorage.setItem('lof-language', language);
  }, [language]);

  const value = {
    language,
    setLanguage,
    strings: language === 'es' ? esStrings : enStrings
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
