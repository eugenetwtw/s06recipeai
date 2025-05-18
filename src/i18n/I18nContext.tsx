'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
// Re-import to update the types with new keys
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
  t: (key: string, params?: Record<string, any>) => string;
  availableLocales: typeof locales;
}

// Create the context with default values
const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  translations: en,
  setLocale: () => {},
  t: () => '',
  availableLocales: locales
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
      // Check for Chinese variants
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
    
    // Also update the HTML lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, pathname, searchParams]);
  
  // Set locale and update URL
  const setLocale = (newLocale: string) => {
    if (Object.keys(locales).includes(newLocale)) {
      setLocaleState(newLocale);
    }
  };
  
  // Enhanced translation function with parameter support and better fallback
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations;
    let fallbackValue: any = en; // Use English as fallback
    
    // Try to get the value from the current locale
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
        if (fallbackValue && typeof fallbackValue === 'object') {
          fallbackValue = fallbackValue[k];
        }
      } else {
        // If key not found in current locale, try fallback
        value = undefined;
        break;
      }
    }
    
    // If value not found or not a string, try fallback
    if (value === undefined || typeof value !== 'string') {
      // Try to get from fallback locale
      if (fallbackValue && typeof fallbackValue === 'string') {
        value = fallbackValue;
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key as last resort
      }
    }
    
    // Replace parameters if provided
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
        
        // Handle pluralization with {plural} tag
        if (paramKey === 'count' && typeof paramValue === 'number') {
          const plural = paramValue !== 1 ? 's' : '';
          value = value.replace(/{plural}/g, plural);
        }
      });
    }
    
    return value;
  };
  
  return (
    <I18nContext.Provider value={{ 
      locale, 
      translations, 
      setLocale, 
      t,
      availableLocales: locales
    }}>
      {children}
    </I18nContext.Provider>
  );
};

// Custom hook to use the i18n context
export const useI18n = () => useContext(I18nContext);
