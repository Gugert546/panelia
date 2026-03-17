import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/client";
import { useAuth } from "../features/auth/useAuth";
import nbTranslations from '../../locales/no.json';
import enTranslations from '../../locales/en.json';

type Language = 'no' | 'en';

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
  const [language, setLanguageState] = useState<Language>('no'); // default to Norwegian
  const [isLoading, setIsLoading] = useState(true);

  const translations = {
    no: nbTranslations,
    en: enTranslations,
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
      setLanguageState('no'); // default when not logged in
      setIsLoading(false);
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid, "preferences", "language");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setLanguageState('no'); // default for new users
        return;
      }

      const data = docSnap.data() as LanguageDocument;
      setLanguageState(data.language || 'no');
    } catch (error) {
      console.error("Failed to load language preference:", error);
      setLanguageState('no'); // fallback to default
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveLanguage = useCallback(async (newLanguage: Language) => {
    if (!user) return;

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

  // Don't render children until language is loaded to prevent flash of wrong language
  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};