import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/client";
import { isUserDataDeletionInProgress } from "../../lib/firebase/userDataDeletion";
import { useAuth } from "../features/auth/useAuth";
import nbTranslations from '../../locales/no.json';
import enTranslations from '../../locales/en.json';
import esTranslations from '../../locales/es.json';

type Language = 'no' | 'en' | 'es'; // Norsk, engelsk og spansk

type LanguageDocument = {
  language: Language;
  updatedAt?: unknown;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>('en'); // Standardverdi settes til engelsk før innlasting.
  const [isLoading, setIsLoading] = useState(true);

  const translations = {
    no: nbTranslations,
    en: enTranslations,
    es: esTranslations,
  };

  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || path;
  };

  const t = (key: string): string => {
    const translation = getNestedValue(translations[language], key);
    return typeof translation === 'string' ? translation : key;
  };

  const loadLanguage = useCallback(async () => {
    if (!user) {
      setLanguageState('no'); // standardspråk - norsk
      setIsLoading(false);
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "preferences", "language");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setLanguageState('no'); // Nye brukere får norsk som standard.
        return;
      }

      const data = docSnap.data() as LanguageDocument;
      setLanguageState(data.language || 'no');
    } catch (error) {
      console.error("Failed to load language preference:", error);
      setLanguageState('no'); // reserveverdi - også norsk
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveLanguage = useCallback(async (newLanguage: Language) => {
    if (!user || isUserDataDeletionInProgress(user.uid)) return;

    try {
      const docRef = doc(db, "users", user.uid, "preferences", "language");
      await setDoc(docRef, {
        language: newLanguage,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to save language preference:", error);
    }
  }, [user]);

  const setLanguage = useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage);
    void saveLanguage(newLanguage);
  }, [saveLanguage]);

  useEffect(() => {
    void loadLanguage();
  }, [loadLanguage]);

  // Vent med rendering til språk er lastet, så vi unngår feil språk et øyeblikk.
  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
