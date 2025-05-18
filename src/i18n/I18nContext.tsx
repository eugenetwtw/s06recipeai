'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import en from './locales/en.json';
import zhHant from './locales/zh-Hant.json';

// Define available locales
export const locales = {
  'en': 'English',
  'zh-Hant': '繁體中文'
};

// Define the type for translations
type TranslationsType = typeof en;

// Define the context type
interface I18nContextType {
  locale: string;
  translations: TranslationsType;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
}

// Create the context with default values
const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  translations: en,
  setLocale: () => {},
  t: () => '',
});

// Create a provider component
interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get initial locale from URL or browser
  const getInitialLocale = (): string => {
    // First check URL query parameter
    const urlLocale = searchParams.get('lang');
    if (urlLocale && Object.keys(locales).includes(urlLocale)) {
      return urlLocale;
    }
    
    // Then check browser language
    if (typeof window !== 'undefined') {
      const browserLocale = navigator.language;
      if (browserLocale.startsWith('zh-')) {
        return 'zh-Hant';
      }
    }
    
    // Default to English
    return 'en';
  };
  
  const [locale, setLocaleState] = useState<string>(getInitialLocale());
  
  // Get translations based on locale
  const getTranslations = (locale: string): TranslationsType => {
    switch (locale) {
      case 'zh-Hant':
        return zhHant;
      default:
        return en;
    }
  };
  
  const [translations, setTranslations] = useState<TranslationsType>(getTranslations(locale));
  
  // Update translations when locale changes
  useEffect(() => {
    setTranslations(getTranslations(locale));
  }, [locale]);
  
  // Update URL when locale changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('lang', locale);
    
    // Update URL without refreshing the page
    const newUrl = `${pathname}?${newParams.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }, [locale, pathname, searchParams]);
  
  // Set locale and update URL
  const setLocale = (newLocale: string) => {
    if (Object.keys(locales).includes(newLocale)) {
      setLocaleState(newLocale);
    }
  };
  
  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    console.warn(`Translation value is not a string: ${key}`);
    return key;
  };
  
  return (
    <I18nContext.Provider value={{ locale, translations, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

// Custom hook to use the i18n context
export const useI18n = () => useContext(I18nContext);
